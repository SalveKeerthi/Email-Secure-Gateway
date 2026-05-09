const express = require('express');
const router = express.Router();
const Email = require('../models/Email');

const PAGE_SIZE = 50;

const buildQuery = (filter = {}) => {
  const q = {};
  if (filter.search) {
    q.$or = [
      { sender: { $regex: filter.search, $options: 'i' } },
      { subject: { $regex: filter.search, $options: 'i' } },
      { sender_domain: { $regex: filter.search, $options: 'i' } },
      { threat_type: { $regex: filter.search, $options: 'i' } },
    ];
  }
  if (filter.status) q.status = filter.status;
  if (filter.threat_type) q.threat_type = filter.threat_type;
  if (filter.source) q.source = filter.source;
  if (filter.accountId) q.account_id = filter.accountId;
  return q;
};

/**
 * GET /api/emails/incoming
 * All emails (paginated, filterable)
 */
router.get('/incoming', async (req, res) => {
  try {
    const { page = 1, search, threat_type, accountId } = req.query;
    const query = buildQuery({ search, threat_type, accountId });
    const skip = (parseInt(page) - 1) * PAGE_SIZE;

    const [emails, total] = await Promise.all([
      Email.find(query).sort({ timestamp: -1 }).skip(skip).limit(PAGE_SIZE).lean(),
      Email.countDocuments(query),
    ]);

    res.json({ emails, total, page: parseInt(page), pages: Math.ceil(total / PAGE_SIZE) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/emails/quarantined
 */
router.get('/quarantined', async (req, res) => {
  try {
    const { page = 1, search, accountId } = req.query;
    const query = buildQuery({ search, status: 'QUARANTINE', accountId });
    const skip = (parseInt(page) - 1) * PAGE_SIZE;

    const [emails, total] = await Promise.all([
      Email.find(query).sort({ timestamp: -1 }).skip(skip).limit(PAGE_SIZE).lean(),
      Email.countDocuments(query),
    ]);

    res.json({ emails, total, page: parseInt(page), pages: Math.ceil(total / PAGE_SIZE) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/emails/blocked
 */
router.get('/blocked', async (req, res) => {
  try {
    const { page = 1, search, accountId } = req.query;
    const query = buildQuery({ search, status: 'BLOCK', accountId });
    const skip = (parseInt(page) - 1) * PAGE_SIZE;

    const [emails, total] = await Promise.all([
      Email.find(query).sort({ timestamp: -1 }).skip(skip).limit(PAGE_SIZE).lean(),
      Email.countDocuments(query),
    ]);

    res.json({ emails, total, page: parseInt(page), pages: Math.ceil(total / PAGE_SIZE) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/emails/search
 */
router.get('/search', async (req, res) => {
  try {
    const { q, accountId } = req.query;
    if (!q || q.length < 2) return res.json({ emails: [] });

    const query = buildQuery({ search: q, accountId });
    const emails = await Email.find(query).sort({ timestamp: -1 }).limit(100).lean();
    res.json({ emails });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/emails/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const email = await Email.findById(req.params.id).lean();
    if (!email) return res.status(404).json({ error: 'Email not found' });
    res.json(email);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/emails/manual-scan
 * Scan a manually-pasted email
 */
router.post('/manual-scan', async (req, res) => {
  try {
    const { raw_email, subject, sender, body } = req.body;

    // Basic input limits to prevent expensive parsing abuse
    if (raw_email && raw_email.length > 200_000) {
      return res.status(400).json({ error: 'raw_email too large (max 200KB)' });
    }
    if (!raw_email && (!subject || !sender || !body)) {
      return res.status(400).json({ error: 'Provide raw_email or (subject, sender, body)' });
    }

    const { classifyEmail } = require('../services/threatDetectionService');
    const { simpleParser } = require('mailparser');


    let emailData = { subject, sender, body_text: body, headers: [], attachments: [], urls: [] };

    if (raw_email) {
      const parsed = await simpleParser(raw_email);
      emailData = {
        subject: parsed.subject || subject || '',
        sender: parsed.from?.value?.[0]?.address || sender || 'unknown',
        sender_domain: parsed.from?.value?.[0]?.address?.split('@')[1] || '',
        body_text: parsed.text || body || '',
        headers: [],
        attachments: parsed.attachments?.map(a => ({
          filename: a.filename,
          mimeType: a.contentType,
          size: a.size,
        })) || [],
        urls: (parsed.text || '').match(/https?:\/\/[^\s]+/g) || [],
      };
      parsed.headers?.forEach((v, k) => emailData.headers.push({ name: k, value: String(v) }));
    }

    const classification = await classifyEmail(emailData);

    res.json({ ...emailData, ...classification });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
