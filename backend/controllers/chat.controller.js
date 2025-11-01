// controllers/chat.controller.js
const Message = require("../models/Message");
const retrieveContext = require("../utils/retrieveContext");
const { getGeminiModel, GEMINI_MODEL } = require("../services/gemini.service");

async function getMessages(req, res) {
  try {
    const messages = await Message.find().sort({ createdAt: 1 });
    const formattedMessages = messages.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.parts }],
    }));
    return res.json(formattedMessages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return res.status(500).json({ error: "Failed to fetch messages" });
  }
}

async function chat(req, res) {
  try {
    const userMessageText = req.body.message;
    if (!userMessageText) {
      return res.status(400).json({ error: "Message is required" });
    }

    // 1. save user message
    await new Message({ role: "user", parts: userMessageText }).save();

    // 2. RAG
    const contextChunks = retrieveContext(userMessageText);
    const contextText =
      contextChunks.length > 0
        ? contextChunks
            .map(
              (chunk) => `Source: ${chunk.source}\nText: ${chunk.text}`
            )
            .join("\n\n---\n\n")
        : "No specific context found. Answer based on general knowledge but state that this is not from a specific legal document.";

    // 3. build instruction
    const systemInstructionString = `You are a helpful legal information assistant for Sri Lanka.
Your user is a citizen with a legal doubt.
You MUST answer the user's question based *ONLY* on the "PROVIDED CONTEXT" below.
Do not use any other knowledge or personal opinions.
If the provided context is not sufficient to answer the question, clearly state that you do not have that specific information in your knowledge base.
Be clear, concise, and easy to understand.
ALWAYS state that this is not legal advice and the user should consult a lawyer.

---
PROVIDED CONTEXT:
${contextText}
---
`;

    const model = getGeminiModel();

    const chatSession = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: systemInstructionString }],
        },
        {
          role: "model",
          parts: [
            {
              text: "Understood. I will act as a helpful legal information assistant for Sri Lanka and will only use the context provided to answer the user's question.",
            },
          ],
        },
      ],
    });

    // 4. ask the actual user question
    const result = await chatSession.sendMessage(
      `User question: ${userMessageText}
If the answer is not in the provided context, say you don't have it.`
    );

    const aiResponseText = result.response.text();

    // 5. save ai message
    await new Message({ role: "model", parts: aiResponseText }).save();

    // 6. send to client
    return res.json({
      role: "model",
      parts: [{ text: aiResponseText }],
    });
  } catch (error) {
    console.error("Error in /api/chat:", error);

    const fallback = `I'm sorry, I encountered an internal error (model: ${GEMINI_MODEL}). Please try again later.`;
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
