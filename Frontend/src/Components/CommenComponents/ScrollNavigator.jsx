// src/components/ScrollNavigator.jsx
import React, { useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import ChatBot from "./ChatBot";

const ScrollNavigator = () => {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      <div className="fixed right-4 bottom-5 z-30 flex flex-col items-center gap-3">
        <a
          href="https://wa.me/919876543210"
          target="_blank"
          rel="noreferrer"
          className="w-12 h-12 flex items-center justify-center bg-primary text-white rounded-full shadow-md hover:bg-primary-light transition"
          aria-label="Chat with us on WhatsApp"
          title="WhatsApp"
        >
          <FaWhatsapp size={25} aria-hidden="true" />
        </a>
        {/* Floating ChatBot Toggle Button */}
        <button
          className="chatbot-fab relative"
          onClick={() => setChatOpen((prev) => !prev)}
          aria-label="Open AI Shopping Assistant"
          title="AI Shopping Assistant"
        >
          {chatOpen ? (
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          )}
          {!chatOpen && <span className="chatbot-fab-pulse" />}
        </button>
      </div>

      <ChatBot isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
};

export default ScrollNavigator;