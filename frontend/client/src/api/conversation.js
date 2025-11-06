// src/api/conversations.js
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export async function getConversations() {
  const res = await axios.get(`${API_URL}/conversations`);
  return res.data;
}

export async function createConversation(title = "New chat") {
  const res = await axios.post(`${API_URL}/conversations`, { title });
  return res.data;
}

export async function deleteConversation(id) {
  const res = await fetch(`${API_URL}/conversations/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete conversation");
  return res.json();
}


// src/api/conversations.js
export async function renameConversation(id, title) {
  const res = await fetch(`${API_URL}/conversations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error("Failed to rename");
  return res.json();
}
