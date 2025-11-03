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

export async function deleteConversation(id) {
  const res = await fetch(`http://localhost:5000/api/conversations/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete conversation");
  return res.json();
}

