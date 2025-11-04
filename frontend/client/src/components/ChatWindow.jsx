// src/components/ChatWindow.jsx
import React from "react";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

function ChatWindow({
  activeConversation,
  messages,
  input,
  setInput,
  isLoading,
  onSend,
}) {
  return (
    <div className="flex-1 flex flex-col bg-white shadow-lg rounded-none border-l border-gray-300 min-h-0">
      {/* Disclaimer */}
      <div className="p-3 px-4 bg-yellow-50 border-b border-yellow-200 text-yellow-800 text-center text-sm">
        <p className="m-0 leading-snug">
          <strong>Disclaimer:</strong> This AI assistant provides general legal
          information for Sri Lanka and is not legal advice. Always consult a
          qualified lawyer for your specific case.
        </p>
      </div>

      {/* Chat area */}
      {!activeConversation ? (
        <div className="flex-grow flex items-center justify-center text-gray-500">
          Select or start a chat to begin.
        </div>
      ) : (
        <>
          {/* Message list area */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <MessageList messages={messages} isLoading={isLoading} />
          </div>

          {/* Sticky input at bottom */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 shadow-sm">
            <div className="pb-safe">
              <MessageInput
                value={input}
                onChange={setInput}
                onSubmit={onSend}
                disabled={isLoading}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ChatWindow;
