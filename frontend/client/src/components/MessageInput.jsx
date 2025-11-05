// src/components/MessageInput.jsx
import React, { useRef } from "react";

function MessageInput({ value, onChange, onSubmit, disabled }) {
  const submittingRef = useRef(false); // Prevents double submit (Strict Mode issue)

  const handleSubmit = (e) => {
    e.preventDefault();
    if (submittingRef.current) return; // block double fire
    if (!value.trim()) return;

    submittingRef.current = true;
    onSubmit(value.trim());
    setTimeout(() => (submittingRef.current = false), 300);
  };

  const handleKeyDown = (e) => {
    // Press Enter to send; Shift+Enter = newline
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) {
        handleSubmit(e);
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 p-3 border-t border-gray-300 bg-white w-full"
    >
      <textarea
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask a question about Sri Lankan law..."
        disabled={disabled}
        className="flex-grow resize-none border border-gray-300 rounded-full py-2 px-4 text-sm sm:text-base focus:outline-none 
                   focus:ring-2 focus:ring-stone-800 placeholder:text-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed 
                   overflow-y-auto max-h-32"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="flex-shrink-0 bg-stone-900 text-white rounded-full py-2 px-5 text-sm sm:text-base 
                   hover:bg-stone-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        Send
      </button>
    </form>
  );
}

export default MessageInput;
