const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const GmailAccount = require('../models/GmailAccount');
const { scheduleAccountSync, cancelAccountSync } = require('../services/schedulerService');

/**
 * GET /api/settings/:accountId
 */
router.get('/:accountId', async (req, res) => {
  try {
    let settings = await Settings.findOne({ account_id: req.params.accountId });
    if (!settings) {
      settings = await Settings.create({ account_id: req.params.accountId });
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/settings/:accountId
 */
router.patch('/:accountId', async (req, res) => {
  try {
    const allowed = [
      'block_threshold', 'quarantine_threshold', 'monitoring_enabled',
      'sync_interval', 'notify_on_block', 'notify_on_quarantine',
      'notify_on_critical', 'auto_label',
    ];
    const update = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    });

    const settings = await Settings.findOneAndUpdate(
      { account_id: req.params.accountId },
      update,
      { new: true, upsert: true }
    );

    // Sync monitoring toggle & interval to GmailAccount
    if (update.monitoring_enabled !== undefined || update.sync_interval !== undefined) {
      const intervalMap = { '30s': 30, '1m': 60, '5m': 300, manual: null };
      const intervalSec = intervalMap[update.sync_interval] || 30;

      const account = await GmailAccount.findByIdAndUpdate(
        req.params.accountId,
        {
          ...(update.monitoring_enabled !== undefined && { monitoring_enabled: update.monitoring_enabled }),
          ...(intervalSec && { sync_interval_seconds: intervalSec }),
        },
        { new: true }
      );

      if (account) {
        if (update.monitoring_enabled === false) cancelAccountSync(account._id.toString());
        else if (update.monitoring_enabled === true) scheduleAccountSync(account);
      }
    }

    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
