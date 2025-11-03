// routes/chat.routes.js
const express = require("express");
const router = express.Router();
const { chat } = require("../controllers/chat.controller");

// POST /api/conversations/:id/chat
router.post("/conversations/:id/chat", chat);

module.exports = router;
