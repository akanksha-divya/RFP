require('dotenv').config();
const Imap = require('imap-simple');
const { simpleParser } = require('mailparser');

async function connectImap() {
  const config = {
    imap: {
      user: process.env.IMAP_USER,
      password: process.env.IMAP_PASS,
      host: process.env.IMAP_HOST,
      port: Number(process.env.IMAP_PORT || 993),
      tls: process.env.IMAP_TLS !== 'false',
      tlsOptions: {
        rejectUnauthorized: false, // Allow self-signed certificates (dev only; use system CA in production)
      },
      authTimeout: 30000,
    },
  };

  return Imap.connect(config);
}

// Fetch replies whose subject contains the sendId (or that are replies to the original subject)
async function fetchRepliesForSendId(sendId, options = {}) {
  if (!process.env.IMAP_HOST || !process.env.IMAP_USER || !process.env.IMAP_PASS) {
    throw new Error('IMAP configuration not provided in environment variables');
  }

  const connection = await connectImap();
  try {
    await connection.openBox('INBOX');

    // Search for messages that reference the sendId in subject or body
    const searchCriteria = [
      ['HEADER', 'SUBJECT', sendId],
    ];

    // Optionally limit since date
    if (options.since) {
      searchCriteria.push(['SINCE', options.since]);
    }

    const fetchOptions = { bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', 'TEXT'], struct: true };
    const messages = await connection.search(searchCriteria, fetchOptions);

    const results = [];

    for (const item of messages) {
      const all = item.parts || [];
      const headerPart = all.find(p => p.which && p.which.startsWith('HEADER')) || {};
      const raw = all.find(p => p.which === 'TEXT') || { body: '' };

      const parsed = await simpleParser(raw.body || '');

      const from = (parsed.from && parsed.from.text) || (headerPart.body && headerPart.body.from && headerPart.body.from[0]) || '';
      const subject = parsed.subject || (headerPart.body && headerPart.body.subject && headerPart.body.subject[0]) || '';
      const date = parsed.date || (headerPart.body && headerPart.body.date && headerPart.body.date[0]) || new Date();
      const text = parsed.text || parsed.html || raw.body || '';

      results.push({ from, subject, date, text });
    }

    return results;
  } finally {
    try { await connection.end(); } catch (e) { /* ignore */ }
  }
}

module.exports = { fetchRepliesForSendId };
