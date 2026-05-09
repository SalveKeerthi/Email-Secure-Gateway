const Email = require('../models/Email');
const GmailAccount = require('../models/GmailAccount');
const { getGmailService, fetchNewEmails, getLatestHistoryId, applyLabel, ensureLabelsExist } = require('./gmailService');
const { classifyEmail } = require('./threatDetectionService');
const {
  emitSyncStarted, emitSyncCompleted, emitSyncProgress,
  emitNewThreatDetected, emitEmailQuarantined, emitEmailBlocked, emitEmailAllowed,
} = require('../config/socket');
const logger = require('../utils/logger');

const SYNC_STAGES = [
  'Connecting to Gmail',
  'Fetching unread emails',
  'Parsing email headers',
  'Extracting features',
  'Running AI classifier',
  'Calculating risk score',
  'Updating dashboard',
];

/**
 * Run a full ingestion + classification cycle for one Gmail account
 */
const runIngestionPipeline = async (accountId) => {
  const account = await GmailAccount.findById(accountId);
  if (!account) throw new Error(`Account ${accountId} not found`);
  if (!account.monitoring_enabled) {
    logger.info(`Monitoring disabled for ${account.email} – skipping`);
    return { skipped: true };
  }

  const syncStart = Date.now();
  logger.info(`Starting ingestion for ${account.email}`);

  emitSyncStarted({ account: account.email, stages: SYNC_STAGES, timestamp: new Date() });
  emitSyncProgress({ stage: 0, stageName: SYNC_STAGES[0], percent: 0 });

  let gmail;
  try {
    gmail = getGmailService(account);
    // Verify connection
    await gmail.users.getProfile({ userId: 'me' });
  } catch (err) {
    await GmailAccount.findByIdAndUpdate(accountId, { connection_status: 'error' });
    throw new Error(`Gmail connection failed: ${err.message}`);
  }

  // Stage 1 – Ensure labels exist
  emitSyncProgress({ stage: 1, stageName: SYNC_STAGES[1], percent: 14 });
  account.resetDailyCounters();
  const labelIds = await ensureLabelsExist(gmail);
  if (!account.label_ids?.safe) {
    account.label_ids = labelIds;
    await account.save();
  }

  // Stage 2 – Fetch emails
  emitSyncProgress({ stage: 2, stageName: SYNC_STAGES[2], percent: 28 });
  const maxResults = parseInt(process.env.MAX_EMAILS_PER_SYNC || '50');
  const rawEmails = await fetchNewEmails(gmail, account.last_history_id, maxResults);
  logger.info(`Fetched ${rawEmails.length} new emails for ${account.email}`);

  if (rawEmails.length === 0) {
    const historyId = await getLatestHistoryId(gmail);
    account.last_history_id = historyId;
    account.last_sync = new Date();
    await account.save();

    emitSyncCompleted({
      account: account.email,
      processed: 0,
      threats: 0,
      duration: Date.now() - syncStart,
    });
    return { processed: 0, threats: 0 };
  }

  // Stage 3–6 – Process each email
  let processed = 0;
  let threats = 0;
  let latestHistoryId = account.last_history_id;

  for (const rawEmail of rawEmails) {
    try {
      emitSyncProgress({ stage: 3, stageName: SYNC_STAGES[3], percent: 42 });

      // Stage 4 – Extract features & classify
      emitSyncProgress({ stage: 4, stageName: SYNC_STAGES[4], percent: 57 });
      const classification = await classifyEmail(rawEmail);


      emitSyncProgress({ stage: 5, stageName: SYNC_STAGES[5], percent: 71 });

      // Save to DB atomically to avoid duplicate processing during overlapping syncs
      const emailDoc = {
        email_id: rawEmail.gmail_id,
        gmail_thread_id: rawEmail.gmail_thread_id,
        gmail_label_ids: rawEmail.gmail_label_ids,
        sender: rawEmail.sender,
        sender_name: rawEmail.sender_name,
        sender_domain: rawEmail.sender_domain,
        recipient: rawEmail.recipient,
        reply_to: rawEmail.reply_to,
        subject: rawEmail.subject,
        body_text: rawEmail.body_text,
        body_html: rawEmail.body_html,
        snippet: rawEmail.snippet,
        attachments: rawEmail.attachments,
        urls: rawEmail.urls,
        headers: rawEmail.headers,
        timestamp: rawEmail.timestamp,
        source: 'gmail',
        account_id: accountId,
        ...classification,
        processed_at: new Date(),
      };

      const upsertResult = await Email.updateOne(
        { email_id: rawEmail.gmail_id },
        { $setOnInsert: emailDoc },
        { upsert: true }
      );

      // Already existed => skip label application + socket emissions
      if (upsertResult.upsertedCount === 0) continue;

      const email = await Email.findOne({ email_id: rawEmail.gmail_id });
      if (!email) continue;

      // Apply Gmail label
      if (account.label_ids) {
        const labelKey = classification.status === 'ALLOW' ? 'safe'
          : classification.status === 'QUARANTINE' ? 'quarantine' : 'blocked';
        const labelId = account.label_ids[labelKey];

        if (labelId) {
          try {
            const otherLabels = Object.values(account.label_ids).filter(id => id && id !== labelId);
            await applyLabel(gmail, rawEmail.gmail_id, labelId, otherLabels);
            await Email.updateOne(
              { email_id: rawEmail.gmail_id },
              { $set: { label_applied: true } }
            );
          } catch (labelErr) {
            logger.warn(`Label apply failed for ${rawEmail.gmail_id}: ${labelErr.message}`);
          }
        }
      }

      // Track history ID
      if (rawEmail.history_id) latestHistoryId = rawEmail.history_id;

      processed++;
      if (classification.status !== 'ALLOW') threats++;

      // Stage 6 – Emit real-time events
      emitSyncProgress({ stage: 6, stageName: SYNC_STAGES[6], percent: 85 });
      const emailPayload = email.toJSON();

      if (classification.status === 'BLOCK') emitEmailBlocked(emailPayload);
      else if (classification.status === 'QUARANTINE') emitEmailQuarantined(emailPayload);
      else emitEmailAllowed(emailPayload);

      if (classification.status !== 'ALLOW') emitNewThreatDetected(emailPayload);

    } catch (err) {
      logger.error(`Error processing email ${rawEmail.gmail_id}: ${err.message}`);
    }
  }

  // Update account
  account.last_history_id = latestHistoryId || await getLatestHistoryId(gmail);
  account.last_sync = new Date();
  account.emails_synced_today += processed;
  account.total_emails_processed += processed;
  account.total_threats_detected += threats;
  account.connection_status = 'connected';
  await account.save();

  emitSyncProgress({ stage: 7, stageName: 'Done', percent: 100 });
  emitSyncCompleted({
    account: account.email,
    processed,
    threats,
    duration: Date.now() - syncStart,
    timestamp: new Date(),
  });

  logger.info(`Ingestion complete for ${account.email}: ${processed} processed, ${threats} threats`);
  return { processed, threats, duration: Date.now() - syncStart };
};

module.exports = { runIngestionPipeline, SYNC_STAGES };
