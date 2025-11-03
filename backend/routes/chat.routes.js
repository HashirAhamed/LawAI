// routes/chat.routes.js
const express = require("express");
const router = express.Router();
const { chat } = require("../controllers/chat.controller");
const { chatStream } = require("../controllers/chat.stream.controller");

// POST /api/conversations/:id/stream
router.post("/conversations/:id/stream", chatStream);

// POST /api/conversations/:id/chat
router.post("/conversations/:id/chat", chat);

module.exports = router;
