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
    const md = `**${role === "user" ? "You" : "AI"}:** ${text}`;
    const html = marked.parse(md);
    return DOMPurify.sanitize(html);
  };

  return (
    <div className="flex-grow overflow-y-auto p-4 space-y-3 flex flex-col">
      {messages.map((msg, index) => {
        const isUser = msg.role === "user";
        return (
          <div
            key={index}
            className={`py-2 px-3.5 rounded-xl max-w-[80%] leading-relaxed ${
              isUser
                ? "bg-blue-600 text-white self-end"
                : "bg-gray-50 text-gray-900 self-start border border-gray-200"
            }`}
          >
            {/* Optional mini header for AI bubbles */}
            {!isUser && (
              <>
                <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">
                  AI • Legal info
                </div>
                <div className="h-px bg-gray-200 mb-2" />
              </>
            )}

            <div
              className={
                isUser
                  ? // User bubble: inverted prose so links/lists render nicely on dark bg
                    "prose prose-invert prose-sm max-w-[70ch] prose-headings:mt-2 prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5"
                  : // AI bubble: standard prose
                    "prose prose-sm max-w-[70ch] prose-headings:mt-2 prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5"
              }
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
