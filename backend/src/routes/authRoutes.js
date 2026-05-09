const express = require('express');
const router = express.Router();
const { getAuthUrl, getTokensFromCode } = require('../config/googleAuth');
const { getUserProfile } = require('../services/gmailService');
const { ensureLabelsExist, getGmailService, getLatestHistoryId } = require('../services/gmailService');
const GmailAccount = require('../models/GmailAccount');
const Settings = require('../models/Settings');
const { scheduleAccountSync } = require('../services/schedulerService');
const logger = require('../utils/logger');

/**
 * GET /api/auth/gmail/url
 * Returns the Google OAuth consent URL
 */
router.get('/gmail/url', (req, res) => {
  try {
    const url = getAuthUrl();
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate auth URL', detail: err.message });
  }
});

/**
 * GET /api/auth/gmail/callback
 * OAuth2 callback – exchange code for tokens, save account, start scheduler
 */
router.get('/gmail/callback', async (req, res) => {
  const { code, error } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  if (error) {
    logger.warn(`OAuth error: ${error}`);
    return res.redirect(`${frontendUrl}?oauth=error&reason=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return res.redirect(`${frontendUrl}?oauth=error&reason=no_code`);
  }

  try {
    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);

    // Get user profile
    const profile = await getUserProfile(tokens);
    logger.info(`OAuth success for: ${profile.email}`);

    // Save/update account
    const account = await GmailAccount.findOneAndUpdate(
      { email: profile.email },
      {
        email: profile.email,
        display_name: profile.name,
        picture: profile.picture,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || undefined,
        token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        scope: tokens.scope,
        connection_status: 'connected',
        monitoring_enabled: true,
        sync_interval_seconds: 30,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Create Gmail labels
    try {
      const gmail = getGmailService(account);
      const labelIds = await ensureLabelsExist(gmail);
      account.label_ids = labelIds;
      await account.save();
    } catch (labelErr) {
      logger.warn(`Label setup error: ${labelErr.message}`);
    }

    // Create default settings
    await Settings.findOneAndUpdate(
      { account_id: account._id },
      { account_id: account._id },
      { upsert: true, setDefaultsOnInsert: true }
    );

    // Start background scheduler
    scheduleAccountSync(account);

    // Redirect back to frontend with account info
    const params = new URLSearchParams({
      oauth: 'success',
      email: account.email,
      accountId: account._id.toString(),
      name: account.display_name || '',
    });
    res.redirect(`${frontendUrl}?${params.toString()}`);

  } catch (err) {
    logger.error(`OAuth callback error: ${err.message}`);
    res.redirect(`${frontendUrl}?oauth=error&reason=${encodeURIComponent(err.message)}`);
  }
});

/**
 * GET /api/auth/gmail/status
 * Returns connection status for all accounts (or a specific one by email)
 */
router.get('/gmail/status', async (req, res) => {
  try {
    const { email } = req.query;
    const query = email ? { email } : {};
    const accounts = await GmailAccount.find(query).select('-access_token -refresh_token');
    res.json({ accounts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/auth/gmail/disconnect/:accountId
 */
router.delete('/gmail/disconnect/:accountId', async (req, res) => {
  try {
    const { cancelAccountSync } = require('../services/schedulerService');
    cancelAccountSync(req.params.accountId);

    await GmailAccount.findByIdAndUpdate(req.params.accountId, {
      connection_status: 'disconnected',
      monitoring_enabled: false,
      access_token: '',
    });

    res.json({ success: true, message: 'Gmail account disconnected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
