// sendEmail.js
require("dotenv").config();
const nodemailer = require("nodemailer");
const path = require("path");

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
}

module.exports = { sendRfpEmail };
