import fs from "fs";
import PDFDocument from "pdfkit";

// rfpText = the string you got from the LLM
export function saveRfpToPdf(rfpText, outputPath = "rfp.pdf") {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 50,
      size: "A4",
    });

    const writeStream = fs.createWriteStream(outputPath);
    doc.pipe(writeStream);

    doc.fontSize(12);
    doc.text(rfpText, {
      align: "left",
    });

    doc.end();

    writeStream.on("finish", () => resolve(outputPath));
    writeStream.on("error", reject);
  });
}
