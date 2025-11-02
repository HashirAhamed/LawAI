// models/Conversation.js
const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    title: { type: String, default: "New chat" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Conversation", conversationSchema);
