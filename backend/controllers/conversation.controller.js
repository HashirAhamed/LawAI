const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

// create new chat
async function createConversation(req, res) {
    try {
        const convo = await Conversation.create({
            title: req.body.title || "New chat",
        });
        return res.json(convo);
    } catch (err) {
        console.error("Error creating conversation:", err);
        return res.status(500).json({ error: "Failed to create conversation" });
    }
};

// list all chats (latest first)
async function listConversations(req, res) {
    try {
        const convos = await Conversation.find().sort({ updatedAt: -1 });
        return res.json(convos);
    } catch (err) {
        console.error("Error listing conversations:", err);
        return res.status(500).json({ error: "Failed to list conversations" });
    }
};

// get messages of one chat
async function getMessages(req, res) {
    try {
        const messages = await Message.find({
            conversationId: req.params.id,
        }).sort({ createdAt: 1 });

        const formatted = messages.map((m) => ({
            role: m.role,
            parts: [{ text: m.parts }],
        }));

        return res.json(formatted);
    } catch (err) {
        console.error("Error fetching messages for conversation:", err);
        return res.status(500).json({ error: "Failed to fetch messages" });
    }
};

// DELETE /api/conversations/:id
async function deleteConversation(req, res) {
    try {
        const { id } = req.params;
        const convo = await Conversation.findById(id);
        if (!convo) return res.status(404).json({ error: "Conversation not found" });

        await Message.deleteMany({ conversationId: id });   // cascade delete
        await Conversation.deleteOne({ _id: id });

        return res.json({ ok: true });
    } catch (err) {
        console.error("Error deleting conversation:", err);
        return res.status(500).json({ error: "Failed to delete conversation" });
    }
};

module.exports = {
    createConversation,
    listConversations,
    getMessages,
    deleteConversation,
};