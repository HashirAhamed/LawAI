// scripts/listModels.js
require("dotenv").config();

const API_KEY = process.env.GOOGLE_API_KEY;

if (!API_KEY) {
  console.error("GOOGLE_API_KEY not found in .env");
  process.exit(1);
}

const URL = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

async function main() {
  const res = await fetch(URL);
  if (!res.ok) {
    const text = await res.text();
    console.error("HTTP error", res.status, text);
    return;
  }
  const data = await res.json();
  console.log("=== Models visible to THIS key ===");
  (data.models || []).forEach((m) => {
    console.log("-", m.name);
  });
}

main().catch((err) => {
  console.error("Error listing models:", err);
});
