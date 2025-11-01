// app.js
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const chatRoutes = require("./routes/chat.routes");

const app = express();

// middleware
app.use(express.json());
app.use(cors());

// db
connectDB();

// routes
app.use("/api", chatRoutes);

module.exports = app;
