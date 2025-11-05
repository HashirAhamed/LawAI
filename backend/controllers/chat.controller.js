// controllers/chat.controller.js
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const { getGeminiModel, GEMINI_MODEL } = require("../services/gemini.service");
const { findRelevantChunks } = require("../services/search.service");
const { isFollowupMessage } = require("../utils/followup");
const { makeAutoTitleFrom } = require("../services/autoTitle.service");

async function chat(req, res) {
  try {
    const conversationId = req.params.id; // <- from route /api/conversations/:id/chat
    if (!conversationId) {
      return res.status(400).json({ error: "conversationId is required" });
    }

    const userMessageText = req.body.message?.trim();
    if (!userMessageText) {
      return res.status(400).json({ error: "Message is required" });
    }

    // make sure convo exists (optional but good)
    const convo = await Conversation.findById(conversationId);
    if (!convo) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // save user message
    await new Message({
      conversationId,
      role: "user",
      parts: userMessageText,
    }).save();

    // determine follow-up
    const followup = isFollowupMessage(userMessageText);

    let contextText = "";
    let originalQuestion = userMessageText;

    if (followup) {
      // get last model + last user IN THIS CONVERSATION
      const lastModel = await Message.find({
        conversationId,
        role: "model",
      })
        .sort({ createdAt: -1 })
        .limit(1);

      const prevUser = await Message.find({
        conversationId,
        role: "user",
      })
        .sort({ createdAt: -1 })
        .skip(1)
        .limit(1);

      const lastModelText = lastModel.length ? lastModel[0].parts : "";
      const prevUserText = prevUser.length ? prevUser[0].parts : userMessageText;

      contextText = lastModelText || "No previous answer.";
      originalQuestion = prevUserText;

      // rewrite for the model
      // (so it knows we're reformatting)
      var finalUserPrompt = `Previous answer:\n${lastModelText}\n\nUser follow-up request: ${userMessageText}`;
    } else {
      // normal RAG
      const relevant = await findRelevantChunks(userMessageText, 5);
      contextText =
        relevant.length > 0
          ? relevant
            .map(
              (doc, i) =>
                `#${i + 1} Source: ${doc.source}\n${doc.text}`
            )
            .join("\n\n---\n\n")
          : "No specific context found. Answer generally for Sri Lankan law, but say it is not from the uploaded documents.";

      var finalUserPrompt = userMessageText;
    }

    // get last messages IN THIS CONVERSATION (for history)
    const recentMessages = await Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .limit(10);

    const conversationHistory = recentMessages.map((m) => ({
      role: m.role,
      parts: [{ text: m.parts }],
    }));

    const instruction = `
You are a legal information assistant for Sri Lanka.
You must reason carefully.
If this message is a follow-up (summarize / make shorter / translate / give in paragraph),
apply it to the PREVIOUS ANSWER in THIS conversation, not to a random legal document.

---
PROVIDED CONTEXT:
${contextText}
---
Original question I should stay aligned to:
${originalQuestion}
`;

    const model = getGeminiModel();

    const chatSession = model.startChat({
      history: [
        { role: "user", parts: [{ text: instruction }] },
        {
          role: "model",
          parts: [{ text: "Understood. I will follow the context strictly." }],
        },
        ...conversationHistory,
      ],
      generationConfig: {
        temperature: 0.3,
        topP: 0.9,
        topK: 40,
      },
    });

    const result = await chatSession.sendMessage(finalUserPrompt);
    const aiText = result.response.text();

    // save AI message scoped to this conversation
    await new Message({
      conversationId,
      role: "model",
      parts: aiText,
    }).save();

    // update conversation timestamp / title if needed
    convo.updatedAt = new Date();
    convo = await Conversation.findById(activeConversationId);
    if (convo && (!convo.title || convo.title === "New chat")) {
      const auto = makeAutoTitleFrom(userMessageText);
      convo.title = auto;
      await convo.save();
    }

    return res.json({ role: "model", parts: [{ text: aiText }] });
  } catch (err) {
    console.error("Error in /api/conversations/:id/chat:", err);
    const fallback = `I'm sorry, I couldn't process that right now (model: ${GEMINI_MODEL}).`;
    return res
      .status(500)
      .json({ role: "model", parts: [{ text: fallback }] });
  }
}

module.exports = {
  chat,
};
