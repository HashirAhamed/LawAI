// src/pages/ChatPage.jsx
import React, { useRef, useState, useEffect } from "react";
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

        if (sendingRef.current) return;   // ⛔ prevents a second immediate call
        sendingRef.current = true;

        // 1) add user message with a stable _id
        const userId = `u_${uid()}`;
        const userMsg = { _id: userId, role: "user", parts: [{ text }] };
        setMessages(prev => [...prev, userMsg]);
        setInput("");

        // 2) add a SINGLE AI placeholder with a stable _id
        const aiId = `m_${uid()}`;
        const aiPlaceholder = { _id: aiId, role: "model", parts: [{ text: "" }] };
        setMessages(prev => [...prev, aiPlaceholder]);

        setIsStreaming(true);
        try {
            const resp = await fetch(
                `http://localhost:5000/api/conversations/${activeConversation._id}/stream`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ message: text }),
                }
            );
            if (!resp.ok || !resp.body) throw new Error("Stream failed to start");

            const reader = resp.body.getReader();
            const decoder = new TextDecoder("utf-8");

            // buffer to handle partial SSE frames
            let buffer = "";
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                if (!value) continue;

                buffer += decoder.decode(value, { stream: true });

                // split on SSE frame separator
                const frames = buffer.split("\n\n");
                buffer = frames.pop() ?? ""; // keep partial for next loop

                for (const frame of frames) {
                    if (!frame.startsWith("data:")) continue;
                    const json = frame.replace(/^data:\s*/, "");
                    let payload;
                    try {
                        payload = JSON.parse(json);
                    } catch { continue; }

                    if (payload.type === "delta") {
                        const piece = payload.text || "";
                        setMessages(prev => {
                            const next = [...prev];
                            const idx = next.findIndex(m => m._id === aiId);
                            if (idx !== -1) next[idx] = {
                                ...next[idx],
                                parts: [{ text: next[idx].parts[0].text + piece }],
                            };
                            return next;
                        });
                    }
                }
            }
        } catch (err) {
            console.error("Streaming error:", err);
            setMessages(prev => {
                const next = [...prev];
                const idx = next.findIndex(m => m._id === aiId);
                if (idx !== -1) next[idx] = {
                    ...next[idx],
                    parts: [{ text: "Sorry, I ran into a streaming error. Please try again." }],
                };
                return next;
            });
        } finally {
            setIsStreaming(false);
            sendingRef.current = false; // allow next send
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
                    isStreaming={isStreaming}
                    onSend={handleSend}
                />
            </div>
        </div>
    );

}

export default ChatPage;
