// controllers/chat.controller.js
const Message = require("../models/Message");
const { getGeminiModel, GEMINI_MODEL } = require("../services/gemini.service");
const { findRelevantChunks } = require("../services/search.service");

async function getMessages(req, res) {
  try {
    const messages = await Message.find().sort({ createdAt: 1 });
    const formattedMessages = messages.map((m) => ({
      role: m.role,
      parts: [{ text: m.parts }],
    }));
    return res.json(formattedMessages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    return res.status(500).json({ error: "Failed to fetch messages" });
  }
}

async function chat(req, res) {
  try {
    const userMessageText = req.body.message;
    if (!userMessageText) {
      return res.status(400).json({ error: "Message is required" });
    }

    // 1. save user msg
    await new Message({ role: "user", parts: userMessageText }).save();

    // 2. get relevant chunks from DB (RAG)
    const relevant = await findRelevantChunks(userMessageText, 5);
    console.log(`RAG: found ${relevant.length} doc chunks from Mongo`);

    let contextText;
    if (!relevant.length) {
      contextText =
        "No specific context found. Answer based on general Sri Lankan legal principles, but tell the user this was not from the uploaded legal documents.";
    } else {
      contextText = relevant
        .map(
          (doc, idx) =>
            `# Source ${idx + 1}: ${doc.source} (score: ${doc.score.toFixed(
              4
            )})\n${doc.text}`
        )
        .join("\n\n---\n\n");
    }

    const instruction = `You are a helpful legal information assistant for Sri Lanka.
You MUST base your answer ONLY on the PROVIDED CONTEXT below.
If the context does not contain the exact provision or section, say so clearly.
Keep the answer short and clear.
ALWAYS end with: "This is not legal advice. Please consult a qualified lawyer in Sri Lanka."

---
PROVIDED CONTEXT:
${contextText}
---`;

    const model = getGeminiModel();

    const chatSession = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: instruction }],
        },
        {
          role: "model",
          parts: [
            {
              text: "Understood. I will answer only using the provided context and add the legal disclaimer.",
            },
          ],
        },
      ],
    });

    const result = await chatSession.sendMessage(
      `User question: ${userMessageText}`
    );
    const aiText = result.response.text();

    // save ai msg
    await new Message({ role: "model", parts: aiText }).save();

    return res.json({
      role: "model",
      parts: [{ text: aiText }],
    });
  } catch (err) {
    console.error("Error in /api/chat:", err);
    const fallback = `I'm sorry, I couldn't process that right now (model: ${GEMINI_MODEL}).`;
    await new Message({ role: "model", parts: fallback }).save();
    return res.status(500).json({
      role: "model",
      parts: [{ text: fallback }],
    });
  }
}

module.exports = {
  getMessages,
  chat,
};
