// routes/chat.routes.js
const express = require("express");
const router = express.Router();
const { getMessages, chat } = require("../controllers/chat.controller");

// GET /api/messages
router.get("/messages", getMessages);

// POST /api/chat
router.post("/chat", chat);

module.exports = router;
