// controllers/chat.stream.controller.js
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const { getGeminiModel } = require("../services/gemini.service");
const { findRelevantChunks } = require("../services/search.service");
const { isFollowupMessage } = require("../utils/followup");

/**
 * SSE endpoint: streams tokens as they arrive.
 * Route: POST /api/conversations/:id/stream
 */
async function chatStream(req, res) {
    try {
        const conversationId = req.params.id;
        const userMessageText = (req.body?.message || "").trim();
        if (!conversationId || !userMessageText) {
            return res.status(400).json({ error: "conversationId and message are required" });
        }

        // Make sure conversation exists
        const convo = await Conversation.findById(conversationId);
        if (!convo) return res.status(404).json({ error: "Conversation not found" });

        // Save user message immediately
        await new Message({ conversationId, role: "user", parts: userMessageText }).save();

        // Build context (same logic you already use)
        let contextText = "";
        let originalQuestion = userMessageText;

        if (isFollowupMessage(userMessageText)) {
            const [lastModel] = await Message.find({ conversationId, role: "model" })
                .sort({ createdAt: -1 })
                .limit(1);
            const [prevUser] = await Message.find({ conversationId, role: "user" })
                .sort({ createdAt: -1 })
                .skip(1)
                .limit(1);

            const lastModelText = lastModel?.parts || "";
            contextText = lastModelText || "No previous answer.";
            originalQuestion = prevUser?.parts || originalQuestion;
        } else {
            const relevant = await findRelevantChunks(userMessageText, 5);
            contextText =
                relevant.length > 0
                    ? relevant
                        .map((doc, i) => `#${i + 1} Source: ${doc.source}\n${doc.text}`)
                        .join("\n\n---\n\n")
                    : "No specific context found. Answer generally for Sri Lankan law, but say it is not from the uploaded documents.";
        }
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

        const recent = await Message.find({ conversationId }).sort({ createdAt: 1 }).limit(10);
        const history = [
            { role: "user", parts: [{ text: instruction }] },
            { role: "model", parts: [{ text: "Understood. I will follow the context strictly." }] },
            ...recent.map(m => ({ role: m.role, parts: [{ text: m.parts }] })),
        ];

        const model = getGeminiModel();

        // --- SSE headers ---
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.flushHeaders?.();

        // helper to send SSE events
        const send = (obj) => {
            res.write(`data: ${JSON.stringify(obj)}\n\n`);
        };

        // Start chat in streaming mode
        const chat = model.startChat({
            history,
            generationConfig: { temperature: 0.3, topP: 0.9, topK: 40 },
        });

        // Let the client know we’re starting a new answer
        send({ type: "start" });

        const streamResult = await chat.sendMessageStream(userMessageText);

        let fullText = "";

        for await (const chunk of streamResult.stream) {
            const piece = chunk.text();
            fullText += piece;
            send({ type: "delta", text: piece });
        }

        // Finish + persist model message once
        await new Message({ conversationId, role: "model", parts: fullText }).save();
        convo.updatedAt = new Date();
        await convo.save();

        send({ type: "done" });
        res.end();
    } catch (err) {
        // Send an SSE error frame to client
        try {
            res.write(`data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`);
            res.end();
        } catch (_) { }
        console.error("Stream error:", err);
    }
}

module.exports = { chatStream };
