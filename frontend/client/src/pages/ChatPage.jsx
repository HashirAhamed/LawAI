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


    // load convos on mount
    useEffect(() => {
        (async () => {
            const convos = await getConversations();
            setConversations(convos);
        })();
    }, []);

    // load messages when active convo changes
    useEffect(() => {
        if (!activeConversation) return;
        (async () => {
            setIsStreaming(true);
            const msgs = await getMessages(activeConversation._id);
            setMessages(msgs);
            setIsStreaming(false);
        })();
    }, [activeConversation]);

    const handleNewChat = async () => {
        const newChat = await createConversation("New chat");
        setConversations((prev) => [newChat, ...prev]);
        setActiveConversation(newChat);
        setMessages([]);
    };

    const handleSelectChat = (chat) => {
        setActiveConversation(chat);
    };

    const sendingRef = useRef(false); // hard guard against double send in dev/StrictMode
    const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const handleSend = async (messageText) => {
        const text = (messageText ?? "").trim();
        if (!text || !activeConversation?._id) return;

        if (sendingRef.current) return;
        sendingRef.current = true;

        // 1) add user message
        const userId = `u_${uid()}`;
        const userMsg = { _id: userId, role: "user", parts: [{ text }] };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");

        // 2) add a single AI placeholder
        const aiId = `m_${uid()}`;
        setMessages((prev) => [...prev, { _id: aiId, role: "model", parts: [{ text: "" }] }]);

        // 3) auto-title first time
        if (!activeConversation.title || activeConversation.title === "New chat") {
            const guess = text.split(/\s+/).slice(0, 6).join(" ");
            const short = (guess.length > 48 ? guess.slice(0, 48) + "…" : guess) || "New chat";
            setConversations((prev) =>
                prev.map((c) => (c._id === activeConversation._id ? { ...c, title: short } : c))
            );
            // fire-and-forget
            renameConversation(activeConversation._id, short).catch(() => { });
        }

        setIsStreaming(true);
        try {
            for await (const piece of sendMessages(activeConversation._id, text)) {
                // append each delta to the placeholder
                setMessages((prev) => {
                    const next = [...prev];
                    const idx = next.findIndex((m) => m._id === aiId);
                    if (idx !== -1) {
                        next[idx] = {
                            ...next[idx],
                            parts: [{ text: next[idx].parts[0].text + piece }],
                        };
                    }
                    return next;
                });
            }
        } catch (err) {
            console.error("Streaming error:", err);
            setMessages((prev) => {
                const next = [...prev];
                const idx = next.findIndex((m) => m._id === aiId);
                if (idx !== -1) {
                    next[idx] = {
                        ...next[idx],
                        parts: [{ text: "Sorry, I ran into a streaming error. Please try again." }],
                    };
                }
                return next;
            });
        } finally {
            setIsStreaming(false);
            sendingRef.current = false;
        }
    };

    const handleDeleteChat = async (chat) => {
        const ok = window.confirm(`Delete chat "${chat.title || "Untitled Chat"}"?`);
        if (!ok) return;
        try {
            await deleteConversation(chat._id);
            // remove from local state
            setConversations((prev) => prev.filter((c) => c._id !== chat._id));
            // if we deleted the active one, clear selection
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
        setConversations(prev =>
            prev.map(c => (c._id === id ? { ...c, title } : c))
        );
        try {
            await renameConversation(id, title);
        } catch (e) {
            // rollback if needed
            setConversations(prev =>
                prev.map(c => (c._id === id ? { ...c, title: "New chat" } : c))
            );
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
