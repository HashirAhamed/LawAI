const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const chatRoutes = require("./routes/chat.routes");
const conversationRoutes = require("./routes/conversation.routes");

const app = express();

/**
 * ------------------ 🔒 Robust CORS Setup ------------------
 * ✅ Allows:
 *   - Your production frontend (from env: CLIENT_ORIGIN)
 *   - All Vercel preview deployments (*.vercel.app)
 *   - Local development (localhost:5173)
 * ✅ Handles preflight requests
 * ✅ Avoids crashes on unapproved origins
 * ✅ Debug logs origin + route
 * -----------------------------------------------------------
 */
const allowList = [
  process.env.CLIENT_ORIGIN, // e.g. https://law-ai-sigma-two.vercel.app (set this in Railway)
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  /\.vercel\.app$/, // Allow Vercel preview URLs
];

const corsOptions = {
  origin(origin, callback) {
    // Allow server-to-server (no Origin header)
    if (!origin) return callback(null, true);

    const allowed = allowList.some(entry =>
      entry instanceof RegExp ? entry.test(origin) : entry === origin
    );

    if (allowed) return callback(null, true);
    console.warn("🚫 CORS blocked request from:", origin);
    return callback(new Error("Not allowed by CORS"), false);
  },
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false, // Only true if you use cookies or sessions
  maxAge: 86400, // Cache preflight for 24h
};

// 🔍 Debug incoming origins (helpful during deployment)
app.use((req, _res, next) => {
  if (req.headers.origin) {
    console.log("🌍 Incoming request:", req.headers.origin, "| Path:", req.path);
  }
  next();
});

// 🧠 Enable CORS before JSON parsing or routes
app.use(cors(corsOptions));

// 🧾 Body parser
app.use(express.json());

// 🧩 Connect to MongoDB
connectDB();

// 🧭 Routes
app.use("/api", chatRoutes);
app.use("/api/conversations", conversationRoutes);

// ✅ Export for server.js
module.exports = app;
