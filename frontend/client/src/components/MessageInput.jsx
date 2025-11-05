// src/components/MessageInput.jsx
import React from "react";

function MessageInput({ value, onChange, onSubmit, disabled }) {
  return (
    <form className="flex p-4 border-t border-gray-300" onSubmit={onSubmit}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ask a question about Sri Lankan law..."
        disabled={disabled}
        className="flex-grow border border-gray-300 rounded-full py-2 px-4 text-base mr-3 focus:outline-none focus:ring-2 focus:ring-stone-800"
      />
      <button
        type="submit"
        disabled={disabled}
        className="bg-stone-900 text-white border-none rounded-full py-2 px-5 text-base cursor-pointer hover:bg-stone-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        Send
      </button>
    </form>
  );
}

export default MessageInput;
