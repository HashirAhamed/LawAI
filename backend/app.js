const express = require("express");
const cors = require("cors"); // Make sure cors is required here
const connectDB = require("./config/db");
const chatRoutes = require("./routes/chat.routes");
const conversationRoutes = require("./routes/conversation.routes");

const app = express();

// middleware
app.use(express.json());

// --- THIS IS THE CORRECTED CORS POLICY ---
// List of allowed origins
const allowedOrigins = [
  'http://localhost:5173', // Your local dev environment
  'https://law-ai-sigma-two.vercel.app/' // <-- !!! REPLACE THIS with your *actual* Vercel URL !!!
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
}));
// ----------------------------------------

// db
connectDB();

// routes
app.use("/api", chatRoutes);
app.use("/api/conversations", conversationRoutes);

module.exports = app;