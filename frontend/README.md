# 🧠 Intellica: Goal-Oriented Research Agent

<div align="center">
  <img src="frontend/public/logo-final.jpg" alt="Intellica Logo" width="120" height="120" style="border-radius: 20px;">
  <h3>Autonomous Research & Analysis Engine</h3>
  <p>
    Built with <b>LangGraph</b>, <b>Gemini 2.0 Flash</b>, and <b>React</b>.
  </p>
</div>

---

## 🌟 Project Overview

**Intellica** is a next-generation AI research application designed to eliminate hallucinations and shallow responses found in standard chatbots. Instead of simply generating text, Intellica behaves like an **autonomous research agent** that:

- Plans multi-step research
- Searches the live internet
- Reflects on findings
- Produces deep analytical reports

It also includes a **Critical Thinking Mode** that challenges assumptions and a **Mind Map Generator** that visualizes topic relationships.

---

## ✨ Key Features

### 🤖 Agentic Reasoning Engine  
Unlike linear chatbots, Intellica follows a cyclical workflow:  
**Plan → Search → Reflect → Synthesize**  
It autonomously determines when to search the web and when to finalize an answer.

### 🛡️ Critical Thinking Mode  
A toggleable "Devil's Advocate" module that challenges user assumptions, evaluates counter-evidence, and highlights risks or flaws.

### 🌐 Real-Time Web Grounding  
Integrated with **Tavily Search API** for live:

- News
- Stock prices
- Research papers
- Real-world facts

### 🗺️ Visual Knowledge Graph  
Generates an interactive **Mind Map** for each query to show connections and branching topics.

### 📄 Professional Reporting  
A built-in **PDF Generation Engine** using ReportLab lets users export full research sessions as formatted documents.

### 🎨 Modern User Experience  

- Elegant **Black-Glass UI**  
- Built with **React + Tailwind**
- Thread-based **persistent memory**
- Auto-suggests **three follow-up research angles** after each answer

---

## 🛠️ Technology Stack

### Backend (The Brain)
- **Python 3.11+**
- **FastAPI** (async)
- **LangGraph** (state machine)
- **Google Gemini 2.0 Flash**
- **Tavily AI Search**
- **ReportLab** (PDF engine)

### Frontend (The Interface)
- **React (Vite)**
- **Tailwind CSS**
- **Lucide Icons**
- **Axios**
- **React Hooks** (state management)

---

## ⚙️ Installation & Setup

### 1. Prerequisites
- Python **3.11+**
- Node.js **v18+**
- API keys:
  - `GOOGLE_API_KEY`
  - `TAVILY_API_KEY`

---

## 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file and add:
# GOOGLE_API_KEY="your_key_here"
# TAVILY_API_KEY="your_key_here"

# Start backend server
python -m uvicorn main:app --reload

# Open a new terminal
cd frontend

# Install dependencies
npm install

# Start the React dev server
npm run dev

pip install -r requirements.txt

gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
