// routes/conversation.routes.js
const express = require("express");
const router = express.Router();
const { createConversation, listConversations, getMessages, deleteConversation } = require("../controllers/conversation.controller");

// create new chat
router.post("/", createConversation);

// list all chats (latest first)
router.get("/", listConversations);

// get messages of one chat
router.get("/:id/messages", getMessages);

// delete a chat
router.delete("/:id", deleteConversation);

module.exports = router;
