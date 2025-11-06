// src/api/messages.js
import axios from "axios";


const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export async function getMessages(conversationId) {
  const res = await axios.get(
    `${API_URL}/conversations/${conversationId}/messages`
  );
  return res.data;
}

export async function sendMessage(conversationId, message) {
  const res = await axios.post(
    `${API_URL}/conversations/${conversationId}/chat`,
    { message }
  );
  return res.data; // AI message
}
