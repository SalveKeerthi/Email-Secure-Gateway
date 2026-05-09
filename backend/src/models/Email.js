const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  filename: String,
  mimeType: String,
  size: Number,
  attachmentId: String,
}, { _id: false });

const headerSchema = new mongoose.Schema({
  name: String,
  value: String,
}, { _id: false });

const emailSchema = new mongoose.Schema({
  // Gmail identifiers
  email_id: { type: String, required: true, unique: true, index: true },
  gmail_thread_id: { type: String, index: true },
  gmail_label_ids: [String],

  // Participants
  sender: { type: String, required: true, index: true },
  sender_name: String,
  sender_domain: { type: String, index: true },
  recipient: String,
  reply_to: String,

  // Content
  subject: { type: String, default: '(no subject)' },
  body_text: String,
  body_html: String,
  snippet: String,

  // Metadata
  attachments: [attachmentSchema],
  urls: [String],
  headers: [headerSchema],
  timestamp: { type: Date, index: true },
  source: { type: String, enum: ['gmail', 'manual', 'smtp', 'outlook'], default: 'gmail' },

  // AI Analysis
  risk_score: { type: Number, min: 0, max: 100, index: true },
  threat_type: {
    type: String,
    enum: ['Clean', 'Phishing', 'Malware', 'Spoofing', 'BEC', 'Spam', 'Ransomware', 'Credential Harvest', 'Unknown'],
    default: 'Unknown',
    index: true,
  },
  confidence_score: { type: Number, min: 0, max: 100 },
  threat_indicators: [String],

  // Authentication checks
  spf_result: { type: String, enum: ['pass', 'fail', 'softfail', 'neutral', 'none', 'unknown'], default: 'unknown' },
  dkim_result: { type: String, enum: ['pass', 'fail', 'neutral', 'none', 'unknown'], default: 'unknown' },
  dmarc_result: { type: String, enum: ['pass', 'fail', 'bestguesspass', 'none', 'unknown'], default: 'unknown' },

  // Decision
  status: {
    type: String,
    enum: ['ALLOW', 'QUARANTINE', 'BLOCK', 'PENDING'],
    default: 'PENDING',
    index: true,
  },
  gmail_label: {
    type: String,
    enum: ['AI-SAFE', 'AI-QUARANTINE', 'AI-BLOCKED', 'PENDING'],
    default: 'PENDING',
  },
  label_applied: { type: Boolean, default: false },

  // Processing
  processed_at: Date,
  scan_duration_ms: Number,

  // User account link
  account_id: { type: mongoose.Schema.Types.ObjectId, ref: 'GmailAccount', index: true },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

emailSchema.index({ sender: 'text', subject: 'text', threat_type: 'text' });
emailSchema.index({ timestamp: -1, status: 1 });
emailSchema.index({ account_id: 1, timestamp: -1 });

emailSchema.virtual('age').get(function () {
  return Date.now() - this.timestamp;
});

module.exports = mongoose.model('Email', emailSchema);
