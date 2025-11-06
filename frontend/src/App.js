// frontend/src/App.js
import React, { useState, useEffect, useRef } from 'react';
import './App.css'; 
// --- NEW: Import icons from react-icons ---
// We need to install this! See Step 4.
import { 
  FiPlus, FiClock, FiSettings, FiLogOut, FiMoon, FiSearch, FiUser
} from 'react-icons/fi';


function App() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]); 
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" }); 
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]); 


  const handleNewChat = () => {
    setMessages([]); 
  };

  const sendFeedback = async (messageId, feedback) => {
    const message = messages.find(m => m.id === messageId);
    const messageIndex = messages.findIndex(m => m.id === messageId);
    const userQuery = messages[messageIndex - 1]; 

    if (!message || !userQuery) {
      console.error("Could not find message or query for feedback");
      return;
    }

    try {
      await fetch('http://localhost:8000/api/v1/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userQuery.text,
          response: message.text,
          feedback: feedback,
        }),
      });

      setMessages(prevMessages =>
        prevMessages.map(m =>
          m.id === messageId ? { ...m, feedbackSent: true } : m
        )
      );
    } catch (error) {
      console.error('Error sending feedback:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: query,
      sender: 'user', 
    };
    
    const newMessages = [...messages, userMessage];
    setMessages(newMessages); 
    setIsLoading(true);
    setQuery(''); 

    try {
      const res = await fetch('http://localhost:8000/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: query,
          chat_history: newMessages.slice(0, -1) 
        }),
      });
      const data = await res.json();

      const aiMessage = {
        id: Date.now() + 1,
        text: data.answer,
        sender: 'ai', 
        feedbackSent: false,
      };
      
      setMessages(prev => [...prev, aiMessage]); 

    } catch (error) {
      console.error('Error fetching chat response:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Error: Could not connect to the backend or Ollama. Please check server status.',
        sender: 'ai',
        feedbackSent: true, 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const isChatActive = messages.length > 0;

  return (
    <div className="App">
      
      {/* --- Sidebar --- */}
      <div className="sidebar">
        <div>
          <div className="sidebar-header">
            <div className="logo-circle">O</div>
            <h2>Intellecta</h2>
          </div>
          <nav className="sidebar-menu">
            <ul>
              <li>
                <button className="new-chat-button" onClick={handleNewChat}>
                  <FiPlus /> New Chat
                </button>
              </li>
              <li>
                <button><FiClock /> History</button>
              </li>
            </ul>
          </nav>
        </div>

        <div className="sidebar-bottom">
          <nav className="sidebar-menu">
            <ul>
              <li>
                <button><FiSettings /> Settings</button>
              </li>
              <li>
                <button><FiLogOut /> Log out</button>
              </li>
              <li>
                <button><FiMoon /> Dark mode</button>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* --- Main Content Area --- */}
      <div className="main-content">
        {/* Top Search Bar (Always visible) */}
        <div className="top-search-bar">
          <div className="search-input-wrapper">
            <FiSearch />
            <input type="text" placeholder="Search previous topics or answers..." />
          </div>
          <div className="profile-icon">
            <FiUser />
          </div>
        </div>

        {/* Conditional Rendering: Welcome Screen vs. Active Chat */}
        {!isChatActive ? (
          // --- Welcome Screen ---
          <div className="welcome-screen">
            <h1>What Do You Want To Know Today?</h1>
            <form onSubmit={handleSubmit} className="initial-chat-input-wrapper">
              <input
                type="text"
                placeholder="Start typing your query..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={isLoading}
              />
              <FiSearch onClick={handleSubmit} style={{ cursor: 'pointer' }} />
            </form>
          </div>
        ) : (
          // --- Active Chat Interface ---
          <div className="chat-container">
            <div className="chat-messages">
              {messages.map((msg) => (
                <div key={msg.id} className={`message-bubble ${msg.sender}`}>
                  <p>{msg.text}</p>
                  {msg.sender === 'ai' && !msg.feedbackSent && (
                    <div className="feedback-buttons">
                      <button onClick={() => sendFeedback(msg.id, 'positive')}>👍</button>
                      <button onClick={() => sendFeedback(msg.id, 'negative')}>👎</button>
                    </div>
                  )}
                  {msg.sender === 'ai' && msg.feedbackSent && (
                    <div className="feedback-buttons">
                      <p><i>Feedback received!</i></p>
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="message-bubble ai">
                  <p><i>Thinking...</i></p>
                </div>
              )}
              <div ref={messagesEndRef} /> {/* For auto-scrolling */}
            </div>

            {/* Chat Input Area (for active chat) */}
            <form className="chat-input-area" onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Ask your agent a question..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={isLoading}
              />
              <button type="submit" disabled={isLoading}>Send</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;