// src/pages/ChatPage.jsx
import React, { useRef, useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import {
    getConversations,
    createConversation,
    deleteConversation,
    renameConversation,
} from "../api/conversation";
import { getMessages, sendMessages } from "../api/messages";

function ChatPage() {
    const [conversations, setConversations] = useState([]);
    const [activeConversation, setActiveConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const suppressNextFetchRef = useRef(false);

    // hard guard against double send in dev/StrictMode
    const sendingRef = useRef(false);
    const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Load conversations on mount
    useEffect(() => {
        (async () => {
            const convos = await getConversations();
            setConversations(convos || []);
        })();
    }, []);

    // Load messages when active convo changes
    useEffect(() => {
        (async () => {
            if (!activeConversation?._id) {
                setMessages([]);
                return;
            }
            if (suppressNextFetchRef.current) {
                suppressNextFetchRef.current = false;
                return;
            }

            const msgs = await getMessages(activeConversation._id);
            setMessages(msgs || []);
        })();
    }, [activeConversation]);

    const handleNewChat = async () => {
        const newChat = await createConversation("New chat");
        setConversations((prev) => [newChat, ...prev]);
        setActiveConversation(newChat);
        setMessages([]);
    };

    const handleSelectChat = (chat) => {
        if (!chat?._id) return;
        setActiveConversation(chat);
    };

    const handleDeleteChat = async (chat) => {
        const ok = window.confirm(`Delete chat "${chat.title || "Untitled Chat"}"?`);
        if (!ok) return;
        try {
            await deleteConversation(chat._id);
            setConversations((prev) => prev.filter((c) => c._id !== chat._id));
            if (activeConversation?._id === chat._id) {
                setActiveConversation(null);
                setMessages([]);
            }
        } catch (e) {
            console.error(e);
            alert("Failed to delete chat. Please try again.");
        }
    };

    const handleRename = async (id, title) => {
        // optimistic UI update
        setConversations((prev) => prev.map((c) => (c._id === id ? { ...c, title } : c)));
        try {
            await renameConversation(id, title);
        } catch (e) {
            // rollback to a safe default if rename fails
            setConversations((prev) => prev.map((c) => (c._id === id ? { ...c, title: "New chat" } : c)));
        }
    };

    // Ensure a conversation exists; if not, create one with a smart initial title
    const ensureConversation = async (seedText) => {
        if (activeConversation?._id) return activeConversation;

        const guess = seedText.split(/\s+/).slice(0, 6).join(" ");
        const title = (guess && (guess.length > 48 ? guess.slice(0, 48) + "…" : guess)) || "New chat";

        const created = await createConversation(title);

        // ⬇️ IMPORTANT: skip the very next fetch triggered by setActiveConversation
        suppressNextFetchRef.current = true;

        setConversations((prev) => [created, ...prev]);
        setActiveConversation(created);
        return created;
    };


    const handleSend = async (messageText) => {
        const text = (messageText ?? input ?? "").trim();
        if (!text) return;
        if (sendingRef.current) return;
        sendingRef.current = true;

        try {
            // 1) Ensure we have a conversation
            const convo = await ensureConversation(text);

            // 2) Append user + single AI placeholder
            const userId = `u_${uid()}`;
            const aiId = `m_${uid()}`;
            setMessages((prev) => [
                ...prev,
                { _id: userId, role: "user", parts: [{ text }] },
                { _id: aiId, role: "model", parts: [{ text: "" }] },
            ]);
            setInput("");

            // 3) If server created with generic title, auto-name optimistically
            if (!convo.title || convo.title === "New chat") {
                const guess = text.split(/\s+/).slice(0, 6).join(" ");
                const short = (guess.length > 48 ? guess.slice(0, 48) + "…" : guess) || "New chat";
                setConversations((prev) => prev.map((c) => (c._id === convo._id ? { ...c, title: short } : c)));
                // Fire-and-forget server rename
                renameConversation(convo._id, short).catch(() => { });
            }

            // 4) Stream the answer
            setIsStreaming(true);
            for await (const piece of sendMessages(convo._id, text)) {
                setMessages((prev) => {
                    const next = [...prev];
                    const idx = next.findIndex((m) => m._id === aiId);
                    if (idx !== -1) {
                        next[idx] = {
                            ...next[idx],
                            parts: [{ text: (next[idx].parts?.[0]?.text || "") + piece }],
                        };
                    }
                    return next;
                });
            }
        } catch (err) {
            console.error("Streaming error:", err);
            // Replace the placeholder with an error if something failed
            setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === "model") {
                    last.parts = [{ text: "Sorry, I ran into a streaming error. Please try again." }];
                }
                return next;
            });
        } finally {
            setIsStreaming(false);
            sendingRef.current = false;
        }
    };

    return (
        <div className="flex flex-col md:flex-row h-screen w-full bg-gray-200 font-sans overflow-hidden">
            {/* SIDEBAR — collapsible on mobile */}
            <div
                className={`fixed md:static top-0 left-0 z-40 w-64 h-full bg-white border-r border-gray-300 transform 
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} 
        md:translate-x-0 transition-transform duration-300 ease-in-out`}
            >
                <Sidebar
                    conversations={conversations}
                    activeConversation={activeConversation}
                    onNewChat={handleNewChat}
                    onSelect={(chat) => {
                        handleSelectChat(chat);
                        setSidebarOpen(false); // auto-close drawer on mobile
                    }}
                    onDelete={handleDeleteChat}
                    onRename={handleRename}
                    onClose={() => setSidebarOpen(false)}
                />
            </div>

            {/* CHAT AREA */}
            <div className="flex-1 flex flex-col h-screen md:h-full relative">
                {/* MOBILE HEADER */}
                <div className="flex items-center justify-between p-3 border-b bg-white md:hidden">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="text-gray-700 text-xl"
                    >
                        ☰
                    </button>
                    <h2 className="font-semibold text-base">LibraAI Assistant</h2>
                    <div className="w-6" />
                </div>

                {/* CHAT WINDOW */}
                <ChatWindow
                    activeConversation={activeConversation}
                    messages={messages}
                    input={input}
                    setInput={setInput}
                    isStreaming={isStreaming}
                    onSend={handleSend}
                />
            </div>
        </div>
    );
}

export default ChatPage;
