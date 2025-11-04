import React from "react";

function Sidebar({
  conversations,
  activeConversation,
  onNewChat,
  onSelect,
  onDelete,
  onClose, // optional for mobile close button
}) {
  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-300 shadow-sm">
      {/* --- HEADER --- */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 sticky top-0 bg-white z-10">
        <div className="flex items-center gap-2">
          {/* Mobile close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden text-gray-500 hover:text-gray-700 text-lg"
              title="Close sidebar"
            >
              ✕
            </button>
          )}
          <h2 className="text-lg font-semibold text-gray-800">Chats</h2>
        </div>

        <button
          onClick={onNewChat}
          className="bg-blue-600 text-white rounded-full px-3 py-1 text-sm hover:bg-blue-700 transition-colors"
        >
          + New
        </button>
      </div>

      {/* --- CHAT LIST --- */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        {conversations.length === 0 ? (
          <p className="text-gray-500 text-sm p-4 text-center">
            No chats yet. <br />
            Click <strong>+ New</strong> to start one.
          </p>
        ) : (
          conversations.map((chat) => (
            <div
              key={chat._id}
              onClick={() => onSelect(chat)}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm cursor-pointer transition-all duration-150 ${
                activeConversation?._id === chat._id
                  ? "bg-blue-100 text-blue-800 font-medium"
                  : "hover:bg-gray-100 text-gray-800"
              }`}
            >
              <span className="truncate flex-1 pr-2">
                {chat.title || "Untitled Chat"}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(chat);
                }}
                className="text-red-500 hover:text-red-600 opacity-70 hover:opacity-100 text-base leading-none"
                title="Delete chat"
              >
                🗑️
              </button>
            </div>
          ))
        )}
      </div>

      {/* --- FOOTER --- */}
      <div className="px-4 py-3 border-t border-gray-200 text-xs text-gray-500 text-center">
        <p>⚖️ LawAI Assistant</p>
        <p className="text-[10px] text-gray-400 mt-1">v1.0</p>
      </div>
    </div>
  );
}

export default Sidebar;
