// src/components/MessageList.jsx
import React, { useRef, useEffect } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

marked.setOptions({
  breaks: true,  // line breaks behave like chat
  gfm: true,     // GitHub-flavored markdown (lists, tables)
});

function MessageList({ messages, isLoading }) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const renderHtml = (text, role) => {
    // Prefix with speaker label in markdown so it bolds neatly
    const md = `${role === "user" ? "" : ""} ${text}`;
    const html = marked.parse(md);
    return DOMPurify.sanitize(html);
  };

  return (
    <div className="flex-grow overflow-y-auto p-4 space-y-3 flex flex-col">
      {messages.map((msg, index) => {
        const isUser = msg.role === "user";
        return (
          <div
            className={`py-2 px-3.5 rounded-xl max-w-[80%] leading-relaxed ${isUser
                ? "bg-stone-200 text-gray-800 self-end"
                : "bg-gray-50 text-gray-600 self-start border border-gray-200 prose"
              }`}
          >
            <div
              dangerouslySetInnerHTML={{
                __html: renderHtml(msg.parts?.[0]?.text ?? "", msg.role),
              }}
            />
          </div>

        );
      })}

      {isLoading && (
        <div className="py-2 px-3.5 rounded-xl max-w-[80%] bg-gray-200 text-gray-900 self-start">
          <p className="m-0">
            <strong>AI:</strong> Thinking...
          </p>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}

export default MessageList;
