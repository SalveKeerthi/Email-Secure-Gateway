const mongoose = require('mongoose');

const gmailAccountSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true },
  display_name: String,
  picture: String,

  // OAuth tokens (encrypted in prod – store in KMS/secrets manager)
  access_token: { type: String, required: true },
  refresh_token: { type: String },
  token_expiry: Date,
  scope: String,

  // Gmail label IDs created for this account
  label_ids: {
    safe: String,
    quarantine: String,
    blocked: String,
  },

  // Sync state
  connection_status: {
    type: String,
    enum: ['connected', 'disconnected', 'error', 'token_expired'],
    default: 'connected',
  },
  last_sync: Date,
  last_history_id: String,
  emails_synced_today: { type: Number, default: 0 },
  sync_date: { type: Date, default: Date.now },

  // Settings
  monitoring_enabled: { type: Boolean, default: true },
  sync_interval_seconds: { type: Number, default: 30 },

  // Stats
  total_emails_processed: { type: Number, default: 0 },
  total_threats_detected: { type: Number, default: 0 },
}, {
  timestamps: true,
});

// Reset daily counters
gmailAccountSchema.methods.resetDailyCounters = function () {
  const today = new Date().toDateString();
  if (this.sync_date?.toDateString() !== today) {
    this.emails_synced_today = 0;
    this.sync_date = new Date();
  }
};

module.exports = mongoose.model('GmailAccount', gmailAccountSchema);
