// controllers/chat.controller.js
const Message = require("../models/Message");
const { getGeminiModel, GEMINI_MODEL } = require("../services/gemini.service");
const { findRelevantChunks } = require("../services/search.service");
const { isFollowupMessage } = require("../utils/followup");

// GET /api/messages
async function getMessages(req, res) {
  try {
    const messages = await Message.find().sort({ createdAt: 1 });
    const formatted = messages.map((m) => ({
      role: m.role,
      parts: [{ text: m.parts }],
    }));
    return res.json(formatted);
  } catch (err) {
    console.error("Error fetching messages:", err);
    return res.status(500).json({ error: "Failed to fetch messages" });
  }
}

// POST /api/chat
async function chat(req, res) {
  try {
    let userMessageText = req.body.message?.trim();
    if (!userMessageText) {
      return res.status(400).json({ error: "Message is required" });
    }

    // 1) save current user message right away
    await new Message({ role: "user", parts: userMessageText }).save();

    // 2) base variables
    let contextText = "";
    let originalQuestion = userMessageText;
    let isFollowup = isFollowupMessage(userMessageText);

    // 3) if follow-up -> reuse last AI answer and last real question
    if (isFollowup) {
      const lastModel = await Message.find({ role: "model" })
        .sort({ createdAt: -1 })
        .limit(1);
      const prevUser = await Message.find({ role: "user" })
        .sort({ createdAt: -1 })
        .skip(1) // skip the message we just saved
        .limit(1);

      const lastModelText = lastModel.length ? lastModel[0].parts : "";
      const prevUserText = prevUser.length ? prevUser[0].parts : userMessageText;

      // reuse previous answer as our "context"
      contextText = lastModelText || "No previous answer.";
      originalQuestion = prevUserText;

      // we ALSO rewrite the user message so the model knows what to do
      userMessageText = `Previous answer:\n${lastModelText}\n\nUser follow-up request: ${req.body.message}`;
    } else {
      // 4) normal RAG path – do semantic retrieval
      const relevant = await findRelevantChunks(userMessageText, 5);
      if (relevant.length > 0) {
        contextText = relevant
          .map(
            (doc, i) =>
              `#${i + 1} Source: ${doc.source}\n${doc.text}`
          )
          .join("\n\n---\n\n");
      } else {
        contextText =
          "No specific context found. Answer generally for Sri Lankan law, but say it is not from the uploaded documents.";
      }
    }

    // 5) load recent conversation history (for better follow-ups)
    //    we add it AFTER the system instruction
    const recentMessages = await Message.find()
      .sort({ createdAt: 1 })
      .limit(10); // last 10 messages in order

    const conversationHistory = recentMessages.map((m) => ({
      role: m.role,
      parts: [{ text: m.parts }],
    }));

    // 6) system / instruction message
    const instruction = `
You are a legal information assistant for Sri Lanka.
You must reason carefully before answering.

Follow this process:
1. Understand the user's intent.
2. Match it against the PROVIDED CONTEXT.
3. If the user is doing a FOLLOW-UP (e.g. "shorten this", "give in a paragraph", "translate"), you MUST apply the request to the PREVIOUS ANSWER / ORIGINAL QUESTION, not to unrelated legal text.
4. If the context does NOT contain the information, say clearly: "I don't have that exact provision in the current documents."

IMPORTANT:
- Do NOT make up Sri Lankan laws that are not in the context.
- If multiple sources are provided, pick the most relevant one and say which source you used.
- Keep the answer concise unless user asked to expand.

---
PROVIDED CONTEXT:
${contextText}
---
Original user question I should stay aligned to:
${originalQuestion}
`;

    // 7) create model + chat
    const model = getGeminiModel();

    const chatSession = model.startChat({
      // system instruction FIRST, then prior convo
      history: [
        { role: "user", parts: [{ text: instruction }] },
        {
          role: "model",
          parts: [{ text: "Understood. I will follow the context strictly." }],
        },
        // add last messages (so follow-ups stay on topic)
        ...conversationHistory,
      ],
      generationConfig: {
        temperature: 0.3,
        topP: 0.9,
        topK: 40,
      },
    });

    // 8) send the actual user message (which may be follow-up-wrapped)
    const result = await chatSession.sendMessage(userMessageText);
    const aiText = result.response.text();

    // 9) save AI message
    await new Message({ role: "model", parts: aiText }).save();

    return res.json({ role: "model", parts: [{ text: aiText }] });
  } catch (err) {
    console.error("Error in /api/chat:", err);
    const fallback = `I'm sorry, I couldn't process that right now (model: ${GEMINI_MODEL}).`;
    await new Message({ role: "model", parts: fallback }).save();
    return res.status(500).json({ role: "model", parts: [{ text: fallback }] });
  }
}

module.exports = {
  getMessages,
  chat,
};
