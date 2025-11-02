// routes/conversation.routes.js
const express = require("express");
const router = express.Router();
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

// create new chat
router.post("/", async (req, res) => {
  try {
    const convo = await Conversation.create({
      title: req.body.title || "New chat",
    });
    return res.json(convo);
  } catch (err) {
    console.error("Error creating conversation:", err);
    return res.status(500).json({ error: "Failed to create conversation" });
  }
});

// list all chats (latest first)
router.get("/", async (req, res) => {
  try {
    const convos = await Conversation.find().sort({ updatedAt: -1 });
    return res.json(convos);
  } catch (err) {
    console.error("Error listing conversations:", err);
    return res.status(500).json({ error: "Failed to list conversations" });
  }
});

// get messages of one chat
router.get("/:id/messages", async (req, res) => {
  try {
    const messages = await Message.find({
      conversationId: req.params.id,
    }).sort({ createdAt: 1 });

    const formatted = messages.map((m) => ({
      role: m.role,
      parts: [{ text: m.parts }],
    }));

    return res.json(formatted);
  } catch (err) {
    console.error("Error fetching messages for conversation:", err);
    return res.status(500).json({ error: "Failed to fetch messages" });
  }
});

module.exports = router;
