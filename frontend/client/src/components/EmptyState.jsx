import React, { useState } from "react";
import MessageInput from "./MessageInput";

export default function EmptyState({
    value,
    onChange,
    onSubmit,
    disabled,
    userName,
}) {
    const [input, setInput] = useState("");

    const suggestions = [
        "What are my rights if I'm arrested in Sri Lanka?",
        "How do I make a police complaint?",
        "Explain how bail works in Sri Lanka.",
        "Summarize Article 13 on arrest & detention.",
    ];

    return (
        <div className="flex flex-col h-full justify-between px-6 sm:px-10 pb-safe">
            {/* Greeting */}
            <div className="pt-14 md:pt-20 text-center">
                <h1 className="text-3xl sm:text-4xl font-bold">
                    <span className="bg-gradient-to-r from-sky-950 via-gray-600 to-slate-700 bg-clip-text text-transparent">
                        Hello {userName}
                    </span>
                </h1>
                <p className="mt-3 text-xl sm:text-2xl text-gray-600">
                    How can I help you today?
                </p>

                {/* Suggestions */}
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-w-4xl mx-auto">
                    {suggestions.map((s, i) => (
                        <button
                            type="button"
                            key={i}
                            onClick={() => {console.log('suggestion click', s);onSubmit(s);}}   
                            className="group text-left rounded-xl border border-gray-200/70 bg-gradient-to-b from-white to-gray-50 hover:from-white hover:to-white shadow-sm hover:shadow-md transition-all p-4"
                        >
                            <div className="flex items-center gap-3">
                                <div className="shrink-0 rounded-lg p-2 bg-gradient-to-br from-slate-100 to-blue-100 border border-blue-200/40">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-slate-700">
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

            {/* Bottom search bar reusing MessageInput */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 shadow-sm">
                <div className="pb-safe">
                    <MessageInput
                        value={value}
                        onChange={onChange}
                        onSubmit={onSubmit}
                        disabled={disabled}
                    />
                </div>
            </div>
        </div>
    );
}
