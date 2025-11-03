// src/pages/ChatPage.jsx
import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import {
  getConversations,
  createConversation,
} from "../api/conversation";
import { getMessages, sendMessage } from "../api/messages";

function ChatPage() {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !activeConversation) return;

    const userMsg = { role: "user", parts: [{ text: input }] };
    setMessages((prev) => [...prev, userMsg]);
    const toSend = input;
    setInput("");
    setIsLoading(true);

    try {
      const aiMsg = await sendMessage(activeConversation._id, toSend);
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          parts: [
            {
              text: "Sorry, I ran into an error. Please try again.",
            },
          ],
        },
      ]);
    }
    setIsLoading(false);
  };

  return (
    <div className="bg-gray-100 h-screen w-full flex font-sans">
      <Sidebar
        conversations={conversations}
        activeConversation={activeConversation}
        onNewChat={handleNewChat}
        onSelect={handleSelectChat}
      />
      <ChatWindow
        activeConversation={activeConversation}
        messages={messages}
        input={input}
        setInput={setInput}
        isLoading={isLoading}
        onSend={handleSend}
      />
    </div>
  );
}

export default ChatPage;
