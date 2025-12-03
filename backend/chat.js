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
      model: "gemma3:1b",
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
    // If parsing fails, include response status/text for easier debugging
    let text = '';
    try { text = await response.text(); } catch(e) { /* ignore */ }
    const msg = `Failed to parse JSON response from API: ${err.message}. Response text: ${text}`;
    console.error(msg);
    // Fall through to fallback RFP generation below
    data = null;
  }

  if (response.ok && data) {
    const content =
      data?.message?.content ||
      data?.choices?.[0]?.message?.content ||
      data?.output?.[0]?.content ||
      data?.results?.[0]?.content ||
      data?.result?.[0]?.content;

    if (content) return content;
    if (typeof data === 'string') return data;
  }

  // If we reach here, the external LLM was not available or didn't return usable content.
  // Provide a safe fallback RFP generator so the app works end-to-end.
  console.warn('LLM service unavailable or returned unexpected data — using fallback RFP generator.');
  const fallbackRfp = `Request For Proposal (Generated Locally - Fallback)\n\nProject Description:\n${description}\n\n1. Introduction / Overview\nProvide a concise overview of the project based on the description above.\n\n2. Project Background\nSummarize the context and background.\n\n3. Scope of Work / Objectives\n- Primary objective: based on description.\n\n4. Technical Requirements\n- Define expected technologies, integrations, and constraints.\n\n5. Deliverables\n- List expected deliverables (reports, software, documentation).\n\n6. Timeline & Milestones\n- Provide suggested milestones and timeline estimates.\n\n7. Budget & Payment Terms\n- Indicate budget considerations and payment terms.\n\n8. Vendor Qualifications / Eligibility\n- Qualifications vendors should have.\n\n9. Proposal Submission Guidelines\n- Explain how vendors should submit proposals.\n\n10. Evaluation Criteria\n- Provide criteria by which proposals will be evaluated.\n\n11. Terms & Conditions\n- Include standard terms and conditions.
`;

  return fallbackRfp;
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

// Export functions for use in API
module.exports = { generateRFP, saveRfpToPdf };

// ---- Full flow: description -> RFP -> PDF -> email ----
// Only run this if file is executed directly (not imported)
if (require.main === module) {
  (async () => {
    try {
      const description =
        "";

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
}
