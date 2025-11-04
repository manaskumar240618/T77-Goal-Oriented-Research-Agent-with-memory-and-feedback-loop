// frontend/src/App.js
import React, { useState } from 'react';
import axios from 'axios';
import './App.css'; 

// This is K's backend server address!
const API_URL = 'http://localhost:8000/api/v1/chat';

function App() {
  const [query, setQuery] = useState(''); // This is the text in the input box
  const [response, setResponse] = useState('...'); // This is the agent's answer
  const [isLoading, setIsLoading] = useState(false);

  // This function runs when you click "Send"
  const handleSubmit = async (e) => {
    e.preventDefault(); // Stops the page from reloading
    setIsLoading(true);
    setResponse('Agent is thinking...');

    try {
      // 1. Send the user's "query" to K's backend
      const res = await axios.post(API_URL, {
        query: query 
      });

      // 2. Get the "answer" back from the backend
      setResponse(res.data.answer);

    } catch (error) {
      console.error("Error connecting to backend:", error);
      setResponse('Error: Could not connect to backend. Is it running?');
    }

    // 3. Clear the input box and re-enable the button
    setQuery('');
    setIsLoading(false);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h2>Goal-Oriented Research Agent</h2>

        {/* This box shows the agent's response */}
        <div style={{ border: '1px solid gray', padding: '10px', minHeight: '100px', width: '80%', margin: '20px', backgroundColor: 'white', color: 'black' }}>
          <p>Agent: {response}</p>
        </div>

        {/* This is the input form */}
        <form onSubmit={handleSubmit} style={{ width: '80%' }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type your question..."
            style={{ width: '70%', padding: '10px' }}
            disabled={isLoading}
          />
          <button type="submit" style={{ width: '28%', padding: '10px' }} disabled={isLoading}>
            {isLoading ? '...' : 'Send'}
          </button>
        </form>

      </header>
    </div>
  );
}

export default App;