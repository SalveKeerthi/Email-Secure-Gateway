/**
 * SecureGate AI Threat Detection Engine
 *
 * Pipeline:
 *  1. Header authentication analysis (SPF / DKIM / DMARC)
 *  2. Phishing keyword detection
 *  3. Suspicious URL analysis
 *  4. Domain similarity (typosquatting)
 *  5. Attachment malware heuristics
 *  6. BEC / CEO impersonation detection
 *  7. Spam scoring
 *  8. Risk aggregation + policy decision
 */

const { parse: parseTLD } = require('tldts');
const logger = require('../utils/logger');

// ─── Threat keyword lists ────────────────────────────────────────────────────

const PHISHING_KEYWORDS = [
  'verify your account', 'confirm your identity', 'unusual sign-in',
  'your account has been suspended', 'click here to unlock', 'update your payment',
  'security alert', 'unauthorized access', 'immediately verify', 'limited time offer',
  'your password expired', 'act now', 'claim your prize', 'you have won',
  'wire transfer', 'bank account details', 'gift card', 'itunes card',
  'invoice attached', 'kindly confirm', 'dear valued customer',
  'account will be closed', 'validate your information', 'reset your password',
];

const BEC_KEYWORDS = [
  'confidential request', 'do not discuss', 'personal request', 'urgent wire',
  'process payment', 'ceo request', 'executive request', 'bypass normal',
  'transfer funds', 'change bank details', 'new payment instructions',
];

const MALWARE_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.vbs', '.js', '.jar', '.scr', '.pif',
  '.com', '.msi', '.ps1', '.sh', '.dmg', '.app', '.iso',
];

const SUSPICIOUS_URL_PATTERNS = [
  /bit\.ly\//i, /tinyurl\.com\//i, /goo\.gl\//i, /t\.co\//i,
  /ow\.ly\//i, /is\.gd\//i, /buff\.ly\//i,
  /login.*\.(info|biz|net|xyz|club|online|site)/i,
  /secure.*\.(info|biz|xyz|club|online|site)/i,
  /verify.*\.(info|biz|xyz|club)/i,
  /account.*\.(info|biz|xyz)/i,
  /paypa[l1]|amaz[o0]n|g[o0][o0]gle|micr[o0]s[o0]ft|app[l1]e|netfl[i1]x/i,
];

const LEGITIMATE_DOMAINS = [
  'google.com', 'gmail.com', 'microsoft.com', 'amazon.com', 'apple.com',
  'facebook.com', 'twitter.com', 'linkedin.com', 'github.com', 'dropbox.com',
  'salesforce.com', 'zoom.us', 'slack.com', 'notion.so', 'atlassian.com',
];

// ─── Helper functions ────────────────────────────────────────────────────────

const levenshtein = (a, b) => {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
};

const extractDomain = (email) => {
  const match = email.match(/@([^>]+)/);
  return match ? match[1].toLowerCase().trim() : '';
};

const getHeaderValue = (headers, name) => {
  const h = headers.find((h) => h.name?.toLowerCase() === name.toLowerCase());
  return h?.value || '';
};

// ─── Analysis modules ────────────────────────────────────────────────────────

const analyzeHeaders = (headers) => {
  const results = { spf: 'unknown', dkim: 'unknown', dmarc: 'unknown', score: 0 };

  const authResults = getHeaderValue(headers, 'authentication-results') +
    getHeaderValue(headers, 'arc-authentication-results');

  if (authResults) {
    results.spf = /spf=pass/i.test(authResults) ? 'pass'
      : /spf=fail/i.test(authResults) ? 'fail'
      : /spf=softfail/i.test(authResults) ? 'softfail' : 'none';

    results.dkim = /dkim=pass/i.test(authResults) ? 'pass'
      : /dkim=fail/i.test(authResults) ? 'fail' : 'none';

    results.dmarc = /dmarc=pass/i.test(authResults) ? 'pass'
      : /dmarc=fail/i.test(authResults) ? 'fail' : 'none';
  }

  // Score authentication failures
  if (results.spf === 'fail') results.score += 25;
  else if (results.spf === 'softfail') results.score += 10;
  if (results.dkim === 'fail') results.score += 25;
  if (results.dmarc === 'fail') results.score += 20;

  // Check for header spoofing indicators
  const fromHeader = getHeaderValue(headers, 'from');
  const returnPath = getHeaderValue(headers, 'return-path');
  const replyTo = getHeaderValue(headers, 'reply-to');

  if (fromHeader && returnPath) {
    const fromDomain = extractDomain(fromHeader);
    const returnDomain = extractDomain(returnPath);
    if (fromDomain && returnDomain && fromDomain !== returnDomain) {
      results.score += 15;
      results.mismatch = true;
    }
  }

  return results;
};

const analyzeKeywords = (subject, bodyText) => {
  const text = `${subject} ${bodyText}`.toLowerCase();
  const found = [];
  let score = 0;

  for (const kw of PHISHING_KEYWORDS) {
    if (text.includes(kw)) {
      found.push(kw);
      score += 8;
    }
  }

  for (const kw of BEC_KEYWORDS) {
    if (text.includes(kw)) {
      found.push(`BEC: ${kw}`);
      score += 12;
    }
  }

  return { score: Math.min(score, 60), keywords: found };
};

const analyzeUrls = (urls) => {
  if (!urls || urls.length === 0) return { score: 0, suspicious: [] };

  const suspicious = [];
  let score = 0;

  for (const url of urls) {
    for (const pattern of SUSPICIOUS_URL_PATTERNS) {
      if (pattern.test(url)) {
        suspicious.push(url);
        score += 10;
        break;
      }
    }
  }

  // Too many URLs is suspicious
  if (urls.length > 10) score += 10;

  return { score: Math.min(score, 40), suspicious };
};

const analyzeDomainSimilarity = (senderDomain) => {
  if (!senderDomain) return { score: 0, similar: null };

  const parsed = parseTLD(senderDomain);
  const domainPart = parsed.domain || senderDomain;

  for (const legit of LEGITIMATE_DOMAINS) {
    const legitParsed = parseTLD(legit);
    const legitDomain = legitParsed.domain || legit;

    if (domainPart === legitDomain) return { score: 0, similar: null };

    const dist = levenshtein(domainPart, legitDomain);
    if (dist > 0 && dist <= 2) {
      return {
        score: 35,
        similar: legit,
        domain: senderDomain,
      };
    }
  }

  return { score: 0, similar: null };
};

const analyzeAttachments = (attachments) => {
  if (!attachments || attachments.length === 0) return { score: 0, suspicious: [] };

  const suspicious = [];
  let score = 0;

  for (const att of attachments) {
    const filename = (att.filename || '').toLowerCase();
    for (const ext of MALWARE_EXTENSIONS) {
      if (filename.endsWith(ext)) {
        suspicious.push(filename);
        score += 40;
        break;
      }
    }
    // Double extension (e.g., invoice.pdf.exe)
    if (/\.[a-z]{2,4}\.(exe|bat|cmd|vbs|js|scr)$/i.test(filename)) {
      suspicious.push(`double-extension: ${filename}`);
      score += 50;
    }
  }

  return { score: Math.min(score, 70), suspicious };
};

// ─── Main classification function ────────────────────────────────────────────

async function classifyEmailWithGeminiIfUncertain(heuristicClassification, emailData) {
  const min = parseInt(process.env.AI_UNCERTAIN_MIN || '40');
  const max = parseInt(process.env.AI_UNCERTAIN_MAX || '70');
  const provider = (process.env.AI_PROVIDER || '').toLowerCase();

  if (provider !== 'gemini') return heuristicClassification;
  if (!heuristicClassification || typeof heuristicClassification.risk_score !== 'number') return heuristicClassification;

  const risk = heuristicClassification.risk_score;
  if (risk < min || risk > max) return heuristicClassification;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return heuristicClassification;

  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);

  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-pro';
  const model = genAI.getGenerativeModel({ model: modelName });

  logger.info('Gemini classify called (uncertain band)', { risk_score: heuristicClassification.risk_score, min, max, provider });

  const maxInputChars = parseInt(process.env.AI_MAX_INPUT_CHARS || '12000');

  const subject = (emailData.subject || '').slice(0, maxInputChars);
  const body = (emailData.body_text || '').slice(0, maxInputChars);
  const sender = (emailData.sender || '').slice(0, 500);
  const urls = (emailData.urls || []).slice(0, 20);
  const attachments = (emailData.attachments || []).slice(0, 10);

  const prompt = {
    contents: [{
      role: 'user',
      parts: [{
        text:
`You are a cybersecurity email triage engine.

Classify the email as one of: Clean, Phishing, Malware, Spoofing, BEC, Spam.
Then decide status as one of: ALLOW, QUARANTINE, BLOCK.

Use the provided heuristics as context, but your decision should be based on the content.
Return ONLY valid JSON with this schema:
{
  "risk_score": number (0-100),
  "threat_type": one of ["Clean","Phishing","Malware","Spoofing","BEC","Spam"],
  "status": one of ["ALLOW","QUARANTINE","BLOCK"],
  "gmail_label": one of ["AI-SAFE","AI-QUARANTINE","AI-BLOCKED"],
  "confidence_score": number (0-100),
  "threat_indicators": string[]
}

Heuristic context:
${JSON.stringify({
  ...heuristicClassification,
  // remove heavy lists if any
  threat_indicators: (heuristicClassification.threat_indicators || []).slice(0, 5),
}, null, 2)}

Email:
sender: ${sender}
subject: ${subject}
body_excerpt: ${body}
urls: ${JSON.stringify(urls)}
attachments: ${JSON.stringify(attachments.map(a => ({ filename: a.filename, mimeType: a.mimeType, size: a.size })))}
`,
      }]
    }],
    generationConfig: {
      maxOutputTokens: parseInt(process.env.AI_MAX_OUTPUT_TOKENS || '512'),
      temperature: 0.2,
    }
  };

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) return heuristicClassification;

    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    // Basic shape validation
    if (typeof parsed.risk_score !== 'number' || !parsed.status || !parsed.threat_type) return heuristicClassification;

    return {
      risk_score: Math.max(0, Math.min(100, Math.round(parsed.risk_score))),
      threat_type: parsed.threat_type,
      status: parsed.status,
      gmail_label: parsed.gmail_label,
      confidence_score: Math.max(0, Math.min(100, Math.round(parsed.confidence_score ?? 60))),
      threat_indicators: Array.isArray(parsed.threat_indicators) ? parsed.threat_indicators.slice(0, 10) : [],
      // keep heuristic SPF/DKIM/DMARC if present
      spf_result: heuristicClassification.spf_result,
      dkim_result: heuristicClassification.dkim_result,
      dmarc_result: heuristicClassification.dmarc_result,
      scan_duration_ms: heuristicClassification.scan_duration_ms,
    };
  } catch (err) {
    logger.warn(`Gemini classify failed: ${err.message}`);
    return heuristicClassification;
  }
}

const classifyEmail = async (emailData) => {
  const startTime = Date.now();
  const indicators = [];


  // Run all analysis modules
  const headerAnalysis = analyzeHeaders(emailData.headers || []);
  const keywordAnalysis = analyzeKeywords(emailData.subject || '', emailData.body_text || '');
  const urlAnalysis = analyzeUrls(emailData.urls || []);
  const domainAnalysis = analyzeDomainSimilarity(emailData.sender_domain || '');
  const attachmentAnalysis = analyzeAttachments(emailData.attachments || []);

  // Aggregate raw score
  let rawScore = 0;
  rawScore += headerAnalysis.score;
  rawScore += keywordAnalysis.score;
  rawScore += urlAnalysis.score;
  rawScore += domainAnalysis.score;
  rawScore += attachmentAnalysis.score;

  // Collect indicators
  if (headerAnalysis.spf === 'fail') indicators.push('SPF authentication failed');
  if (headerAnalysis.dkim === 'fail') indicators.push('DKIM authentication failed');
  if (headerAnalysis.dmarc === 'fail') indicators.push('DMARC authentication failed');
  if (headerAnalysis.mismatch) indicators.push('From/Return-Path domain mismatch');
  if (keywordAnalysis.keywords.length > 0) indicators.push(...keywordAnalysis.keywords.slice(0, 5));
  if (urlAnalysis.suspicious.length > 0) indicators.push(`Suspicious URLs: ${urlAnalysis.suspicious.length}`);
  if (domainAnalysis.similar) indicators.push(`Domain resembles: ${domainAnalysis.similar}`);
  if (attachmentAnalysis.suspicious.length > 0) indicators.push(...attachmentAnalysis.suspicious);


  // Normalise to 0-100
  const risk_score = Math.min(100, Math.round(rawScore));

  // Determine threat type
  let threat_type = 'Clean';
  if (attachmentAnalysis.suspicious.length > 0) threat_type = 'Malware';
  else if (domainAnalysis.similar) threat_type = 'Spoofing';
  else if (keywordAnalysis.keywords.some((k) => k.startsWith('BEC'))) threat_type = 'BEC';
  else if (risk_score > 70) threat_type = 'Phishing';
  else if (risk_score > 50) threat_type = 'Spam';

  // Policy decision
  const blockThreshold = parseInt(process.env.BLOCK_THRESHOLD || '80');
  const quarantineThreshold = parseInt(process.env.QUARANTINE_THRESHOLD || '50');

  let status = 'ALLOW';
  if (risk_score >= blockThreshold) status = 'BLOCK';
  else if (risk_score >= quarantineThreshold) status = 'QUARANTINE';

  const gmail_label = status === 'ALLOW' ? 'AI-SAFE'
    : status === 'QUARANTINE' ? 'AI-QUARANTINE' : 'AI-BLOCKED';

  const confidence_score = Math.min(99, 60 + Math.floor(risk_score / 5));

  const heuristicResult = {
    risk_score,
    threat_type,
    confidence_score,
    status,
    gmail_label,
    threat_indicators: indicators,
    spf_result: headerAnalysis.spf,
    dkim_result: headerAnalysis.dkim,
    dmarc_result: headerAnalysis.dmarc,
    scan_duration_ms: Date.now() - startTime,
  };

  // Call Gemini only for uncertain band
  return await classifyEmailWithGeminiIfUncertain(heuristicResult, emailData);
};

module.exports = { classifyEmail };
