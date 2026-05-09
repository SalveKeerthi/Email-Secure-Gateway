const { google } = require('googleapis');
const { createAuthedClient } = require('../config/googleAuth');
const { simpleParser } = require('mailparser');
const logger = require('../utils/logger');

const LABEL_NAMES = {
  safe: 'AI-SAFE',
  quarantine: 'AI-QUARANTINE',
  blocked: 'AI-BLOCKED',
};

/**
 * Get Gmail service instance for an account
 */
const getGmailService = (account) => {
  const auth = createAuthedClient({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
    expiry_date: account.token_expiry?.getTime(),
  });
  return google.gmail({ version: 'v1', auth });
};

/**
 * Get authenticated user profile
 */
const getUserProfile = async (tokens) => {
  const auth = createAuthedClient(tokens);
  const oauth2 = google.oauth2({ version: 'v2', auth });
  const { data } = await oauth2.userinfo.get();
  return data;
};

/**
 * Ensure AI labels exist in Gmail, create if missing
 */
const ensureLabelsExist = async (gmail) => {
  const { data } = await gmail.users.labels.list({ userId: 'me' });
  const existing = data.labels || [];
  const labelMap = {};

  for (const [key, name] of Object.entries(LABEL_NAMES)) {
    const found = existing.find((l) => l.name === name);
    if (found) {
      labelMap[key] = found.id;
    } else {
      try {
        const { data: created } = await gmail.users.labels.create({
          userId: 'me',
          requestBody: {
            name,
            messageListVisibility: 'show',
            labelListVisibility: 'labelShow',
          },
        });
        labelMap[key] = created.id;
        logger.info(`Created Gmail label: ${name} (${created.id})`);
      } catch (err) {
        logger.warn(`Could not create label ${name}: ${err.message}`);
      }
    }
  }

  return labelMap;
};

/**
 * Fetch unread/recent emails since last history ID or last N messages
 */
const fetchNewEmails = async (gmail, lastHistoryId, maxResults = 50) => {
  const messages = [];

  try {
    if (lastHistoryId) {
      // Incremental fetch using history API
      const { data } = await gmail.users.history.list({
        userId: 'me',
        startHistoryId: lastHistoryId,
        historyTypes: ['messageAdded'],
        maxResults: maxResults,
      });

      const historyList = data.history || [];
      const messageIds = new Set();

      for (const history of historyList) {
        for (const msg of history.messagesAdded || []) {
          messageIds.add(msg.message.id);
        }
      }

      for (const id of messageIds) {
        try {
          const msg = await getMessageDetails(gmail, id);
          if (msg) messages.push(msg);
        } catch (e) {
          logger.warn(`Failed to fetch message ${id}: ${e.message}`);
        }
      }
    } else {
      // Initial fetch: get last N messages from INBOX
      const { data } = await gmail.users.messages.list({
        userId: 'me',
        labelIds: ['INBOX'],
        maxResults: maxResults,
      });

      for (const msg of data.messages || []) {
        try {
          const detail = await getMessageDetails(gmail, msg.id);
          if (detail) messages.push(detail);
        } catch (e) {
          logger.warn(`Failed to fetch message ${msg.id}: ${e.message}`);
        }
      }
    }
  } catch (err) {
    // History ID expired – do full fetch
    if (err.code === 404 || err.message?.includes('historyId')) {
      logger.warn('History ID expired, performing full fetch');
      return fetchNewEmails(gmail, null, maxResults);
    }
    throw err;
  }

  return messages;
};

/**
 * Get full message details and parse with mailparser
 */
const getMessageDetails = async (gmail, messageId) => {
  const { data } = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'raw',
  });

  const rawEmail = Buffer.from(data.raw, 'base64url').toString('utf-8');
  const parsed = await simpleParser(rawEmail);

  // Extract URLs from body
  const urlRegex = /https?:\/\/[^\s"'<>]+/g;
  const bodyText = parsed.text || '';
  const bodyHtml = parsed.html || '';
  const urls = [...new Set([
    ...(bodyText.match(urlRegex) || []),
    ...(bodyHtml.match(urlRegex) || []),
  ])].slice(0, 50); // cap at 50

  // Parse headers into array
  const headers = [];
  parsed.headers?.forEach((value, name) => {
    headers.push({ name, value: Array.isArray(value) ? value.join(', ') : String(value) });
  });

  const fromAddress = parsed.from?.value?.[0];

  return {
    gmail_id: messageId,
    gmail_thread_id: data.threadId,
    gmail_label_ids: data.labelIds || [],
    history_id: data.historyId,
    sender: fromAddress?.address || 'unknown@unknown.com',
    sender_name: fromAddress?.name || '',
    sender_domain: fromAddress?.address?.split('@')[1] || 'unknown',
    recipient: parsed.to?.value?.[0]?.address || '',
    reply_to: parsed.replyTo?.value?.[0]?.address || '',
    subject: parsed.subject || '(no subject)',
    body_text: bodyText.slice(0, 10000),
    body_html: bodyHtml.slice(0, 50000),
    snippet: bodyText.slice(0, 200),
    attachments: (parsed.attachments || []).map((a) => ({
      filename: a.filename || 'attachment',
      mimeType: a.contentType || 'application/octet-stream',
      size: a.size || 0,
      attachmentId: a.checksum || '',
    })),
    urls,
    headers,
    timestamp: parsed.date || new Date(),
  };
};

/**
 * Get latest history ID for the mailbox
 */
const getLatestHistoryId = async (gmail) => {
  const { data } = await gmail.users.getProfile({ userId: 'me' });
  return data.historyId;
};

/**
 * Apply a label to a Gmail message
 */
const applyLabel = async (gmail, messageId, labelId, removeLabelIds = []) => {
  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: {
      addLabelIds: [labelId],
      removeLabelIds,
    },
  });
};

module.exports = {
  getGmailService,
  getUserProfile,
  ensureLabelsExist,
  fetchNewEmails,
  getLatestHistoryId,
  applyLabel,
  LABEL_NAMES,
};
