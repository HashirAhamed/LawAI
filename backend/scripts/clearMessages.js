// scripts/clearMessages.js
require("dotenv").config();
const mongoose = require("mongoose");
const Message = require("../models/Message");

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await Message.deleteMany({});
  console.log("✅ All chat messages deleted.");
  await mongoose.connection.close();
})();
