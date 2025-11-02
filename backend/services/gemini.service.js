// services/gemini.service.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

// read from env first, fall back to your working one
const GEMINI_MODEL =
  process.env.GEMINI_MODEL; 
  //|| "gemini-2.5-flash-preview-09-2025";

if (!process.env.GOOGLE_API_KEY) {
  console.warn("⚠️ GOOGLE_API_KEY is not set in .env");
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// expose a function so controllers can get a chat
function getGeminiModel() {
  return genAI.getGenerativeModel({
    model: GEMINI_MODEL,
  });
}

module.exports = {
  getGeminiModel,
  GEMINI_MODEL,
};
