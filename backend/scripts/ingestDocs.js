require("dotenv").config();
const path = require("path");
const fs = require("fs").promises;
const mongoose = require("mongoose");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// 🔥 force-load the actual function from pdf-parse
const pdfParse = require("pdf-parse/lib/pdf-parse.js");

// 1) AI setup
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const embeddingModel = genAI.getGenerativeModel({
  model: "text-embedding-004",
});

// 2) schema
const legalDocumentSchema = new mongoose.Schema({
  source: { type: String, required: true },
  text: { type: String, required: true },
  embedding: {
    type: [Number],
    required: true,
  },
});
const LegalDocument = mongoose.model("LegalDocument", legalDocumentSchema);

// 3) chunker
function chunkText(text) {
  const paragraphs = text.split(/\n\s*\n/);
  return paragraphs.filter((p) => p.trim().length > 10);
}

async function ingestData() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected.");

  console.log("Clearing existing documents...");
  await LegalDocument.deleteMany({});
  console.log("Cleared.");

  const documentsPath = path.join(__dirname, "..", "documents");
  console.log("Looking for PDFs in:", documentsPath);

  const files = await fs.readdir(documentsPath);
  const pdfFiles = files.filter((f) => f.toLowerCase().endsWith(".pdf"));

  if (!pdfFiles.length) {
    console.log("No PDF files found.");
    return;
  }

  for (const file of pdfFiles) {
    console.log(`--- Processing ${file} ---`);
    const filePath = path.join(documentsPath, file);
    const buf = await fs.readFile(filePath);

    // 👇 THIS was failing before
    const data = await pdfParse(buf);
    const text = data.text;
    console.log(`PDF text length: ${text.length}`);

    const chunks = chunkText(text);
    console.log(`Split into ${chunks.length} chunks.`);

    const batchSize = 10;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      console.log(
        `Processing batch ${i / batchSize + 1} of ${Math.ceil(
          chunks.length / batchSize
        )}`
      );

      await Promise.all(
        batch.map(async (chunkText, idx) => {
          try {
            const result = await embeddingModel.embedContent(chunkText);
            const embedding = result.embedding.values;

            await new LegalDocument({
              source: file,
              text: chunkText,
              embedding,
            }).save();
          } catch (err) {
            console.error(
              `Error embedding/saving chunk ${i + idx} of ${file}:`,
              err.message
            );
          }
        })
      );
    }

    console.log(`--- Finished ${file} ---`);
  }

  console.log("✅ All files ingested successfully!");
}

ingestData()
  .catch((err) => {
    console.error("An error occurred during ingestion:", err);
  })
  .finally(async () => {
    await mongoose.connection.close();
    console.log("MongoDB connection closed.");
  });
