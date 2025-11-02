/**
 * ingestDocs.js
 * Advanced RAG Ingestion Script (Legal-aware Chunking + Overlap)
 */

require("dotenv").config();
const path = require("path");
const fs = require("fs").promises;
const mongoose = require("mongoose");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- PDF Reader ---
const pdfParse = require("pdf-parse/lib/pdf-parse.js");

// --- Regex for Legal Section Boundaries ---
const LEGAL_BREAK_REGEX =
  /(chapter\s+\d+|chapter\s+[ivx]+|article\s+\d+[A-Za-z]?|section\s+\d+[A-Za-z]?|part\s+\d+)/gi;

// --- 1. Google Embedding Model ---
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

// --- 2. Mongo Schema ---
const legalDocumentSchema = new mongoose.Schema({
  source: { type: String, required: true },
  text: { type: String, required: true },
  embedding: { type: [Number], required: true },
});
const LegalDocument = mongoose.model("LegalDocument", legalDocumentSchema);

// --- 3. Hybrid Legal-Aware Chunker (Option 1) ---
function chunkLegalText(text, chunkSize = 900, overlap = 200) {
  const cleaned = text.replace(/\r/g, "").trim();

  // 1️⃣ Split text into rough paragraphs
  const parts = cleaned.split(/\n{2,}/);
  const bigSections = [];
  let buffer = "";

  for (const p of parts) {
    if (p.match(LEGAL_BREAK_REGEX)) {
      if (buffer.trim().length) {
        bigSections.push(buffer.trim());
        buffer = "";
      }
      buffer += p + "\n";
    } else {
      buffer += p + "\n";
    }
  }
  if (buffer.trim().length) bigSections.push(buffer.trim());

  // 2️⃣ Overlapping chunking within each section
  const finalChunks = [];
  for (const section of bigSections) {
    const secClean = section.replace(/\s+/g, " ").trim();
    if (secClean.length <= chunkSize) {
      finalChunks.push(secClean);
      continue;
    }

    let start = 0;
    while (start < secClean.length) {
      const end = start + chunkSize;
      finalChunks.push(secClean.slice(start, end));
      start += chunkSize - overlap;
    }
  }

  return finalChunks.filter((c) => c.trim().length > 50);
}

// --- 4. Ingestion Logic ---
async function ingestData() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB connected.");

  console.log("🧹 Clearing existing documents...");
  await LegalDocument.deleteMany({});
  console.log("✅ Collection cleared.");

  const documentsPath = path.join(__dirname, "..", "documents");
  console.log("📂 Looking for PDFs in:", documentsPath);

  const files = await fs.readdir(documentsPath);
  const pdfFiles = files.filter((f) => f.toLowerCase().endsWith(".pdf"));

  if (!pdfFiles.length) {
    console.log("⚠️ No PDF files found in /documents");
    return;
  }

  for (const file of pdfFiles) {
    console.log(`\n--- 📘 Processing ${file} ---`);
    const filePath = path.join(documentsPath, file);

    const buffer = await fs.readFile(filePath);
    const data = await pdfParse(buffer);
    const fullText = data.text || "";
    console.log(`📄 Extracted ${fullText.length} characters from PDF.`);

    const chunks = chunkLegalText(fullText);
    console.log(`✂️ Split into ${chunks.length} chunks.`);

    const batchSize = 10;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      console.log(
        `🔹 Embedding batch ${i / batchSize + 1}/${Math.ceil(
          chunks.length / batchSize
        )} (${batch.length} chunks)`
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
              `❌ Error embedding chunk ${i + idx} of ${file}:`,
              err.message
            );
          }
        })
      );
    }

    console.log(`✅ Finished ${file}`);
  }

  console.log("\n🎉 All files ingested successfully!");
}

// --- 5. Run Script ---
ingestData()
  .catch((err) => {
    console.error("💥 An error occurred during ingestion:", err);
  })
  .finally(async () => {
    await mongoose.connection.close();
    console.log("🔒 MongoDB connection closed.");
  });
