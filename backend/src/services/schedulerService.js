const schedule = require('node-schedule');
const GmailAccount = require('../models/GmailAccount');
const { runIngestionPipeline } = require('./ingestionService');
const logger = require('../utils/logger');

const jobs = new Map(); // accountId -> job

/**
 * Schedule a sync job for a single account
 */
const scheduleAccountSync = (account) => {
  // Cancel existing job
  cancelAccountSync(account._id.toString());

  if (!account.monitoring_enabled) return;

  const intervalSec = account.sync_interval_seconds ||
    parseInt(process.env.DEFAULT_SYNC_INTERVAL_SECONDS || '30');

  const rule = new schedule.RecurrenceRule();
  rule.second = Array.from(
    { length: Math.ceil(60 / intervalSec) },
    (_, i) => (i * intervalSec) % 60
  );

  const job = schedule.scheduleJob(rule, async () => {
    try {
      await runIngestionPipeline(account._id);
    } catch (err) {
      logger.error(`Scheduled sync failed for ${account.email}: ${err.message}`);
    }
  });

  jobs.set(account._id.toString(), job);
  logger.info(`Scheduled sync every ${intervalSec}s for ${account.email}`);
};

const cancelAccountSync = (accountId) => {
  const job = jobs.get(accountId);
  if (job) {
    job.cancel();
    jobs.delete(accountId);
  }
};

/**
 * Start scheduler – load all active accounts from DB
 */
const startScheduler = async () => {
  try {
    const accounts = await GmailAccount.find({ connection_status: 'connected' });
    for (const account of accounts) {
      scheduleAccountSync(account);
    }
    logger.info(`Scheduler started: ${accounts.length} accounts scheduled`);
  } catch (err) {
    logger.warn(`Scheduler start error: ${err.message}`);
  }
};

module.exports = { startScheduler, scheduleAccountSync, cancelAccountSync };
