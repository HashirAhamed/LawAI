import React from "react";

function Sidebar({ conversations, activeConversation, onNewChat, onSelect, onDelete }) {
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
              className={`group flex items-center justify-between gap-2 px-4 py-3 border-b text-sm cursor-pointer ${
                activeConversation?._id === chat._id
                  ? "bg-blue-100 text-blue-800 font-medium"
                  : "hover:bg-gray-100 text-gray-800"
              }`}
              onClick={() => onSelect(chat)}
            >
              <span className="truncate">{chat.title || "Untitled Chat"}</span>
              <button
                className="opacity-60 hover:opacity-100 text-red-500 hover:text-red-600 px-1 py-0.5 rounded"
                title="Delete chat"
                onClick={(e) => {
                  e.stopPropagation(); // prevent selecting the chat
                  onDelete(chat);
                }}
              >
                🗑️
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Sidebar;
