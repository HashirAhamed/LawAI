require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- 1. App Setup ---
const app = express();
app.use(express.json());
app.use(cors());
const PORT = process.env.PORT || 5000;

// --- 2. Google AI Setup ---
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
// ------------------- THE FIX -------------------
// Trying one more model: 'gemini-2.5-flash-preview-09-2025'
// This is a stable, widely available model.
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-09-2025" });
// -----------------------------------------------

// --- 3. MongoDB Setup (for Chat History) ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected..."))
  .catch(err => console.error("MongoDB connection error:", err));

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "model"], required: true },
  parts: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
const Message = mongoose.model("Message", messageSchema);

// --- 4. The Knowledge Base (The "R" in RAG) ---
const KNOWLEDGE_BASE = [
  {
    id: "const-ch3-art10",
    source: "Constitution of Sri Lanka - Chapter 3, Article 10",
    text: "Every person is entitled to freedom of thought, conscience and religion, including the freedom to have or to adopt a religion or belief of his choice."
  },
  {
    id: "const-ch3-art11",
    source: "Constitution of Sri Lanka - Chapter 3, Article 11",
    text: "No person shall be subjected to torture or to cruel, inhuman or degrading treatment or punishment."
  },
  {
    id: "const-ch3-art13-1",
    source: "Constitution of Sri Lanka - Chapter 3, Article 13(1)",
    text: "No person shall be arrested except to procedure established by law. Any person arrested shall be informed of the reason for his arrest."
  },
  {
    id: "const-ch3-art13-2",
    source: "Constitution of Sri Lanka - Chapter 3, Article 13(2)",
    text: "Every person held in custody, detained or otherwise deprived of personal liberty shall be brought before the judge of the nearest competent court according to procedure established by law, and shall not be further held in custody, detained or deprived of personal liberty except upon and in terms of the order of such judge made in accordance with procedure established by law."
  },
  {
    id: "example-bail-act",
    source: "Bail Act, No. 30 of 1997 - Section 7",
    text: "The granting of bail to a person suspected or accused of having committed a bailable offence is a right of that person. The court shall release such person on bail at any time, on application made in that behalf."
  }
];

function retrieveContext(query) {
  const queryLower = query.toLowerCase();
  const keywords = queryLower.split(' ').filter(word => word.length > 3);

  const relevantChunks = KNOWLEDGE_BASE.filter(chunk => {
    const textLower = chunk.text.toLowerCase();
    const sourceLower = chunk.source.toLowerCase();
    return keywords.some(kw => textLower.includes(kw) || sourceLower.includes(kw)) || textLower.includes(queryLower);
  });

  console.log(`Found ${relevantChunks.length} relevant chunks for query: "${query}"`);
  return relevantChunks;
}

// --- 5. API Endpoints ---

app.get("/api/messages", async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: 1 });
    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.parts }],
    }));
    res.json(formattedMessages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    // --- (Fixed typo here from 500.json to 500().json) ---
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const userMessageText = req.body.message;
    if (!userMessageText) {
      return res.status(400).json({ error: "Message is required" });
    }

    // 1. Save user's message
    const userMessage = new Message({ role: "user", parts: userMessageText });
    await userMessage.save();

    // 2. Retrieve context
    const contextChunks = retrieveContext(userMessageText);

    // 3. Augment the prompt
    let contextText = "No specific context found. Answer based on general knowledge but state that this is not from a specific legal document.";
    if (contextChunks.length > 0) {
      contextText = contextChunks.map(chunk => 
        `Source: ${chunk.source}\nText: ${chunk.text}`
      ).join('\n\n---\n\n');
    }

    // This is the string containing our full prompt
    const systemInstructionString = `You are a helpful legal information assistant for Sri Lanka.
Your user is a citizen with a legal doubt.
You MUST answer the user's question based *ONLY* on the "PROVIDED CONTEXT" below.
Do not use any other knowledge or personal opinions.
If the provided context is not sufficient to answer the question, clearly state that you do not have that specific information in your knowledge base.
Be clear, concise, and easy to understand.
ALWAYS state that this is not legal advice and the user should consult a lawyer.

---
PROVIDED CONTEXT:
${contextText}
---
`;

    // ------------------- THE FIX -------------------
    // We are keeping the history-based instruction method, as it is the
    // most compatible.
    
    const history = [
      {
        role: "user",
        parts: [{ text: systemInstructionString }],
      },
      {
        role: "model",
        parts: [{ text: "Understood. I will act as a helpful legal information assistant for Sri Lanka and will only use the context provided to answer the user's question." }],
      }
    ];

    const chat = model.startChat({
      history: history,
      // No `systemInstruction` field here
    });
    
    // 4. Generate
    const result = await chat.sendMessage(userMessageText); // Send the *actual* user query
    const aiResponseText = result.response.text();

    // 5. Save AI's response
    const aiMessage = new Message({ role: "model", parts: aiResponseText });
    await aiMessage.save();

    // 6. Send response to client
    res.json({
      role: "model",
      parts: [{ text: aiMessage.parts }],
    });

  } catch (error) {
    console.error("Error in /api/chat:", error);
    const aiErrorText = "I'm sorry, I encountered an internal error. Please try again later.";
    const aiMessage = new Message({ role: "model", parts: aiErrorText });
    res.status(500).json({ role: "model", parts: [{ text: aiErrorText }]});
  }
});

// --- 6. Start Server ---
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

