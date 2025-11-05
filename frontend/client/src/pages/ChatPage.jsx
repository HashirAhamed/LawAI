// src/pages/ChatPage.jsx
import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import {
    getConversations,
    createConversation,
    deleteConversation,
} from "../api/conversation";
import { getMessages, sendMessage } from "../api/messages";

function ChatPage() {
    const [conversations, setConversations] = useState([]);
    const [activeConversation, setActiveConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

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
            setIsLoading(true);
            const msgs = await getMessages(activeConversation._id);
            setMessages(msgs);
            setIsLoading(false);
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

    // inside ChatPage.jsx (or wherever you send messages)
    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || !activeConversation) return;

        const userMsg = { role: "user", parts: [{ text: input }] };
        setMessages((prev) => [...prev, userMsg]);

        const toSend = input;
        setInput("");

        // Optimistically add empty AI message to fill as we stream
        const aiPlaceholder = { role: "model", parts: [{ text: "" }] };
        setMessages((prev) => [...prev, aiPlaceholder]);

        try {
            const resp = await fetch(
                `http://localhost:5000/api/conversations/${activeConversation._id}/stream`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ message: toSend }),
                }
            );

            if (!resp.ok || !resp.body) {
                throw new Error("Stream failed to start");
            }

            const reader = resp.body.getReader();
            const decoder = new TextDecoder("utf-8");

            let done = false;
            while (!done) {
                const { value, done: doneReading } = await reader.read();
                done = doneReading;
                if (value) {
                    const chunk = decoder.decode(value, { stream: true });
                    // SSE sends multiple "data: ..." lines per chunk; split & parse
                    chunk
                        .split("\n\n")
                        .filter(Boolean)
                        .forEach((line) => {
                            if (!line.startsWith("data:")) return;
                            const payload = JSON.parse(line.replace(/^data:\s*/, ""));
                            if (payload.type === "delta") {
                                const piece = payload.text || "";
                                // append piece to the LAST message (AI placeholder)
                                setMessages((prev) => {
                                    const next = [...prev];
                                    const last = next[next.length - 1];
                                    if (last?.role === "model") {
                                        last.parts[0].text += piece;
                                    }
                                    return next;
                                });
                            }
                        });
                }
            }
        } catch (err) {
            console.error("Streaming error:", err);
            setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === "model") {
                    last.parts[0].text =
                        "Sorry, I ran into a streaming error. Please try again.";
                }
                return next;
            });
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
                    <h2 className="font-semibold text-base">LawAI Assistant</h2>
                    <div className="w-6" />
                </div>

                {/* CHAT WINDOW */}
                <ChatWindow
                    activeConversation={activeConversation}
                    messages={messages}
                    input={input}
                    setInput={setInput}
                    isLoading={isLoading}
                    onSend={handleSend}
                />
            </div>
        </div>
    );

}

export default ChatPage;
