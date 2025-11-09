// src/components/ChatWindow.jsx
import React from "react";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import EmptyState from "./EmptyState";

function ChatWindow({
  activeConversation,
  messages,
  input,
  setInput,
  isStreaming,
  onSend,
}) {
  return (
    <div className="flex-1 flex flex-col bg-stone-50 shadow-lg rounded-none border-l border-gray-300 min-h-0">
      {/* Disclaimer */}
      <div className="p-3 px-4 bg-gray-200 border-b border-stone-300 text-stone-400 text-center text-sm">
        <p className="m-0 leading-snug">
          <strong>Disclaimer:</strong> This AI assistant provides general legal
          information and is not legal advice. Always consult a
          qualified lawyer for your specific case.
        </p>
      </div>

      {/* Chat area */}
      {!activeConversation ? (
        <div className="flex-grow justify-center overflow-y-auto">
          <EmptyState
            userName="User"              // or derive from profile later
            onSend={(prompt) => onSend(prompt)}
          />
        </div>
      ) : (
        <>
          {/* Message list area */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <MessageList messages={messages} isStreaming={isStreaming} />
          </div>

          {/* Sticky input at bottom */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 shadow-sm">
            <div className="pb-safe">
              <MessageInput
                value={input}
                onChange={setInput}
                onSubmit={onSend}
                disabled={isStreaming}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ChatWindow;
