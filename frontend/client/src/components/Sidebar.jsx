// src/components/Sidebar.jsx
import React from "react";

function Sidebar({ conversations, activeConversation, onNewChat, onSelect }) {
  return (
    <div className="w-1/4 bg-white border-r border-gray-300 flex flex-col">
      <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
        <h2 className="text-lg font-semibold">LawAI Chats</h2>
        <button
          onClick={onNewChat}
          className="bg-blue-600 text-white rounded-full px-3 py-1 text-sm hover:bg-blue-700"
        >
          + New
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <p className="text-gray-500 text-sm p-4">No chats yet.</p>
        ) : (
          conversations.map((chat) => (
            <div
              key={chat._id}
              onClick={() => onSelect(chat)}
              className={`cursor-pointer px-4 py-3 border-b text-sm ${
                activeConversation?._id === chat._id
                  ? "bg-blue-100 text-blue-800 font-medium"
                  : "hover:bg-gray-100 text-gray-800"
              }`}
            >
              {chat.title || "Untitled Chat"}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Sidebar;
