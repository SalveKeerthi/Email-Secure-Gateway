const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  account_id: { type: mongoose.Schema.Types.ObjectId, ref: 'GmailAccount', unique: true },

  // Thresholds
  block_threshold: { type: Number, default: 80 },
  quarantine_threshold: { type: Number, default: 50 },

  // Monitoring
  monitoring_enabled: { type: Boolean, default: true },
  sync_interval: {
    type: String,
    enum: ['30s', '1m', '5m', 'manual'],
    default: '30s',
  },

  // Notifications
  notify_on_block: { type: Boolean, default: true },
  notify_on_quarantine: { type: Boolean, default: true },
  notify_on_critical: { type: Boolean, default: true },

  // Labels
  auto_label: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
