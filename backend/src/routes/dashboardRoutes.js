const express = require('express');
const router = express.Router();
const Email = require('../models/Email');
const GmailAccount = require('../models/GmailAccount');

/**
 * GET /api/dashboard/stats
 * Aggregate stats for the dashboard stat cards
 */
router.get('/stats', async (req, res) => {
  try {
    const { accountId } = req.query;
    const matchStage = accountId ? { account_id: new (require('mongoose').Types.ObjectId)(accountId) } : {};

    const [totals, threatBreakdown, accounts] = await Promise.all([
      Email.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      Email.aggregate([
        { $match: { ...matchStage, status: { $ne: 'ALLOW' } } },
        { $group: { _id: '$threat_type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      GmailAccount.find().select('-access_token -refresh_token').lean(),
    ]);

    const statusMap = { ALLOW: 0, QUARANTINE: 0, BLOCK: 0, PENDING: 0 };
    totals.forEach((t) => { statusMap[t._id] = t.count; });

    const total = Object.values(statusMap).reduce((a, b) => a + b, 0);

    // Today's stats
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayTotals = await Email.aggregate([
      { $match: { ...matchStage, timestamp: { $gte: todayStart } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const todayMap = { ALLOW: 0, QUARANTINE: 0, BLOCK: 0 };
    todayTotals.forEach((t) => { if (todayMap[t._id] !== undefined) todayMap[t._id] = t.count; });

    res.json({
      total,
      allowed: statusMap.ALLOW,
      quarantined: statusMap.QUARANTINE,
      blocked: statusMap.BLOCK,
      threats: statusMap.QUARANTINE + statusMap.BLOCK,
      today: {
        total: Object.values(todayMap).reduce((a, b) => a + b, 0),
        threats: todayMap.QUARANTINE + todayMap.BLOCK,
        quarantined: todayMap.QUARANTINE,
        blocked: todayMap.BLOCK,
      },
      threatBreakdown,
      accounts,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/dashboard/recent-emails
 * Last N emails for live stream panel
 */
router.get('/recent-emails', async (req, res) => {
  try {
    const { accountId, limit = 20 } = req.query;
    const query = accountId ? { account_id: new (require('mongoose').Types.ObjectId)(accountId) } : {};
    const emails = await Email.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .lean();
    res.json({ emails });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/dashboard/timeline
 * Hourly email volume for the last 24 hours
 */
router.get('/timeline', async (req, res) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const data = await Email.aggregate([
      { $match: { timestamp: { $gte: since } } },
      {
        $group: {
          _id: {
            hour: { $hour: '$timestamp' },
            status: '$status',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.hour': 1 } },
    ]);
    res.json({ timeline: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
