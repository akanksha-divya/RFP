// api.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const { generateRFP, saveRfpToPdf } = require('./chat');

const app = express();
app.use(cors());
app.use(express.json());

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

// GET /api/names - returns all names from vendor_details
app.get('/api/names', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT name FROM vendor_details');
    const names = rows.map(row => row.name);
    res.json(names);
  } catch (error) {
    console.error('Error fetching names:', error);
    res.status(500).json({ error: 'Failed to fetch names' });
  }
});

// POST /api/generate-rfp - generates RFP from description
app.post('/api/generate-rfp', async (req, res) => {
  try {
    const { description } = req.body;

    if (!description || description.trim() === '') {
      return res.status(400).json({ error: 'Description is required' });
    }

    // Generate RFP from description
    const rfpText = await generateRFP(description);

    // Save RFP as PDF
    const timestamp = Date.now();
    const pdfPath = `RFP_${timestamp}.pdf`;
    await saveRfpToPdf(rfpText, pdfPath);

    res.json({
      success: true,
      rfpText: rfpText,
      pdfPath: pdfPath,
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
