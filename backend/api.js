// api.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const path = require('path');
const { generateRFP, saveRfpToPdf } = require('./chat');
const { sendRfpEmail } = require('./sendEmail');
const { fetchRepliesForSendId } = require('./mailReader');
const fs = require('fs');
const { selectBestVendor } = require('./chat');

const app = express();
app.use(cors());
app.use(express.json());

// Serve generated files (PDFs) so frontend can download them
app.use('/files', express.static(path.join(__dirname)));

// MySQL connection config
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'RFP',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// GET /api/vendors - returns list of vendor names from vendor_details
app.get('/api/vendors', async (req, res) => {
  console.log('/api/vendors called from', req.ip || req.headers['x-forwarded-for'] || req.get('host'));
  try {
    const [rows] = await pool.query('SELECT DISTINCT name FROM vendor_details WHERE name IS NOT NULL AND name != ""');
    const names = rows.map(row => row.name);
    console.log(`/api/vendors: returning ${names.length} vendor names`);
    res.json(names);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ error: 'Failed to fetch vendors', details: error.message });
  }
});

// POST /api/generate-rfp - generates RFP from description and sends to selected vendor emails
app.post('/api/generate-rfp', async (req, res) => {
  try {
    const { description, vendorNames } = req.body;

    if (!description || description.trim() === '') {
      return res.status(400).json({ error: 'Description is required' });
    }

    console.log('/api/generate-rfp called with description:', description.substring(0, 50) + '...');
    console.log('Selected vendor names:', vendorNames);

    // Generate RFP from description
    const rfpText = await generateRFP(description);

    // Save RFP as PDF in backend folder
    const timestamp = Date.now();
    const pdfFilename = `RFP_${timestamp}.pdf`;
    const pdfPath = path.join(__dirname, pdfFilename);
    await saveRfpToPdf(rfpText, pdfPath);

    // Look up emails from vendor_details by vendor names
    let emailResult = null;
    let recipientEmails = [];

    if (vendorNames && Array.isArray(vendorNames) && vendorNames.length > 0) {
      try {
        // Query emails from vendor_details table for selected vendor names
        for (const vendorName of vendorNames) {
          const [rows] = await pool.query(
            'SELECT DISTINCT email FROM vendor_details WHERE name = ? AND email IS NOT NULL AND email != ""',
            [vendorName]
          );
          if (rows.length > 0) {
            rows.forEach(row => {
              if (!recipientEmails.includes(row.email)) {
                recipientEmails.push(row.email);
              }
            });
          }
        }

        console.log('Found recipient emails:', recipientEmails);

        if (recipientEmails.length > 0) {
                // create a sendId so replies can be correlated
                const sendId = `send-${Date.now()}-${Math.random().toString(16).slice(2,8)}`;
                const subjectText = `Generated RFP - ${new Date().toLocaleString()} [sendId:${sendId}]`;

                await sendRfpEmail({
                  to: recipientEmails,
                  subject: subjectText,
                  text: `Please find attached the generated RFP.\n\nDescription:\n${description}`,
                  pdfPath: pdfPath,
                });

                // Persist metadata about this send so we can later fetch replies and know vendor mapping
                try {
                  const storePath = path.join(__dirname, 'sent_emails.json');
                  let store = [];
                  if (fs.existsSync(storePath)) {
                    const raw = fs.readFileSync(storePath, 'utf8');
                    store = raw ? JSON.parse(raw) : [];
                  }
                  store.push({ sendId, timestamp: new Date().toISOString(), vendorNames, recipientEmails, pdfFilename });
                  fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
                } catch (e) {
                  console.warn('Failed to persist send metadata:', e.message);
                }

                emailResult = { success: true, sentTo: recipientEmails, count: recipientEmails.length, sendId };
        } else {
          emailResult = { success: false, error: 'No emails found for selected vendors' };
        }
      } catch (err) {
        console.error('Error looking up vendor emails or sending RFP email:', err);
        emailResult = { success: false, error: err.message };
      }
    }

    // Build a URL that frontend can use to download the PDF
    const pdfUrl = `${req.protocol}://${req.get('host')}/files/${pdfFilename}`;

    res.json({
      success: true,
      rfpText: rfpText,
      pdfPath: pdfPath,
      pdfUrl: pdfUrl,
      emailResult,
      message: 'RFP generated successfully'
    });
  } catch (error) {
    console.error('Error generating RFP:', error);
    res.status(500).json({ error: 'Failed to generate RFP', details: error.message });
  }
});

// POST /api/process-replies - fetch replies for a given sendId and ask LLM to select best vendor
app.post('/api/process-replies', async (req, res) => {
  try {
    const { sendId } = req.body;
    if (!sendId) return res.status(400).json({ error: 'sendId is required' });

    // Load persisted send metadata
    const storePath = path.join(__dirname, 'sent_emails.json');
    if (!fs.existsSync(storePath)) return res.status(404).json({ error: 'No sends recorded' });
    const raw = fs.readFileSync(storePath, 'utf8');
    const store = raw ? JSON.parse(raw) : [];
    const entry = store.find(e => e.sendId === sendId);
    if (!entry) return res.status(404).json({ error: 'sendId not found' });

    // Fetch replies via IMAP
    const replies = await fetchRepliesForSendId(sendId);

    // Map replies to vendors: if reply.from matches one of recipientEmails, attribute it.
    const vendorReplies = [];
    for (const r of replies) {
      // find vendor(s) that had this email address
      const matchedVendors = [];
      const fromAddr = (r.from || '').toLowerCase();
      for (const [i, em] of (entry.recipientEmails || []).entries()) {
        if (fromAddr.includes((em || '').toLowerCase())) {
          // Find vendor by email in vendorNames mapping in DB would be ideal; we saved only recipientEmails and vendorNames
          const vendorName = entry.vendorNames && entry.vendorNames[i] ? entry.vendorNames[i] : null;
          matchedVendors.push(vendorName || em);
        }
      }
      vendorReplies.push({ from: r.from, subject: r.subject, date: r.date, text: r.text, vendors: matchedVendors });
    }

    // Call LLM to pick best vendor
    const decision = await selectBestVendor({ sendId, vendorNames: entry.vendorNames || [], replies: vendorReplies });

    // Return decision and replies
    res.json({ success: true, sendId, decision, vendorReplies });
  } catch (err) {
    console.error('Error processing replies:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
