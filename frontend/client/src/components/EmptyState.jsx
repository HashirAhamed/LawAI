import React, { useState } from "react";

export default function EmptyState({ onSend, userName = "there" }) {
    const [input, setInput] = useState("");

    const suggestions = [
        "What are my rights if I'm arrested in Sri Lanka?",
        "How do I make a police complaint?",
        "Explain how bail works in Sri Lanka.",
        "Summarize Article 13 on arrest & detention.",
    ];

    const handleSubmit = (e) => {
        e.preventDefault();
        const text = input.trim();
        if (!text) return;
        onSend(text);
        setInput("");
    };

    return (
        <div className="flex flex-col h-full justify-between px-6 sm:px-10 pb-safe">
            {/* --- Greeting --- */}
            <div className="pt-14 md:pt-20 text-center">
                <h1 className="text-3xl sm:text-4xl font-bold">
                    <span className="bg-gradient-to-r from-sky-950 via-gray-600 to-slate-700 bg-clip-text text-transparent">
                        Hello {userName}
                    </span>
                </h1>
                <p className="mt-3 text-xl sm:text-2xl text-gray-600">
                    How can I help you today?
                </p>

                {/* --- Suggestion Cards --- */}
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-w-4xl mx-auto">
                    {suggestions.map((s, i) => (
                        <button
                            key={i}
                            onClick={() => onSend(s)}
                            className="group text-left rounded-xl border border-gray-200/70 bg-gradient-to-b from-white to-gray-50 hover:from-white hover:to-white shadow-sm hover:shadow-md transition-all p-4"
                        >
                            <div className="flex items-center gap-3">
                                <div className="shrink-0 rounded-lg p-2 bg-gradient-to-br from-slate-100 to-blue-100 border border-blue-200/40">
                                    <svg
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                        className="text-slate-700"
                                    >
                                        <path d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2zm1 14h-2v-2h2v2zm0-4h-2V6h2v6z" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="font-medium text-gray-900">
                                        {s.length > 48 ? s.slice(0, 48) + "…" : s}
                                    </div>
                                    <div className="text-sm text-gray-500 mt-0.5">
                                        Tap to ask this question
                                    </div>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* --- Bottom Search Bar --- */}
            <div className="mt-auto mb-6 sm:mb-8 flex justify-center">
                <form
                    onSubmit={handleSubmit}
                    className="w-full sm:w-[85%] md:w-[70%] flex items-center bg-white border border-gray-200 rounded-full shadow-sm px-4 py-2 focus-within:ring-2 focus-within:ring-stone-800 transition-all"
                >
                    <input
                        type="text"
                        placeholder="Ask something..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="flex-grow border-none outline-none bg-transparent text-gray-700 placeholder-gray-400 text-base"
                    />
                    <button
                        type="submit"
                        className="ml-2 text-stone-900 hover:text-stone-600 transition-colors"
                        title="Send"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                            width="20"
                            height="20"
                        >
                            <path d="M2.94 17.94a.75.75 0 0 1-.68-1.03l2.58-6.45-2.58-6.37A.75.75 0 0 1 3.9 3.1l14 7a.75.75 0 0 1 0 1.34l-14 7a.74.74 0 0 1-.32.08z" />
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    );
}
