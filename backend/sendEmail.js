// sendEmail.js
require("dotenv").config();
const nodemailer = require("nodemailer");
const path = require("path");
const fs = require('fs');

const SENT_STORE = path.join(__dirname, 'sent_emails.json');

async function sendRfpEmail({ to, subject, text, pdfPath }) {
  // 1. Create transporter (SMTP)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false, // true for 465, false for 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // 2. Prepare mail options
  const mailOptions = {
    from: `"RFP Generator" <${process.env.SMTP_USER}>`,
    to: Array.isArray(to) ? to.join(",") : to, // multiple recipients
    subject,
    text, // plain text body
    // You can also add 'html' field here if you want rich body
    attachments: [
      {
        filename: path.basename(pdfPath),
        path: pdfPath, // path to the PDF file
      },
    ],
  };

  // 3. Send mail
  const info = await transporter.sendMail(mailOptions);
  console.log("Email sent:", info.messageId);
  // Record the send metadata locally so replies can be correlated
  try {
    const sendIdMatch = subject.match(/\[sendId:([^\]]+)\]/);
    const sendId = sendIdMatch ? sendIdMatch[1] : null;

    const entry = {
      sendId,
      messageId: info.messageId,
      to: Array.isArray(to) ? to : (typeof to === 'string' ? to.split(',').map(s=>s.trim()) : []),
      subject,
      pdfPath,
      timestamp: new Date().toISOString(),
    };

    let store = [];
    try {
      if (fs.existsSync(SENT_STORE)) {
        const raw = fs.readFileSync(SENT_STORE, 'utf8');
        store = raw ? JSON.parse(raw) : [];
      }
    } catch (e) {
      console.warn('Could not read sent_emails.json:', e.message);
    }

    store.push(entry);
    try {
      fs.writeFileSync(SENT_STORE, JSON.stringify(store, null, 2), 'utf8');
    } catch (e) {
      console.warn('Failed to write sent_emails.json:', e.message);
    }
  } catch (e) {
    console.warn('Failed to record send metadata:', e.message);
  }
}

module.exports = { sendRfpEmail };
