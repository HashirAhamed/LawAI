// services/search.service.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const LegalDocument = require("../models/LegalDocument");

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// must match what you used in ingestion
const EMBEDDING_MODEL_NAME = "text-embedding-004";
const embeddingModel = genAI.getGenerativeModel({
    model: EMBEDDING_MODEL_NAME,
});

/**
 * Cosine similarity between two number arrays
 */
function cosineSimilarity(a, b) {
    let dot = 0;
    let aMag = 0;
    let bMag = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
        dot += a[i] * b[i];
        aMag += a[i] * a[i];
        bMag += b[i] * b[i];
    }
    if (!aMag || !bMag) return 0;
    return dot / (Math.sqrt(aMag) * Math.sqrt(bMag));
}

/**
 * Embed a query string using Gemini
 */
async function embedQuery(query) {
    const result = await embeddingModel.embedContent(query);
    return result.embedding.values;
}

/**
 * Find top relevant legal chunks for a query
 * @param {string} query
 * @param {number} k - how many results to return
 */
async function findRelevantChunks(query, k = 5) {
    // 1) embed the user query
    const queryEmbedding = await embedQuery(query);

    // 2) fetch some/all docs from Mongo
    //    (for large DBs, use a limit + index or Atlas Vector Search)
    // services/search.service.js
    const docs = await LegalDocument.find()
        .select("source text embedding")
        .limit(800)            // ⚠️ adjust to your data size
        .lean();

    // 3) score each by cosine similarity
    const scored = docs.map((doc) => {
        const score = cosineSimilarity(queryEmbedding, doc.embedding);
        return { ...doc, score };
    });

    // 4) sort and slice
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, k);
}

module.exports = {
    findRelevantChunks,
};
