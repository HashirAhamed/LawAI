// src/components/Sidebar.jsx
import React from "react";
import { FaRegTrashAlt } from "react-icons/fa";
import { FiEdit2, FiCheck, FiX } from "react-icons/fi";
import logo from "../../public/logo1.png";

function Sidebar({
  conversations = [],
  activeConversation,
  onNewChat,
  onSelect,
  onDelete,
  onRename,   // <-- NEW: (id, title) => Promise|void
  onClose,    // optional for mobile close button
}) {
  const [editingId, setEditingId] = React.useState(null);
  const [draftTitle, setDraftTitle] = React.useState("");

  const startEdit = (chat) => {
    setEditingId(chat._id);
    setDraftTitle(chat.title || "Untitled Chat");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftTitle("");
  };

  const commitEdit = async (chat) => {
    const next = draftTitle.trim();
    if (!next || next === chat.title) {
      cancelEdit();
      return;
    }
    try {
      await onRename?.(chat._id, next);
    } finally {
      cancelEdit();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-300 shadow-sm">
      {/* --- HEADER --- */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 sticky top-0 bg-white z-10">
        <div className="flex items-center gap-2">
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
          className="bg-stone-900 text-white rounded-full px-3 py-1 text-sm hover:bg-stone-700 transition-colors"
        >
          New
        </button>
      </div>

      {/* --- CHAT LIST --- */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        {conversations.length === 0 ? (
          <p className="text-gray-500 text-sm p-4 text-center">
            No chats yet. <br />
            Click <strong>New</strong> to start one.
          </p>
        ) : (
          conversations.map((chat) => {
            const isActive = activeConversation?._id === chat._id;
            const isEditing = editingId === chat._id;

            return (
              <div
                key={chat._id}
                onClick={() => !isEditing && onSelect(chat)}
                className={`group flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-all duration-150 ${
                  isActive
                    ? "bg-neutral-200 text-gray-800 font-medium"
                    : "hover:bg-gray-100 text-gray-800"
                }`}
                title={chat.title}
              >
                {/* Title / Rename input */}
                <div className="flex-1 pr-2">
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        autoFocus
                        value={draftTitle}
                        onChange={(e) => setDraftTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit(chat);
                          if (e.key === "Escape") cancelEdit();
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-stone-600"
                      />
                      <button
                        className="p-1 rounded hover:bg-gray-200 text-green-700"
                        title="Save"
                        onClick={(e) => {
                          e.stopPropagation();
                          commitEdit(chat);
                        }}
                      >
                        <FiCheck />
                      </button>
                      <button
                        className="p-1 rounded hover:bg-gray-200 text-gray-600"
                        title="Cancel"
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelEdit();
                        }}
                      >
                        <FiX />
                      </button>
                    </div>
                  ) : (
                    <span
                      className="truncate block"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        startEdit(chat);
                      }}
                    >
                      {chat.title || "Untitled Chat"}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {!isEditing && (
                    <button
                      className="opacity-70 hover:opacity-100 text-gray-600 hover:text-gray-800 p-1 rounded"
                      title="Rename chat"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(chat);
                      }}
                    >
                      <FiEdit2 size={16} />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(chat);
                    }}
                    className="text-red-500 hover:text-red-600 opacity-80 hover:opacity-100 p-1 rounded"
                    title="Delete chat"
                  >
                    <FaRegTrashAlt size={15} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* --- FOOTER --- */}
      <div className="px-4 py-3 flex items-center justify-center text-lg text-slate-900 border-t border-gray-200">
        <img src={logo} alt="Logo" width={36} height={36} className="mr-2" />
        <h1 className="font-semibold">Legalynx</h1>
      </div>
    </div>
  );
}

export default Sidebar;
