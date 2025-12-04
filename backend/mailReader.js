// require('dotenv').config();
// const Imap = require('imap-simple');
// const { simpleParser } = require('mailparser');

// async function connectImap() {
//   const config = {
//     imap: {
//       user: process.env.IMAP_USER,
//       password: process.env.IMAP_PASS,
//       host: process.env.IMAP_HOST,
//       port: Number(process.env.IMAP_PORT || 993),
//       tls: process.env.IMAP_TLS !== 'false',
//       tlsOptions: {
//         rejectUnauthorized: false, // Allow self-signed certificates (dev only; use system CA in production)
//       },
//       authTimeout: 30000,
//     },
//   };

//   return Imap.connect(config);
// }

// // Fetch replies whose subject contains the sendId (or that are replies to the original subject)
// async function fetchRepliesForSendId(sendId, options = {}) {
//   if (!process.env.IMAP_HOST || !process.env.IMAP_USER || !process.env.IMAP_PASS) {
//     throw new Error('IMAP configuration not provided in environment variables');
//   }

//   const connection = await connectImap();
//   try {
//     await connection.openBox('INBOX');

//     // Search for messages that reference the sendId in subject or body
//     const searchCriteria = [
//       ['HEADER', 'SUBJECT', sendId],
//     ];

//     // Optionally limit since date
//     if (options.since) {
//       searchCriteria.push(['SINCE', options.since]);
//     }

//     const fetchOptions = { bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', 'TEXT'], struct: true };
//     const messages = await connection.search(searchCriteria, fetchOptions);

//     const results = [];

//     for (const item of messages) {
//       const all = item.parts || [];
//       const headerPart = all.find(p => p.which && p.which.startsWith('HEADER')) || {};
//       const raw = all.find(p => p.which === 'TEXT') || { body: '' };

//       const parsed = await simpleParser(raw.body || '');

//       const from = (parsed.from && parsed.from.text) || (headerPart.body && headerPart.body.from && headerPart.body.from[0]) || '';
//       const subject = parsed.subject || (headerPart.body && headerPart.body.subject && headerPart.body.subject[0]) || '';
//       const date = parsed.date || (headerPart.body && headerPart.body.date && headerPart.body.date[0]) || new Date();
//       const text = parsed.text || parsed.html || raw.body || '';

//       results.push({ from, subject, date, text });
//     }

//     return results;
//   } finally {
//     try { await connection.end(); } catch (e) { /* ignore */ }
//   }
// }

// module.exports = { fetchRepliesForSendId };


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
        // Allow self-signed certificates for dev.
        // In production, use proper CA / remove this.
        rejectUnauthorized: false,
      },
      authTimeout: 30000,
    },
  };

  return Imap.connect(config);
}

// Fetch replies whose subject/body contains the sendId
async function fetchRepliesForSendId(sendId, options = {}) {
  if (!sendId) {
    throw new Error('sendId is required to fetch replies');
  }

  if (!process.env.IMAP_HOST || !process.env.IMAP_USER || !process.env.IMAP_PASS) {
    throw new Error('IMAP configuration not provided in environment variables');
  }

  const connection = await connectImap();

  try {
    await connection.openBox('INBOX'); // incoming replies

    // Build IMAP search criteria:
    // - Subject contains sendId OR body text contains sendId
    const searchCriteria = [
      'ALL',
      [
        'OR',
        ['HEADER', 'SUBJECT', sendId],
        ['TEXT', sendId],
      ],
    ];

    // Optionally limit since date (Date or string)
    if (options.since) {
      searchCriteria.push(['SINCE', options.since]);
    }

    const fetchOptions = {
      bodies: [
        'HEADER.FIELDS (FROM TO SUBJECT DATE MESSAGE-ID IN-REPLY-TO REFERENCES)',
        'TEXT',
      ],
      struct: true,
      markSeen: false, // don't mark as read
    };

    const messages = await connection.search(searchCriteria, fetchOptions);

    const results = [];
    const sendIdLower = String(sendId).toLowerCase();

    for (const item of messages) {
      const allParts = item.parts || [];

      const headerPart =
        allParts.find(p => p.which && p.which.startsWith('HEADER')) || {};
      const textPart =
        allParts.find(p => p.which === 'TEXT') || { body: '' };

      const rawBody = textPart.body || '';

      // Parse body with mailparser (handles plain text + HTML)
      const parsed = await simpleParser(rawBody);

      const header = headerPart.body || {};

      const from =
        (parsed.from && parsed.from.text) ||
        (header.from && header.from[0]) ||
        '';

      const subject =
        parsed.subject ||
        (header.subject && header.subject[0]) ||
        '';

      const date =
        parsed.date ||
        (header.date && header.date[0]) ||
        new Date();

      const messageId =
        (parsed.messageId) ||
        (header['message-id'] && header['message-id'][0]) ||
        '';

      const inReplyTo =
        parsed.inReplyTo ||
        (header['in-reply-to'] && header['in-reply-to'][0]) ||
        '';

      const references =
        (parsed.references && parsed.references.join(', ')) ||
        (header.references && header.references[0]) ||
        '';

      // Prefer parsed.text, fall back to html or raw body
      const text =
        parsed.text ||
        parsed.html ||
        (typeof rawBody === 'string'
          ? rawBody
          : rawBody.toString ? rawBody.toString('utf8') : String(rawBody));

      // Extra safety: filter in JS as well, ensure sendId is in subject or text
      const subjectLower = (subject || '').toLowerCase();
      const textLower = (text || '').toLowerCase();
      if (
        !subjectLower.includes(sendIdLower) &&
        !textLower.includes(sendIdLower)
      ) {
        // Skip any false positives from IMAP search
        continue;
      }

      results.push({
        from,
        subject,
        date,
        text,
        messageId,
        inReplyTo,
        references,
      });
    }

    return results;
  } finally {
    try {
      await connection.end();
    } catch (e) {
      // ignore close errors
    }
  }
}

module.exports = { fetchRepliesForSendId, connectImap };

