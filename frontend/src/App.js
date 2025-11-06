// frontend/src/App.js
import React, { useState, useEffect, useRef } from 'react';
import './App.css'; 
import { 
  FiPlus, FiClock, FiSettings, FiLogOut, FiMoon, FiSearch, FiUser,
  FiSun, FiX, FiTrash2, FiDownload, FiClipboard // Added all new icons
} from 'react-icons/fi';


function App() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]); 
  const [isLoading, setIsLoading] = useState(false);
  const [savedHistory, setSavedHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(true); 
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // --- NEW: State for "Memory" toggle (cosmetic for demo) ---
  const [isMemoryEnabled, setIsMemoryEnabled] = useState(true);

  
  const messagesEndRef = useRef(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" }); 
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]); 


  const handleNewChat = () => {
    if (messages.length > 0) {
      const newHistoryItem = {
        id: Date.now(),
        title: messages[0].text.substring(0, 25) + "...", 
        messages: messages 
      };
      setSavedHistory(prevHistory => [newHistoryItem, ...prevHistory]); 
    }
    setMessages([]); 
  };

  const handleLoadHistory = (chatId) => {
    const chatToLoad = savedHistory.find(chat => chat.id === chatId);
    if (!chatToLoad) return; 

    if (messages.length > 0) {
      const currentChat = {
        id: Date.now(),
        title: messages[0].text.substring(0, 25) + "...",
        messages: messages
      };
      setSavedHistory(prev => [currentChat, ...prev.filter(c => c.id !== chatId)]);
    } else {
      setSavedHistory(prev => prev.filter(c => c.id !== chatId));
    }
    
    setMessages(chatToLoad.messages);
  };

  const handleToggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  // --- NEW: Settings Modal Functions ---
  const handleToggleMemory = () => {
    setIsMemoryEnabled(!isMemoryEnabled);
    // For demo: This just toggles the UI.
    // A real version would send this state to the backend.
  };

  const handleClearAllHistory = () => {
    setSavedHistory([]);
    // We could also clear the backend 'feedback_log.jsonl' here
    // but for now, we'll just clear the UI.
  };

  const handleDeleteChat = (e, chatId) => {
    e.stopPropagation(); // Stop it from loading the chat
    setSavedHistory(prev => prev.filter(c => c.id !== chatId));
  };
  
  // Helper function to format the chat
  const formatChatAsTXT = () => {
    return messages.map(msg => {
      const prefix = msg.sender === 'user' ? 'You' : 'Agent';
      let sourceText = '';
      if (msg.sources && msg.sources.length > 0) {
        sourceText = "\n  [Sources:\n" + 
          msg.sources.map(s => `    - ${s.content.substring(0, 70)}...`).join("\n") + 
          "\n  ]";
      }
      return `${prefix}: ${msg.text}${sourceText}`;
    }).join('\n\n');
  };

  const handleExportTXT = () => {
    const text = formatChatAsTXT();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'intellecta_chat.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyToClipboard = () => {
    const text = formatChatAsTXT();
    // Use document.execCommand for iFrame compatibility
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      alert('Chat copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
    document.body.removeChild(textArea);
  };

  // --- (Feedback function is unchanged) ---
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

  // --- (Submit function is unchanged) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: query,
      sender: 'user', 
      sources: [] 
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
        sources: data.sources || [] 
      };
      
      setMessages(prev => [...prev, aiMessage]); 

    } catch (error) {
      console.error('Error fetching chat response:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Error: Could not connect to the backend or Ollama. Please check server status.',
        sender: 'ai',
        feedbackSent: true, 
        sources: []
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const isChatActive = messages.length > 0;

  const filteredHistory = savedHistory.filter(chat => {
    if (searchTerm === '') return true; 
    const lowerSearch = searchTerm.toLowerCase();
    if (chat.title.toLowerCase().includes(lowerSearch)) return true;
    return chat.messages.some(msg => 
      msg.text.toLowerCase().includes(lowerSearch)
    );
  });


  return (
    <div className={isDarkMode ? "App" : "App light-mode"}>
      
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
              
              {/* --- UPDATED: History now has a delete button --- */}
              {filteredHistory.map((chat) => (
                <li key={chat.id} className="history-item">
                  <button 
                    className="history-load-btn"
                    onClick={() => handleLoadHistory(chat.id)}
                    title={chat.title}
                  >
                    <FiClock /> {chat.title}
                  </button>
                  <button 
                    className="history-delete-btn" 
                    onClick={(e) => handleDeleteChat(e, chat.id)}
                    title="Delete chat"
                  >
                    <FiTrash2 />
                  </button>
                </li>
              ))}
              
            </ul>
          </nav>
        </div>
        <div className="sidebar-bottom">
          <nav className="sidebar-menu">
            <ul>
              <li>
                <button onClick={() => setIsSettingsOpen(true)}>
                  <FiSettings /> Settings
                </button>
              </li>
              <li>
                <button><FiLogOut /> Log out</button>
              </li>
              <li>
                <button onClick={handleToggleDarkMode}>
                  {isDarkMode ? <FiMoon /> : <FiSun />}
                  {isDarkMode ? "Dark mode" : "Light mode"}
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <div className="main-content">
        <div className="top-search-bar">
          <div className="search-input-wrapper">
            <FiSearch />
            <input 
              type="text" 
              placeholder="Search previous topics or answers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="profile-icon">
            <FiUser />
          </div>
        </div>

        {!isChatActive ? (
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
          <div className="chat-container">
            <div className="chat-messages">
              {messages.map((msg) => (
                <div key={msg.id} className={`message-bubble ${msg.sender}`}>
                  <p>{msg.text}</p>
                  
                  {msg.sender === 'ai' && msg.sources.length > 0 && (
                    <div className="sources-container">
                      <strong>Sources:</strong>
                      {msg.sources.map((source, index) => (
                        <div key={index} className="source-item">
                          <p>...{source.content.substring(0, 150)}...</p>
                          <span>(From: {source.source})</span>
                        </div>
                      ))}
                    </div>
                  )}

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
              <div ref={messagesEndRef} /> 
            </div>

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

      {/* --- NEW: Settings Modal with functional buttons --- */}
      {isSettingsOpen && (
        <div className="settings-overlay" onClick={() => setIsSettingsOpen(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal-header">
              <h2>Settings</h2>
              <button className="close-btn" onClick={() => setIsSettingsOpen(false)}>
                <FiX />
              </button>
            </div>
            
            {/* This replaces the placeholder text */}
            <div className="settings-modal-content">
              
              <h3>Memory Control</h3>
              <div className="setting-row">
                <span>Enable RAG Memory</span>
                <label className="toggle-switch">
                  <input type="checkbox" checked={isMemoryEnabled} onChange={handleToggleMemory} />
                  <span className="slider"></span>
                </label>
              </div>
              <div className="setting-row">
                <span>Clear All Chat History</span>
                <button className="modal-btn danger" onClick={handleClearAllHistory}>
                  <FiTrash2 /> Clear
                </button>
              </div>

              <h3>Export Current Chat</h3>
              <div className="setting-row">
                <span>Export as .TXT</span>
                <button className="modal-btn" onClick={handleExportTXT} disabled={!isChatActive}>
                  <FiDownload /> Export
                </button>
              </div>
              <div className="setting-row">
                <span>Copy to Clipboard</span>
                <button className="modal-btn" onClick={handleCopyToClipboard} disabled={!isChatActive}>
                  <FiClipboard /> Copy
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;