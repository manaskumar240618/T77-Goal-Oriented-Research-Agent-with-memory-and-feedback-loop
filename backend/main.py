# backend/main.py
import json
import aiofiles
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.llms import Ollama
from langchain.prompts import PromptTemplate
from langchain.chains import RetrievalQA

# --- CONFIGURATION ---
CHROMA_DB_PATH = "./chroma_db"
EMBEDDING_MODEL = "nomic-embed-text"
LLM_MODEL = "llama3"  # The chat model

# --- SETUP ---

# 1. Initialize Embeddings and LLM
print("Initializing models...")
embeddings = OllamaEmbeddings(model=EMBEDDING_MODEL)
llm = Ollama(model=LLM_MODEL)
print("Models initialized.")

# 2. Load the Vector Store
# This connects to your AI's "memory" (the chroma_db folder)
print("Loading vector store...")
try:
    vector_store = Chroma(
        persist_directory=CHROMA_DB_PATH, 
        embedding_function=embeddings
    )
    retriever = vector_store.as_retriever()
    print("Vector store loaded successfully.")
except Exception as e:
    print(f"Error loading vector store: {e}")
    print("Please make sure you have run 'python ingest.py' first.")
    # We can decide to exit or continue with a warning
    # For now, let's just print the error and continue
    retriever = None

# 3. Create the RAG (Retrieval-Augmented Generation) Chain
# This chain will "retrieve" data from your memory and "generate" an answer

# We create a prompt template to guide the AI
prompt_template = """
You are a helpful research assistant. Use the following pieces of context 
to answer the user's question.
If you don't know the answer, just say that you don't know.

Context: {context}

Question: {question}

Answer:
"""

PROMPT = PromptTemplate(
    template=prompt_template, input_variables=["context", "question"]
)

# Initialize the RetrievalQA chain
if retriever:
    rag_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff", # "stuff" means we'll "stuff" all context into the prompt
        retriever=retriever,
        chain_type_kwargs={"prompt": PROMPT},
        return_source_documents=True
    )
    print("RAG chain created.")
else:
    rag_chain = None
    print("RAG chain creation failed (retriever not available).")


# --- API DEFINITION ---

app = FastAPI()

# Configure CORS (Cross-Origin Resource Sharing)
# This allows your frontend (localhost:3000) to talk to your backend (localhost:8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # The origin of your React app
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods (GET, POST, etc.)
    allow_headers=["*"], # Allows all headers
)

# Define the request data model (what the frontend sends)
class ChatRequest(BaseModel):
    query: str

# Define the API endpoint
@app.post("/api/v1/chat")
def post_chat(request: ChatRequest):
    print(f"Received query: {request.query}")

    if not rag_chain:
        return {"answer": "Error: RAG chain is not initialized."}

    # 1. Get the query from the request
    query = request.query

    # 2. Use the RAG chain to get an answer
    # This will find relevant docs in chroma_db and send them to llama3
    try:
        response = rag_chain.invoke({"query": query})

        # The 'result' key contains the AI's final answer
        answer = response.get("result", "No answer found.")

        # We can also see the documents it used (optional)
        source_docs = response.get("source_documents", [])
        if source_docs:
            print(f"Used {len(source_docs)} source documents.")

        print(f"Sending answer: {answer}")
        return {"answer": answer}

    except Exception as e:
        print(f"Error during RAG chain invocation: {e}")
        return {"answer": f"Error: {e}"}

@app.get("/")
def read_root():
    return {"message": "AI Backend is running!"}

# --- RUN THE APP ---
if __name__ == "__main__":
    print("Starting Uvicorn server...")
    uvicorn.run(app, host="127.0.0.1", port=8000)

# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

from langchain_community.vectorstores import Chroma
# ... (all your other langchain imports) ...

# 1. Add your new imports here (from point 2)
import json
import aiofiles 


# ... (all the code for "--- CONFIGURATION ---" and "--- SETUP ---") ...
# ... (this code sets up your RAG_CHAIN) ...


# --- API DEFINITION ---

app = FastAPI()

# ... (all the code for app.add_middleware(CORS)...) ...


# Define the request data model (what the frontend sends)
class ChatRequest(BaseModel):
    query: str


# 2. Add the NEW FeedbackRequest model here (this is point 3)
class FeedbackRequest(BaseModel):
    query: str
    response: str
    feedback: str # "positive" or "negative"


# This is your existing chat endpoint
@app.post("/api/v1/chat")
def post_chat(request: ChatRequest):
    # ... (all the code for your chat endpoint) ...
    # ... (this function is NOT changed) ...
    pass # Just a placeholder so Python is happy


# 3. Add the NEW feedback endpoint here (this is point 4)
@app.post("/api/v1/feedback")
async def post_feedback(request: FeedbackRequest):
    print(f"Received feedback: {request.feedback}")
    
    feedback_log_file = "feedback_log.jsonl"
    
    log_entry = {
        "query": request.query,
        "response": request.response,
        "feedback": request.feedback
    }
    
    try:
        async with aiofiles.open(feedback_log_file, mode="a") as f:
            await f.write(json.dumps(log_entry) + "\n")
            
        print(f"Feedback logged to {feedback_log_file}")
        return {"status": "success", "message": "Feedback received"}
    
    except Exception as e:
        print(f"Error logging feedback: {e}")
        return {"status": "error", "message": "Could not log feedback"}


# This is your existing root endpoint
@app.get("/")
def read_root():
    return {"message": "AI Backend is running!"}


# --- RUN THE APP ---
if __name__ == "__main__":
    # ... (this code is not changed) ...
    print("Starting Uvicorn server...")
    uvicorn.run(app, host="127.0.0.1", port=8000)