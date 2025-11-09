// src/api/messages.js
import axios from "axios";


const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export async function getMessages(conversationId) {
  const res = await axios.get(
    `${API_URL}/conversations/${conversationId}/messages`
  );
  return res.data;
}

export async function* sendMessages(conversationId, message) {
  const resp = await fetch(
    `${API_URL}/conversations/${conversationId}/stream`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    }
  );

  if (!resp.ok || !resp.body) {
    throw new Error(`Stream failed: ${resp.status} ${resp.statusText}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;

      buffer += decoder.decode(value, { stream: true });

      // Split Server-Sent Events frames
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";

      for (const frame of frames) {
        if (!frame.startsWith("data:")) continue;
        let payload;
        try {
          payload = JSON.parse(frame.replace(/^data:\s*/, ""));
        } catch {
          continue;
        }
        if (payload?.type === "delta" && typeof payload.text === "string") {
          yield payload.text; // emit just the text piece
        }
      }
    }
  } finally {
    reader.releaseLock?.();
  }
}