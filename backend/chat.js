// main.js
// require("dotenv").config();
const { sendRfpEmail } = require("./sendEmail");
const fs = require("fs");
const PDFDocument = require("pdfkit");
// Using built-in fetch (Node 18+) - no need to require

// --- Your existing generateRFP(description) here (Ollama / other LLM) ---
async function generateRFP(description) {
  const systemPrompt = `
You are an expert procurement specialist and proposal writer.
Your task is to convert any informal project description provided by the user into a professionally written RFP (Request For Proposal) document.

Follow this exact RFP structure:
1. Introduction / Overview
2. Project Background
3. Scope of Work / Objectives
4. Technical Requirements
5. Deliverables
6. Timeline & Milestones
7. Budget & Payment Terms
8. Vendor Qualifications / Eligibility
9. Proposal Submission Guidelines
10. Evaluation Criteria
11. Terms & Conditions

Formatting Requirements:
- Write professionally, clearly, and concisely.
- Expand details logically even if user input is short.
- If any information is missing, make reasonable assumptions and include them.
- Use bullet points and headings where suitable.
- Do not include placeholders like "TBD".
- Produce final response as a structured formatted document.
`;

  const response = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3.2:1b",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Convert the following description into an RFP:\n${description}` },
      ],
      stream: false,
    }),
  });

  let data;
  try {
    data = await response.json();
  } catch (err) {
    throw new Error(`Failed to parse JSON response from API: ${err.message}`);
  }

  if (!response.ok) {
    const errDetail = (data && (data.error || data.message || JSON.stringify(data))) || response.statusText;
    throw new Error(`API request failed with status ${response.status}: ${errDetail}`);
  }

  const content =
    data?.message?.content ||
    data?.choices?.[0]?.message?.content ||
    data?.output?.[0]?.content ||
    data?.results?.[0]?.content ||
    data?.result?.[0]?.content;

  if (content) return content;
  if (typeof data === 'string') return data;
  return JSON.stringify(data, null, 2);
}

function saveRfpToPdf(rfpText, outputPath = "rfp.pdf") {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const writeStream = fs.createWriteStream(outputPath);
    doc.pipe(writeStream);

    doc.fontSize(12);
    doc.text(rfpText, { align: "left" });

    doc.end();

    writeStream.on("finish", () => resolve(outputPath));
    writeStream.on("error", reject);
  });
}

// ---- Full flow: description -> RFP -> PDF -> email ----
(async () => {
  try {
    const description =
      "We need a healthcare analytics dashboard that shows patient KPIs, billing, and doctor performance.";

    // 1. Get RFP text from LLM
    const rfpText = await generateRFP(description);

    // 2. Save it as PDF
    const pdfPath = "Healthcare_RFP.pdf";
    await saveRfpToPdf(rfpText, pdfPath);
    console.log(`RFP saved to PDF: ${pdfPath}`);

    // 3. Send that PDF to multiple emails
    const recipients = [
      "divyatigga0526@gmail.com",
      "ipsatigga02@gmail.com",
    ];

    await sendRfpEmail({
      to: recipients,
      subject: "Generated RFP – Healthcare Analytics Dashboard",
      text: "Hi,\n\nPlease find attached the generated RFP PDF.\n\nRegards,\nRFP Generator",
      pdfPath,
    });

    console.log("Emails sent to:", recipients.join(", "));
  } catch (err) {
    console.error("Error generating RFP or sending emails:", err.message);
    process.exitCode = 1;
  }
})();
