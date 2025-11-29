import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { 
  Send, Menu, Plus, MessageSquare, User, 
  Mic, MoreHorizontal, Edit, 
  Trash2, ChevronDown, LogOut, X, Settings,
  Lightbulb, Compass, Code, PenTool,
  ThumbsUp, ThumbsDown, Sun, Moon, Shield, Database, Lock, CreditCard,
  Download, AlertTriangle, Smartphone, Globe, Search,
  Cpu, Layers, Zap, Rocket, Atom, Sparkles, Network, FileText
} from 'lucide-react'

function App() {
  // --- STATE ---
  const [query, setQuery] = useState("")
  const [messages, setMessages] = useState([])
  const [history, setHistory] = useState([]) 
  const [activeChatId, setActiveChatId] = useState(null) 
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [threadId, setThreadId] = useState(Date.now().toString())
  
  // New Features State
  const [isCriticalMode, setIsCriticalMode] = useState(false)
  const [mindMapData, setMindMapData] = useState(null)
  const [showMindMap, setShowMindMap] = useState(false)

  // Settings & Theme
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [activeSettingsTab, setActiveSettingsTab] = useState('general')
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return true;
    }
    return true; 
  });

  const chatEndRef = useRef(null)

  // --- EFFECTS ---
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])


  // --- LOGIC ---

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const saveCurrentChatToHistory = () => {
    if (messages.length === 0) return;
    const chatTitle = messages[0].content.slice(0, 30) + (messages[0].content.length > 30 ? "..." : "")
    const newChatSession = { 
        id: activeChatId || Date.now(), 
        threadId: threadId,
        title: chatTitle, 
        date: 'Today', 
        messages: [...messages] 
    }
    const filteredHistory = history.filter(chat => chat.id !== newChatSession.id);
    setHistory([newChatSession, ...filteredHistory])
  }

  const startNewChat = () => {
    if (messages.length > 0) { saveCurrentChatToHistory() }
    setMessages([]); setQuery(""); setActiveChatId(null)
    setThreadId(Date.now().toString())
  }

  const loadChat = (chatSession) => {
    if (messages.length > 0) { saveCurrentChatToHistory() }
    setActiveChatId(chatSession.id); setMessages(chatSession.messages)
    setThreadId(chatSession.threadId || Date.now().toString())
  }

  const handleFeedback = (index, type) => {
    const updatedMessages = [...messages]
    if (updatedMessages[index].feedback === type) { updatedMessages[index].feedback = null } 
    else { updatedMessages[index].feedback = type }
    setMessages(updatedMessages)
  }

  const filteredHistory = history.filter(chat => 
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSend = async (textOverride) => {
    const textToSend = textOverride || query
    if (!textToSend.trim()) return
    
    const newMessages = [...messages, { role: 'user', content: textToSend }]
    setMessages(newMessages); setQuery(""); setLoading(true)
    
    try {
      const result = await axios.post("https://intellica-backend.onrender.com/chat", { 
          query: textToSend,
          thread_id: threadId,
          critical_mode: isCriticalMode
      })
      
      setMessages(prev => [...prev, { 
          role: 'ai', 
          content: result.data.response, 
          suggestions: result.data.suggestions || [], 
          feedback: null 
      }])
    } catch (error) {
      console.error("Error:", error)
      setMessages(prev => [...prev, { role: 'ai', content: "Error: Could not connect to the Agent." }])
    } finally { setLoading(false) }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  // --- FEATURE FUNCTIONS ---
  const handleExportData = () => {
    const dataStr = JSON.stringify(history, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = "intellica-history.json";
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  }

  const handleClearHistory = () => {
    if (confirm("Are you sure? This will delete all your research history.")) {
        setHistory([]); setMessages([]); setActiveChatId(null); startNewChat();
    }
  }

  const handleDownloadReport = async () => {
    try {
        const response = await axios.post("https://intellica-backend.onrender.com/generate_report", { chat_history: messages }, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url; link.setAttribute('download', 'Intellica_Report.pdf');
        document.body.appendChild(link); link.click();
    } catch (error) { alert("Failed to generate report."); }
  }

  const openMindMap = (msg) => {
      setMindMapData({ center: "Key Concept", nodes: msg.suggestions || ["No data"] });
      setShowMindMap(true);
  }

  // --- DATA ---
  const suggestions = [
    { icon: <Atom size={24} className="text-purple-500 dark:text-purple-400" />, text: "Latest breakthroughs in Quantum Computing?" },
    { icon: <Cpu size={24} className="text-yellow-500 dark:text-yellow-400" />, text: "What is the current state of AGI development?" },
    { icon: <Zap size={24} className="text-red-500 dark:text-red-400" />, text: "New developments in Solid-State Batteries" },
    { icon: <Rocket size={24} className="text-blue-500 dark:text-blue-400" />, text: "Update on SpaceX Starship launch schedule" },
  ]

  const settingsTabs = [
    { id: 'general', label: 'General', icon: <Settings size={18} /> },
    { id: 'data', label: 'Data controls', icon: <Database size={18} /> },
    { id: 'security', label: 'Security', icon: <Shield size={18} /> },
    { id: 'account', label: 'About Intellica', icon: <Cpu size={18} /> },
  ]

  // --- RENDER ---
  return (
    <div className={`flex h-screen transition-colors duration-300 ease-in-out font-sans overflow-hidden ${isDarkMode ? 'bg-[#212121] text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      
      {/* --- SIDEBAR --- */}
      <div className={`${sidebarOpen ? 'w-[280px]' : 'w-0'} transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)] flex flex-col flex-shrink-0 overflow-hidden relative border-r ${isDarkMode ? 'bg-[#171717] border-white/5' : 'bg-gray-100 border-gray-200'}`}>
        
        {/* BRANDING Header with Logo - WHITE ROBOT ON BLACK BACKGROUND */}
        <div className={`px-6 pt-8 pb-4 flex items-center gap-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            <div className="h-10 w-10 rounded-xl overflow-hidden flex items-center justify-center bg-black shadow-lg border border-white/10">
                <img 
                    src="/logo-final.jpg" 
                    alt="Intellica Logo" 
                    className="h-full w-full object-cover" 
                />
            </div>
            <span className="font-bold text-2xl tracking-tight">Intellica</span>
        </div>

        {/* Top Section */}
        <div className="px-4 pb-4 space-y-4">
          <button onClick={startNewChat} className={`flex items-center justify-center gap-3 px-4 py-3 w-full rounded-xl transition-all duration-200 active:scale-95 text-sm font-medium ${isDarkMode ? 'bg-[#2f2f2f] hover:bg-[#3f3f3f] text-white' : 'bg-white hover:bg-gray-50 border-gray-300 text-gray-900 shadow-sm'}`}>
             <span>New chat</span>
          </button>

          <div className={`relative flex items-center px-3 py-2.5 rounded-xl transition-colors ${isDarkMode ? 'bg-[#212121] focus-within:bg-[#2f2f2f]' : 'bg-gray-100 focus-within:bg-white border border-transparent focus-within:border-gray-300'}`}>
              <Search size={18} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
              <input
                  type="text"
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full ml-3 bg-transparent border-none focus:ring-0 p-0 text-sm ${isDarkMode ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-500'}`}
              />
          </div>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-hide mt-2">
          {filteredHistory.length === 0 ? (
             <div className={`text-xs px-3 italic ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                 {history.length === 0 ? "No history yet" : "No chats found"}
             </div>
          ) : (
             <div className={`text-xs font-bold uppercase tracking-wider mb-3 px-3 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Recent</div>
          )}
          
          {filteredHistory.map((chat) => (
            <button key={chat.id} onClick={() => loadChat(chat)}
                className={`flex items-center gap-3 px-3 py-3 w-full rounded-lg transition-all duration-200 active:scale-95 text-sm whitespace-nowrap overflow-hidden text-left group mb-1
                    ${activeChatId === chat.id 
                        ? (isDarkMode ? 'bg-[#2f2f2f] text-white' : 'bg-gray-200 text-gray-900 shadow-sm')
                        : (isDarkMode ? 'hover:bg-[#212121] text-gray-400 hover:text-gray-200' : 'hover:bg-gray-200 text-gray-600 hover:text-gray-900')}`}>
              <MessageSquare size={16} className={isDarkMode ? "text-gray-500 group-hover:text-gray-300" : "text-gray-400 group-hover:text-gray-600"} />
              <span className="truncate flex-1">{chat.title}</span>
            </button>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div className={`p-4 border-t ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
            <div className="space-y-1 mb-4">
                <button onClick={() => setSettingsOpen(true)} className={`flex items-center gap-3 px-3 py-2.5 w-full rounded-lg transition-all duration-200 active:scale-95 text-sm font-medium group ${isDarkMode ? 'hover:bg-[#212121] text-gray-300' : 'hover:bg-gray-200 text-gray-700'}`}>
                    <Settings size={18} className={isDarkMode ? "text-gray-400 group-hover:text-white" : "text-gray-500 group-hover:text-gray-900"} />
                    Settings
                </button>
                <button className={`flex items-center gap-3 px-3 py-2.5 w-full rounded-lg transition-all duration-200 active:scale-95 text-sm font-medium text-red-500 hover:bg-red-500/10 dark:hover:bg-red-900/20`}>
                    <LogOut size={18} />
                    Log out
                </button>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/5 dark:border-gray-200/50">
                <button className={`flex items-center gap-3 px-2 py-2 rounded-lg transition-all duration-200 active:scale-95 text-sm flex-1 ${isDarkMode ? 'hover:bg-[#212121] text-white' : 'hover:bg-gray-200 text-gray-900'}`}>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-purple-500 flex items-center justify-center text-xs font-bold text-white shadow-lg">US</div>
                    <div className="font-medium truncate text-left">
                        <div className="leading-tight">User Account</div>
                    </div>
                </button>
                <button onClick={toggleTheme} className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-95 ${isDarkMode ? 'bg-blue-600' : 'bg-gray-300'}`}>
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 ease-spring flex items-center justify-center shadow-sm ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}`}>
                        {isDarkMode ? <Moon size={12} className="text-blue-600" /> : <Sun size={12} className="text-yellow-500" />}
                    </span>
                </button>
            </div>
        </div>
      </div>

      {/* --- MAIN CHAT AREA --- */}
      <div className="flex-1 flex flex-col relative h-full transition-all duration-300 ease-in-out">
        
        {/* Mobile Toggle */}
        <div className={`flex items-center p-4 sm:hidden absolute top-0 left-0 z-10 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`p-2 rounded-lg active:scale-95 transition-all ${isDarkMode ? 'hover:bg-white/10 bg-black/20 backdrop-blur-md' : 'hover:bg-gray-200 bg-white/60 backdrop-blur-md shadow-sm'}`}>
            <Menu size={24} />
          </button>
        </div>

        {/* Desktop Sidebar Toggle */}
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`absolute top-4 left-4 p-2 z-10 hidden sm:block transition-all duration-200 active:scale-95 rounded-lg ${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-[#2f2f2f]' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'}`}>
            <Menu size={20}/>
        </button>

        <div className="flex-1 overflow-y-auto w-full scroll-smooth">
          {messages.length === 0 ? (
            /* Empty State */
            <div className="h-full flex flex-col items-center justify-center p-8 max-w-4xl mx-auto transition-all duration-700 ease-out animate-in fade-in zoom-in-95">
              
              <h2 className={`text-4xl font-bold mb-12 text-center tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>What’s on your mind today?</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full px-4">
                {suggestions.map((card, idx) => (
                  <button key={idx} onClick={() => handleSend(card.text)} className={`p-5 border rounded-2xl transition-all duration-200 active:scale-[0.98] text-left flex flex-col gap-3 group shadow-sm hover:shadow-md ${isDarkMode ? 'border-white/10 hover:bg-[#2f2f2f] bg-[#1e1e1e]' : 'border-gray-200 hover:bg-white bg-white'}`}>
                    <div className="flex justify-between w-full transition-transform group-hover:-translate-y-1 duration-300">{card.icon}</div>
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300 group-hover:text-white' : 'text-gray-600 group-hover:text-gray-900'}`}>{card.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Chat State */
            <div className="flex flex-col w-full py-10 px-4 space-y-8 pb-40">
              {messages.map((msg, idx) => (
                <div key={idx} className={`w-full flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  
                  <div className={`flex max-w-[85%] md:max-w-[75%] gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold shadow-md transform transition-transform hover:scale-110 ${msg.role === 'ai' ? 'bg-gradient-to-br from-green-500 to-emerald-700' : 'bg-gradient-to-br from-blue-600 to-indigo-700'}`}>
                        {msg.role === 'ai' ? 'AI' : 'US'}
                    </div>
                    
                    {/* Message Bubble */}
                    <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`p-4 shadow-sm text-sm leading-relaxed whitespace-pre-wrap transition-all duration-300 
                            ${msg.role === 'user' 
                                ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm' 
                                : (isDarkMode ? 'bg-[#2f2f2f] text-gray-100 border border-white/5 rounded-2xl rounded-tl-sm' : 'bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-tl-sm shadow-md')}`}>
                            {msg.content}
                        </div>

                        {/* Feedback (Agent Only) */}
                        {msg.role === 'ai' && (
                            <div className="mt-3 space-y-3 w-full">
                                {/* Suggestion Chips */}
                                {msg.suggestions && msg.suggestions.length > 0 && (
                                    <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2 duration-500">
                                        {msg.suggestions.map((suggestion, sIdx) => (
                                            <button 
                                                key={sIdx}
                                                onClick={() => handleSend(suggestion)}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-95
                                                    ${isDarkMode 
                                                        ? 'border-white/10 bg-white/5 hover:bg-white/10 text-blue-300' 
                                                        : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-blue-600'}`}
                                            >
                                                <Sparkles size={12} />
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Thumbs Up/Down & Mind Map - Always Visible */}
                                <div className="flex items-center gap-2 px-1">
                                    <button onClick={() => handleFeedback(idx, 'up')} className={`p-1.5 rounded-full transition-all active:scale-90 ${msg.feedback === 'up' ? 'text-green-500 bg-green-500/10' : (isDarkMode ? 'text-gray-500 hover:bg-gray-800' : 'text-gray-400 hover:bg-gray-100')}`}><ThumbsUp size={14} /></button>
                                    <button onClick={() => handleFeedback(idx, 'down')} className={`p-1.5 rounded-full transition-all active:scale-90 ${msg.feedback === 'down' ? 'text-red-500 bg-red-500/10' : (isDarkMode ? 'text-gray-500 hover:bg-gray-800' : 'text-gray-400 hover:bg-gray-100')}`}><ThumbsDown size={14} /></button>
                                    <button onClick={() => openMindMap(msg)} className={`p-1.5 rounded-full transition-all active:scale-90 ml-2 ${isDarkMode ? 'text-purple-400 hover:bg-purple-500/10' : 'text-purple-500 hover:bg-purple-50'}`} title="View Mind Map"><Network size={14} /></button>
                                </div>
                            </div>
                        )}
                    </div>

                  </div>
                </div>
              ))}
              
              {loading && (
                <div className="w-full flex justify-start">
                    <div className="flex max-w-[85%] gap-4 flex-row">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-500 to-emerald-700 flex-shrink-0 flex items-center justify-center text-xs font-bold text-white shadow-md animate-pulse">AI</div>
                        <div className={`p-4 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2 ${isDarkMode ? 'bg-[#2f2f2f] border border-white/5' : 'bg-white border border-gray-100'}`}>
                             <div className={`w-2 h-2 rounded-full animate-bounce ${isDarkMode ? 'bg-gray-400':'bg-gray-500'}`}></div>
                             <div className={`w-2 h-2 rounded-full animate-bounce delay-75 ${isDarkMode ? 'bg-gray-400':'bg-gray-500'}`}></div>
                             <div className={`w-2 h-2 rounded-full animate-bounce delay-150 ${isDarkMode ? 'bg-gray-400':'bg-gray-500'}`}></div>
                        </div>
                    </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* INPUT + CRITICAL MODE TOGGLE */}
        <div className={`absolute bottom-0 left-0 w-full pt-6 pb-8 px-4 bg-gradient-to-t ${isDarkMode ? 'from-[#212121] via-[#212121] to-transparent' : 'from-gray-50 via-gray-50 to-transparent'}`}>
          <div className="max-w-3xl mx-auto w-full relative space-y-2">
            
            <div className="flex justify-end px-1">
                <button onClick={() => setIsCriticalMode(!isCriticalMode)} className={`flex items-center gap-2 text-xs font-bold py-1 px-3 rounded-full transition-all duration-300 ${isCriticalMode ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-gray-200 text-gray-500 dark:bg-white/10 dark:text-gray-400'}`}>
                    <Shield size={12} /> {isCriticalMode ? "Critical Mode: ON" : "Critical Mode: OFF"}
                </button>
            </div>

            <div className={`relative flex items-end w-full p-2.5 rounded-2xl border shadow-lg transition-all duration-300 focus-within:ring-2 focus-within:ring-blue-500/20 ${isDarkMode ? 'bg-[#2f2f2f] border-white/10 focus-within:border-gray-500' : 'bg-white border-gray-200 focus-within:border-blue-400'}`}>
              <textarea value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={handleKeyDown} placeholder="Message Intellica..." className={`flex-1 max-h-[200px] min-h-[24px] bg-transparent border-none focus:ring-0 resize-none py-3 px-2 text-base font-medium ${isDarkMode ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`} rows={1} style={{ height: 'auto', minHeight: '48px' }} />
              <button onClick={() => handleSend()} disabled={loading || !query.trim()} className={`p-2.5 ml-2 rounded-xl transition-all duration-200 active:scale-90 shadow-sm ${query.trim() ? (isDarkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800') : (isDarkMode ? 'bg-transparent text-gray-600 cursor-not-allowed' : 'bg-transparent text-gray-300 cursor-not-allowed')}`}>{loading ? <div className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full" /> : <Send size={20} />}</button>
            </div>
            <div className="text-center mt-1"><p className={`text-xs opacity-70 transition-colors ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Intellica can make mistakes. Consider checking important information.</p></div>
          </div>
        </div>
      </div>

      {/* MIND MAP MODAL */}
      {showMindMap && mindMapData && (
          <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className={`relative w-full max-w-3xl h-[500px] rounded-3xl overflow-hidden shadow-2xl flex flex-col ${isDarkMode ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
                  <button onClick={() => setShowMindMap(false)} className="absolute top-4 right-4 p-2 rounded-full bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20"><X size={20}/></button>
                  <div className="p-6 border-b border-white/10"><h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Topic Exploration</h3></div>
                  <div className="flex-1 relative flex items-center justify-center p-10">
                      <div className="relative w-full h-full flex items-center justify-center">
                          <div className="absolute z-10 w-32 h-32 rounded-full bg-blue-600 flex items-center justify-center text-center p-2 text-white font-bold shadow-xl shadow-blue-500/30 animate-in zoom-in duration-500">Main Query</div>
                          {mindMapData.nodes.map((node, i) => {
                              const angle = (i / mindMapData.nodes.length) * 2 * Math.PI;
                              const radius = 160; 
                              const x = Math.cos(angle) * radius;
                              const y = Math.sin(angle) * radius;
                              return (
                                  <div key={i} style={{ transform: `translate(${x}px, ${y}px)` }} className={`absolute w-28 h-28 rounded-full flex items-center justify-center text-center p-2 text-xs font-medium shadow-lg border animate-in zoom-in duration-700 delay-${i*100} ${isDarkMode ? 'bg-[#2f2f2f] border-white/10 text-gray-200' : 'bg-gray-100 border-gray-300 text-gray-800'}`}>{node}</div>
                              )
                          })}
                          {mindMapData.nodes.map((_, i) => {
                               const angle = (i / mindMapData.nodes.length) * 360;
                               return <div key={i} style={{ transform: `rotate(${angle}deg)`, width: '160px' }} className={`absolute h-[2px] left-1/2 top-1/2 origin-left -z-0 ${isDarkMode ? 'bg-white/10' : 'bg-gray-300'}`} />
                          })}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* SETTINGS MODAL */}
      <div className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${settingsOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
        <div className={`relative w-full max-w-4xl h-[650px] rounded-3xl overflow-hidden flex shadow-2xl transform transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${settingsOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'} ${isDarkMode ? 'bg-[#171717] text-gray-100' : 'bg-white text-gray-900'}`}>
            <button onClick={() => setSettingsOpen(false)} className={`absolute top-5 right-5 p-2 rounded-full transition-all duration-200 active:scale-90 z-20 ${isDarkMode ? 'hover:bg-[#2f2f2f] text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'}`}><X size={22} /></button>
            <div className={`w-[280px] border-r py-8 px-5 flex flex-col ${isDarkMode ? 'bg-[#212121] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                <h2 className="text-2xl font-bold mb-8 px-3">Settings</h2>
                <div className="space-y-2">{settingsTabs.map((tab) => (<button key={tab.id} onClick={() => setActiveSettingsTab(tab.id)} className={`flex items-center gap-4 px-4 py-3.5 w-full rounded-xl transition-all duration-200 active:scale-95 text-sm font-semibold text-left ${activeSettingsTab === tab.id ? (isDarkMode ? 'bg-[#2f2f2f] text-white shadow-md' : 'bg-white text-gray-900 shadow-sm border border-gray-100') : (isDarkMode ? 'text-gray-400 hover:bg-[#2f2f2f]/50 hover:text-white' : 'text-gray-600 hover:bg-gray-200/50 hover:text-gray-900')}`}>{tab.icon}{tab.label}</button>))}</div>
            </div>
            <div className="flex-1 p-10 overflow-y-auto scroll-smooth">
                {activeSettingsTab === 'general' && (<div className="space-y-8"><h3 className="text-xl font-bold">General Settings</h3><div className={`p-6 rounded-2xl border flex items-center justify-between ${isDarkMode ? 'border-white/5 bg-[#212121]' : 'border-gray-100 bg-gray-50'}`}><div><span className="font-medium block mb-1">Theme Preference</span><span className="text-xs text-gray-500">Toggle between light and dark visual styles.</span></div><div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide ${isDarkMode ? 'bg-blue-900/20 text-blue-400 border border-blue-900/30' : 'bg-gray-200 text-gray-700 border border-gray-300'}`}>{isDarkMode ? 'Dark Mode' : 'Light Mode'}</div></div></div>)}
                
                {activeSettingsTab === 'data' && (<div className="space-y-8"><h3 className="text-xl font-bold">Data Controls</h3><div className={`p-6 rounded-2xl border ${isDarkMode ? 'border-white/5 bg-[#212121]' : 'border-gray-100 bg-gray-50'}`}><div className="flex items-center justify-between mb-3"><div className="flex items-center gap-4"><div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-500"><FileText size={22} /></div><span className="font-medium">Download Research Report</span></div><button onClick={handleDownloadReport} className={`px-5 py-2.5 rounded-xl text-sm font-semibold border shadow-sm transition-all active:scale-95 ${isDarkMode ? 'border-white/10 hover:bg-[#2f2f2f] text-white' : 'border-gray-200 hover:bg-white bg-white text-gray-800'}`}>Generate PDF</button></div><p className="text-sm text-gray-500 ml-14">Create a formal PDF report of your current research session.</p></div> <div className={`p-6 rounded-2xl border ${isDarkMode ? 'border-white/5 bg-[#212121]' : 'border-gray-100 bg-gray-50'}`}><div className="flex items-center justify-between mb-3"><div className="flex items-center gap-4"><div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-500"><Globe size={22} /></div><span className="font-medium">Export Data</span></div><button onClick={handleExportData} className={`px-5 py-2.5 rounded-xl text-sm font-semibold border shadow-sm transition-all active:scale-95 ${isDarkMode ? 'border-white/10 hover:bg-[#2f2f2f] text-white' : 'border-gray-200 hover:bg-white bg-white text-gray-800'}`}>Export JSON</button></div><p className="text-sm text-gray-500 ml-14">Download raw chat history.</p></div></div>)}
                
                {activeSettingsTab === 'security' && (<div className="space-y-8"><h3 className="text-xl font-bold">Security</h3><div className={`p-6 rounded-2xl border flex items-center justify-between ${isDarkMode ? 'border-white/5 bg-[#212121]' : 'border-gray-100 bg-gray-50'}`}><div className="flex items-center gap-4"><div className="p-2.5 rounded-lg bg-green-500/10 text-green-500"><Smartphone size={22} /></div><div><span className="font-medium block mb-1">Multi-factor authentication</span></div></div><button className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide ${isDarkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-100 text-green-700'}`}>Enabled</button></div></div>)}
                
                {activeSettingsTab === 'account' && (
                    <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
                         <h3 className="text-xl font-bold">About Intellica</h3>
                         {/* Feature 1 */}
                         <div className={`p-6 rounded-2xl border ${isDarkMode ? 'border-white/5 bg-[#212121]' : 'border-gray-100 bg-gray-50'}`}>
                            <div className="flex items-start gap-4">
                                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500"><Cpu size={24}/></div>
                                <div>
                                    <h4 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Agentic Reasoning</h4>
                                    <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Powered by LangGraph and Gemini 2.0 Flash to plan and execute multi-step research.</p>
                                </div>
                            </div>
                         </div>
                         {/* Feature 2 */}
                         <div className={`p-6 rounded-2xl border ${isDarkMode ? 'border-white/5 bg-[#212121]' : 'border-gray-100 bg-gray-50'}`}>
                            <div className="flex items-start gap-4">
                                <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500"><Globe size={24}/></div>
                                <div>
                                    <h4 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Real-Time Web Access</h4>
                                    <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Live internet search via Tavily API to fetch the latest data.</p>
                                </div>
                            </div>
                         </div>
                         {/* Feature 3 */}
                         <div className={`p-6 rounded-2xl border ${isDarkMode ? 'border-white/5 bg-[#212121]' : 'border-gray-100 bg-gray-50'}`}>
                            <div className="flex items-start gap-4">
                                <div className="p-3 rounded-xl bg-red-500/10 text-red-500"><Shield size={24}/></div>
                                <div>
                                    <h4 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Critical Mode</h4>
                                    <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>"Devil's Advocate" engine that challenges assumptions and provides counter-arguments.</p>
                                </div>
                            </div>
                         </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  )
}

export default App
