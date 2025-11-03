// src/api/conversations.js
import axios from "axios";

const API_URL = "http://localhost:5000/api";

export async function getConversations() {
  const res = await axios.get(`${API_URL}/conversations`);
  return res.data;
}

export async function createConversation(title = "New chat") {
  const res = await axios.post(`${API_URL}/conversations`, { title });
  return res.data;
}
