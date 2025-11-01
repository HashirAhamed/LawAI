import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
// import './App.css'; // Removed this import

// Define the backend URL
const API_URL = 'http://localhost:5000/api';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load chat history when the component mounts
  useEffect(() => {
    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        const res = await axios.get(`${API_URL}/messages`);
        setMessages(res.data);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
      setIsLoading(false);
    };
    fetchMessages();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = {
      role: 'user',
      parts: [{ text: input }],
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await axios.post(`${API_URL}/chat`, {
        message: input,
      });
      
      const aiMessage = res.data;
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const aiErrorMessage = error.response?.data?.parts?.[0]?.text || "Sorry, I ran into an error. Please try again.";
      setMessages((prev) => [...prev, {
        role: 'model',
        parts: [{ text: aiErrorMessage }]
      }]);
    }
    setIsLoading(false);
  };

  // Added a wrapper div to apply global screen styles
  return (
    <div className="bg-gray-100 h-screen w-full flex justify-center items-center font-sans">
      <div className="w-[90%] max-w-3xl h-[90vh] border border-gray-300 rounded-lg bg-white flex flex-col shadow-lg">
        
        {/* --- LEGAL DISCLAIMER --- */}
        <div className="p-3 px-4 bg-yellow-50 border-b border-yellow-200 text-yellow-800 text-center text-sm">
          <p className="m-0 leading-snug">
            <strong>Disclaimer:</strong> This is an AI assistant. Information is for
            educational purposes only and is **not legal advice**. Always consult a
            qualified lawyer for your specific situation.
          </p>
        </div>
        {/* ------------------------ */}

        <div className="flex-grow overflow-y-auto p-4 space-y-3 flex flex-col">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`py-2 px-3.5 rounded-xl max-w-[80%] break-words leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white self-end'
                  : 'bg-gray-200 text-gray-900 self-start'
              }`}
            >
              {/* Use dangerouslySetInnerHTML to render <br /> tags */}
              <p
                className="m-0"
                dangerouslySetInnerHTML={{
                  __html: `<strong>${
                    msg.role === 'user' ? 'You' : 'AI'
                  }:</strong> ${msg.parts[0].text.replace(/\n/g, '<br />')}`,
                }}
              ></p>
            </div>
          ))}
          {isLoading && (
            <div className="py-2 px-3.5 rounded-xl max-w-[80%] break-words leading-relaxed bg-gray-200 text-gray-900 self-start">
              <p className="m-0">
                <strong>AI:</strong> Researching...
              </p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <form className="flex p-4 border-t border-gray-300" onSubmit={handleSubmit}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about Sri Lankan law..."
            disabled={isLoading}
            className="flex-grow border border-gray-300 rounded-full py-2 px-4 text-base mr-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 text-white border-none rounded-full py-2 px-5 text-base cursor-pointer hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;

