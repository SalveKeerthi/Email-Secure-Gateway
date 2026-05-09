const express = require('express');
const router = express.Router();
const GmailAccount = require('../models/GmailAccount');
const { runIngestionPipeline } = require('../services/ingestionService');
const { scheduleAccountSync, cancelAccountSync } = require('../services/schedulerService');
const logger = require('../utils/logger');

/**
 * GET /api/gmail/accounts
 */
router.get('/accounts', async (req, res) => {
  try {
    const accounts = await GmailAccount.find()
      .select('-access_token -refresh_token')
      .lean();
    res.json({ accounts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/gmail/accounts/:id/status
 */
router.get('/accounts/:id/status', async (req, res) => {
  try {
    const account = await GmailAccount.findById(req.params.id)
      .select('-access_token -refresh_token').lean();
    if (!account) return res.status(404).json({ error: 'Account not found' });
    res.json(account);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/gmail/accounts/:id/sync
 * Trigger a manual sync
 */
router.post('/accounts/:id/sync', async (req, res) => {
  try {
    const result = await runIngestionPipeline(req.params.id);
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error(`Manual sync error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/gmail/accounts/:id/monitoring
 * Enable/disable monitoring
 */
router.patch('/accounts/:id/monitoring', async (req, res) => {
  try {
    const { enabled, sync_interval_seconds } = req.body;
    const account = await GmailAccount.findByIdAndUpdate(
      req.params.id,
      { monitoring_enabled: enabled, ...(sync_interval_seconds && { sync_interval_seconds }) },
      { new: true }
    );
    if (!account) return res.status(404).json({ error: 'Account not found' });

    if (enabled) scheduleAccountSync(account);
    else cancelAccountSync(req.params.id);

    res.json({ success: true, account });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
