// frontend/src/App.js
import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [query, setQuery] = useState('');
  // Messages will now be objects: { id, text, sender, feedbackSent }
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Function to scroll to the bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Function to send feedback
  const sendFeedback = async (messageId, feedback) => {
    // Find the message in our state
    const message = messages.find(m => m.id === messageId);
    // Find the user query that came before this message
    const messageIndex = messages.findIndex(m => m.id === messageId);
    const userQuery = messages[messageIndex - 1];

    if (!message || !userQuery) {
      console.error("Could not find message or query for feedback");
      return;
    }

    console.log(`Sending feedback: ${feedback} for message ${messageId}`);

    try {
      await fetch('http://localhost:8000/api/v1/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userQuery.text,
          response: message.text,
          feedback: feedback, // "positive" or "negative"
        }),
      });

      // Update the message to mark feedback as sent
      setMessages(prevMessages =>
        prevMessages.map(m =>
          m.id === messageId ? { ...m, feedbackSent: true } : m
        )
      );
    } catch (error) {
      console.error('Error sending feedback:', error);
    }
  };

  // Function to handle chat submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: query,
      sender: 'user',
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setQuery('');

    try {
      // Send query to the backend
      const res = await fetch('http://localhost:8000/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query }),
      });
      const data = await res.json();

      // Add AI response
      const aiMessage = {
        id: Date.now() + 1, // Unique ID for the AI message
        text: data.answer,
        sender: 'ai',
        feedbackSent: false, // AI messages can receive feedback
      };
      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('Error fetching chat response:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: 'Error: Could not connect to the backend.',
        sender: 'ai',
        feedbackSent: true, // Don't allow feedback on error messages
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h2>T77 Research Agent</h2>
      </header>
      <div className="chat-container">
        <div className="chat-box">
          {messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.sender}`}>
              <p>{msg.text}</p>
              {/* --- NEW FEEDBACK LOGIC --- */}
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
              {/* --- END NEW FEEDBACK LOGIC --- */}
            </div>
          ))}
          {isLoading && (
            <div className="message ai">
              <p><i>Thinking...</i></p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <form className="chat-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Ask your agent a question..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" disabled={isLoading}>Send</button>
        </form>
      </div>
    </div>
  );
}

export default App;