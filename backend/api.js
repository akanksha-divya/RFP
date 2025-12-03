// api.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const path = require('path');
const { generateRFP, saveRfpToPdf } = require('./chat');
const { sendRfpEmail } = require('./sendEmail');

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
          // Send email to all found emails
          await sendRfpEmail({
            to: recipientEmails,
            subject: `Generated RFP - ${new Date().toLocaleString()}`,
            text: `Please find attached the generated RFP.\n\nDescription:\n${description}`,
            pdfPath: pdfPath,
          });

          emailResult = { success: true, sentTo: recipientEmails, count: recipientEmails.length };
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
