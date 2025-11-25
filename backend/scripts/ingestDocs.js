/**
 * ingestDocs_v2.js
 * Incremental, metadata-rich ingestion for Mongo + Gemini embeddings.
 *
 * - Idempotent per file (clears existing chunks for that file first)
 * - Adds rich metadata for better retrieval + citations
 * - Respects API rate limits with small delays
 */

require("dotenv").config();
const path = require("path");
const fs = require("fs").promises;
const mongoose = require("mongoose");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const pdfParse = require("pdf-parse"); // if this breaks, swap to: require("pdf-parse/lib/pdf-parse.js");

// --- Regex for Legal Section Boundaries ---
const LEGAL_BREAK_REGEX =
  /(chapter\s+\d+|chapter\s+[ivx]+|article\s+\d+[A-Za-z]?|section\s+\d+[A-Za-z]?|part\s+\d+)/gi;

// --- Static metadata per PDF file ---
// Adjust these names to match your actual filenames in /documents
const FILE_METADATA = {
  "constitution.pdf": {
    doc_title:
      "Constitution of the Democratic Socialist Republic of Sri Lanka",
    doc_type: "constitution",
    law_area: ["fundamental_rights", "public_law"],
    year: 1978,
  },
  "Penal-Code-Consolidated2024.pdf": {
    doc_title: "Penal Code (Consolidated 2024)",
    doc_type: "statute",
    law_area: ["criminal"],
    year: 2024,
  },
  "Code-of-Criminal-Procedure-Consolidated.pdf": {
    doc_title: "Code of Criminal Procedure (Consolidated)",
    doc_type: "procedure",
    law_area: ["criminal", "procedure"],
  },
  "Evidence-Ordinance-Consolidated-2024.pdf": {
    doc_title: "Evidence Ordinance (Consolidated 2024)",
    doc_type: "statute",
    law_area: ["evidence"],
    year: 2024,
  },
  "Judicature-Consolidated-2024.pdf": {
    doc_title: "Judicature Act (Consolidated 2024)",
    doc_type: "statute",
    law_area: ["courts"],
    year: 2024,
  },
  // Example for future case-law PDFs:
  // "SC-Judgements-2024.pdf": {
  //   doc_title: "Supreme Court Judgements 2024",
  //   doc_type: "case_law",
  //   law_area: ["criminal", "civil", "fundamental_rights"],
  //   court: "SC",
  //   year: 2024,
  // },
};

// --- 1. Google Embedding Model ---
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const embeddingModel = genAI.getGenerativeModel({
  model: "text-embedding-004",
});

// --- 2. Mongo Schema (with rich METADATA) ---
const legalDocumentSchema = new mongoose.Schema({
  source: { type: String, required: true, index: true }, // Filename
  text: { type: String, required: true },
  embedding: { type: [Number], required: true },

  // Existing simple metadata
  section: { type: String, default: "General" },
  doc_title: { type: String, default: "Unknown" },

  // New metadata for accuracy + citations
  doc_type: { type: String, index: true }, // constitution | statute | case_law | procedure | guideline | unknown
  law_area: { type: [String], index: true }, // ["criminal","evidence",...]
  hierarchy_level: { type: String }, // chapter | article | section | unknown
  chapter_label: { type: String },
  section_label: { type: String },
  section_number: { type: Number },
  citation: { type: String }, // Ready-to-print citation, eg. "Penal Code (Consolidated 2024) s.32"
  court: { type: String }, // SC | CA etc. (for case law)
  year: { type: Number },
});

const LegalDocument = mongoose.model("LegalDocument", legalDocumentSchema);

// --- 3. Helpers ---

// Basic delay for rate limiting
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

/**
 * Interpret a heading like "Section 32", "Article 13(2)", "Chapter III"
 * into structured metadata.
 */
function parseSectionTitle(raw) {
  if (!raw) {
    return {
      hierarchy_level: "unknown",
      section_label: null,
      section_number: null,
    };
  }

  const normalized = raw.trim();
  const lower = normalized.toLowerCase();

  if (lower.startsWith("chapter")) {
    return {
      hierarchy_level: "chapter",
      section_label: normalized,
      section_number: null,
    };
  }

  if (lower.startsWith("article")) {
    const numMatch = normalized.match(/article\s+(\d+)/i);
    return {
      hierarchy_level: "article",
      section_label: normalized,
      section_number: numMatch ? Number(numMatch[1]) : null,
    };
  }

  if (lower.startsWith("section")) {
    const numMatch = normalized.match(/section\s+(\d+)/i);
    return {
      hierarchy_level: "section",
      section_label: normalized,
      section_number: numMatch ? Number(numMatch[1]) : null,
    };
  }

  return {
    hierarchy_level: "unknown",
    section_label: normalized,
    section_number: null,
  };
}

/**
 * Apply overlapping chunking inside a single legal section.
 * Returns objects with text + section metadata.
 */
function chunkSection(sectionText, sectionTitle, chunkSize, overlap) {
  const chunks = [];
  const secClean = sectionText.replace(/\s+/g, " ").trim();
  if (!secClean.length) return [];

  const meta = parseSectionTitle(sectionTitle);

  if (secClean.length <= chunkSize) {
    chunks.push({
      text: secClean,
      section: sectionTitle,
      ...meta,
    });
    return chunks;
  }

  let start = 0;
  while (start < secClean.length) {
    const end = start + chunkSize;
    chunks.push({
      text: secClean.slice(start, end),
      section: sectionTitle,
      ...meta,
    });
    start += chunkSize - overlap;
  }
  return chunks;
}

/**
 * Hybrid legal-aware chunker.
 * Uses paragraph breaks + legal markers (section/article/chapter)
 * and returns an array of objects:
 * { text, section, hierarchy_level, section_label, section_number }
 */
function chunkLegalText(text, chunkSize = 900, overlap = 200) {
  const cleaned = text.replace(/\r/g, "").trim();
  const parts = cleaned.split(/\n{2,}/); // paragraphs
  const finalChunks = [];

  let currentSection = "Introduction";
  let buffer = "";

  for (const p of parts) {
    const sectionMatch = p.match(LEGAL_BREAK_REGEX);
    if (sectionMatch) {
      // New section marker
      if (buffer.trim().length) {
        finalChunks.push(
          ...chunkSection(buffer.trim(), currentSection, chunkSize, overlap)
        );
      }
      buffer = p + "\n";
      currentSection = sectionMatch[0];
    } else {
      buffer += p + "\n";
    }
  }

  // flush remaining buffer
  if (buffer.trim().length) {
    finalChunks.push(
      ...chunkSection(buffer.trim(), currentSection, chunkSize, overlap)
    );
  }

  // remove super tiny chunks
  return finalChunks.filter((c) => c.text.trim().length > 50);
}

// --- 4. Ingestion Logic (Incremental + Metadata-aware) ---
async function ingestData() {
  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB connected.");

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

    // Per-file metadata
    const baseMeta = FILE_METADATA[file] || {
      doc_title: file.replace(/\.pdf$/i, ""),
      doc_type: "unknown",
      law_area: [],
      court: undefined,
      year: undefined,
    };

    // 1. Clear existing chunks for this file (idempotent per source)
    console.log(`🧹 Clearing existing chunks for ${file}...`);
    await LegalDocument.deleteMany({ source: file });
    console.log(`✅ Cleared old data for ${file}.`);

    // 2. Parse PDF text
    const filePath = path.join(documentsPath, file);
    const buffer = await fs.readFile(filePath);
    const data = await pdfParse(buffer);
    const fullText = data.text || "";
    console.log(`📄 Extracted ${fullText.length} characters from PDF.`);

    // 3. Chunk with legal awareness
    const chunks = chunkLegalText(fullText);
    console.log(`✂️ Split into ${chunks.length} chunks.`);

    const batchSize = 10;
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
            // 4. Embed the text
            const result = await embeddingModel.embedContent(chunkObj.text);
            const embedding = result.embedding.values;

            // Build a nice citation string
            const citationBase = baseMeta.doc_title || file.replace(/\.pdf$/i, "");
            let citation = citationBase;
            if (chunkObj.section_label) {
              // e.g. "Penal Code (Consolidated 2024) s.32"
              citation = `${citationBase} ${chunkObj.section_label}`;
            }

            await new LegalDocument({
              source: file,

              // base metadata
              doc_title: baseMeta.doc_title,
              doc_type: baseMeta.doc_type,
              law_area: baseMeta.law_area,
              court: baseMeta.court,
              year: baseMeta.year,

              // chunk text + structure
              text: chunkObj.text,
              section: chunkObj.section, // original section text
              hierarchy_level: chunkObj.hierarchy_level,
              chapter_label:
                chunkObj.hierarchy_level === "chapter"
                  ? chunkObj.section_label
                  : undefined,
              section_label: chunkObj.section_label,
              section_number: chunkObj.section_number,
              citation,

              // vector
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

      // Respect API limits
      console.log("⏳ Waiting 500ms to respect API rate limit...");
      await delay(500);
    }

    console.log(`✅ Finished ingesting ${file}`);
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
