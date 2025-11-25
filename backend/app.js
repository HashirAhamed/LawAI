const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const chatRoutes = require("./routes/chat.routes");
const conversationRoutes = require("./routes/conversation.routes");

const app = express();

const allowList = [
  process.env.CLIENT_ORIGIN, 
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  /\.vercel\.app$/, 
  "capacitor://localhost",
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
  credentials: false, 
  maxAge: 86400, 
};


app.use((req, _res, next) => {
  if (req.headers.origin) {
    console.log("🌍 Incoming request:", req.headers.origin, "| Path:", req.path);
  }
  next();
});

app.use(cors(corsOptions));

app.use(express.json());

connectDB();

// Routes
app.use("/api", chatRoutes);
app.use("/api/conversations", conversationRoutes);

module.exports = app;
