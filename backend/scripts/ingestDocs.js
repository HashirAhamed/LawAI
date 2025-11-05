/**
 * ingestDocs_v2.js
 * The "Wise" Way: An Incremental & Managed Ingestion Script
 *
 * This script is "idempotent" - it can be run many times.
 * It only processes files that are new or have changed by:
 * 1. Deleting existing chunks for a file *before* processing it.
 * 2. Adding metadata (like section titles) for better search.
 * 3. Adding a small delay to respect API rate limits.
 */

require("dotenv").config();
const path = require("path");
const fs = require("fs").promises;
const mongoose = require("mongoose");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const pdfParse = require("pdf-parse"); // Use the correct import

// --- Regex for Legal Section Boundaries ---
const LEGAL_BREAK_REGEX =
  /(chapter\s+\d+|chapter\s+[ivx]+|article\s+\d+[A-Za-z]?|section\s+\d+[A-Za-z]?|part\s+\d+)/gi;

// --- 1. Google Embedding Model ---
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

// --- 2. Mongo Schema (with METADATA) ---
const legalDocumentSchema = new mongoose.Schema({
  source: { type: String, required: true, index: true }, // Index `source` for fast deletion
  text: { type: String, required: true },
  embedding: { type: [Number], required: true },
  section: { type: String, default: "General" }, // Our new metadata field
  doc_title: { type: String, default: "Unknown" }, // Another useful field
});
const LegalDocument = mongoose.model("LegalDocument", legalDocumentSchema);

// --- 3. Hybrid Legal-Aware Chunker (Returns Objects) ---
/**
 * Chunks text and returns an array of objects with metadata.
 * @param {string} text - Full text.
 * @returns {Array<{text: string, section: string}>}
 */
function chunkLegalText(text, chunkSize = 900, overlap = 200) {
  const cleaned = text.replace(/\r/g, "").trim();
  const parts = cleaned.split(/\n{2,}/);
  const finalChunks = [];
  let currentSection = "Introduction"; // Track the "active" section

  let buffer = "";
  for (const p of parts) {
    const sectionMatch = p.match(LEGAL_BREAK_REGEX);
    if (sectionMatch) {
      // New section found. Process the buffer we've built up.
      if (buffer.trim().length) {
        finalChunks.push(...chunkSection(buffer.trim(), currentSection, chunkSize, overlap));
      }
      buffer = p + "\n"; // Start a new buffer
      currentSection = sectionMatch[0]; // Set the new active section
    } else {
      buffer += p + "\n";
    }
  }
  // Process the final buffer
  if (buffer.trim().length) {
    finalChunks.push(...chunkSection(buffer.trim(), currentSection, chunkSize, overlap));
  }

  return finalChunks.filter((c) => c.text.trim().length > 50);
}

/**
 * Helper function to apply overlapping chunking to a single section.
 */
function chunkSection(sectionText, sectionTitle, chunkSize, overlap) {
  const chunks = [];
  const secClean = sectionText.replace(/\s+/g, " ").trim();
  if (secClean.length === 0) return [];

  if (secClean.length <= chunkSize) {
    chunks.push({ text: secClean, section: sectionTitle });
    return chunks;
  }

  let start = 0;
  while (start < secClean.length) {
    const end = start + chunkSize;
    chunks.push({
      text: secClean.slice(start, end),
      section: sectionTitle,
    });
    start += chunkSize - overlap;
  }
  return chunks;
}

// Helper for API rate limits
const delay = (ms) => new Promise(res => setTimeout(res, ms));

// --- 4. Ingestion Logic (Incremental) ---
async function ingestData() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB connected.");

  // We no longer delete everything!

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

    // ------------------- THE WISE WAY -------------------
    // 1. DELETE existing data for this file first.
    console.log(`🧹 Clearing existing chunks for ${file}...`);
    await LegalDocument.deleteMany({ source: file });
    console.log(`✅ Cleared old data for ${file}.`);
    // ----------------------------------------------------

    const filePath = path.join(documentsPath, file);
    const buffer = await fs.readFile(filePath);
    const data = await pdfParse(buffer);
    const fullText = data.text || "";
    console.log(`📄 Extracted ${fullText.length} characters from PDF.`);

    // 2. Chunk text into objects with metadata
    const chunks = chunkLegalText(fullText);
    console.log(`✂️ Split into ${chunks.length} chunks.`);

    const batchSize = 10; // Small batch size for safety
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      console.log(
        `🔹 Embedding batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          chunks.length / batchSize
        )} (${batch.length} chunks)`
      );

      await Promise.all(
        batch.map(async (chunkObj, idx) => {
          try {
            // 3. Embed the text
            const result = await embeddingModel.embedContent(chunkObj.text);
            const embedding = result.embedding.values;

            // 4. Save the full object with metadata
            await new LegalDocument({
              source: file,
              doc_title: file.replace(".pdf", ""), // Simple title
              text: chunkObj.text,
              section: chunkObj.section,
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
      
      // 5. RESPECT THE RATE LIMIT
      console.log("...waiting 500ms to respect API rate limit...");
      await delay(500); // Wait 0.5 seconds between batches
    }

    console.log(`✅ Finished ${file}`);
  }

  console.log("\n🎉 All files processed!");
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
