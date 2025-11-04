# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import json
import aiofiles
from typing import List, Optional # New import for typing

from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.llms import Ollama
from langchain.prompts import PromptTemplate

# --- NEW IMPORTS FOR CONVERSATIONAL MEMORY ---
from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationBufferMemory
from langchain.schema import Document

# --- CONFIGURATION ---
CHROMA_DB_PATH = "./chroma_db"
EMBEDDING_MODEL = "nomic-embed-text"
LLM_MODEL = "llama3"

# --- SETUP ---

print("Initializing models...")
embeddings = OllamaEmbeddings(model=EMBEDDING_MODEL)
llm = Ollama(model=LLM_MODEL)
print("Models initialized.")

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
    retriever = None

# --- NEW: CONVERSATIONAL CHAIN SETUP ---

if retriever:
    # This prompt is for step 2: Answering the question
    answer_prompt_template = """
    You are a helpful research assistant. Use the following pieces of context 
    to answer the user's question.
    If you don't know the answer, just say that you don't know.
    
    Context: {context}
    
    Question: {question}
    
    Answer:
    """
    ANSWER_PROMPT = PromptTemplate(
        template=answer_prompt_template, input_variables=["context", "question"]
    )
    
    # This prompt is for step 1: Rephrasing the question
    condense_question_template = """
    Given the following conversation and a follow-up question, rephrase the
    follow-up question to be a standalone question, in its original language.

    Chat History:
    {chat_history}
    
    Follow Up Input: {question}
    Standalone question:
    """
    CONDENSE_QUESTION_PROMPT = PromptTemplate.from_template(condense_question_template)

    # We create a "memory" object to manage the history
    memory = ConversationBufferMemory(
        memory_key="chat_history",
        return_messages=True,
        output_key='answer'  # <--- THIS IS FIX #1
    )

    # Initialize the ConversationalRetrievalChain
    rag_chain = ConversationalRetrievalChain.from_llm(
        llm=llm,
        retriever=retriever,
        memory=memory, 
        condense_question_prompt=CONDENSE_QUESTION_PROMPT, 
        combine_docs_chain_kwargs={"prompt": ANSWER_PROMPT}, 
        return_source_documents=True
    )
    print("ConversationalRAG chain created.")
else:
    rag_chain = None
    print("RAG chain creation failed (retriever not available).")


# --- API DEFINITION ---

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- NEW: Define the chat history message format ---
class ChatMessage(BaseModel):
    id: float 
    text: str
    sender: str
    feedbackSent: Optional[bool] = None 

# --- NEW: Update ChatRequest to include history ---
class ChatRequest(BaseModel):
    query: str
    chat_history: List[ChatMessage] = [] 

class FeedbackRequest(BaseModel):
    query: str
    response: str
    feedback: str

# --- THIS IS FIX #2 (The entire function is updated) ---
@app.post("/api/v1/chat")
def post_chat(request: ChatRequest):
    print(f"Received query: {request.query}")
    
    if not rag_chain:
        return {"answer": "Error: RAG chain is not initialized."}

    # --- NEW: Simplified Chat History Formatting ---
    # LangChain's chain expects a list of (human, ai) tuples
    langchain_history = []
    user_msg = None
    for msg in request.chat_history:
        if msg.sender == 'user':
            user_msg = msg.text
        # Check if we have a user message and the current one is from AI
        elif msg.sender == 'ai' and user_msg is not None:
            langchain_history.append((user_msg, msg.text))
            user_msg = None # Reset user message after pairing
    
    try:
        # Pass the history directly to the chain's invoke method
        # The chain will handle the memory correctly
        response = rag_chain.invoke({
            "question": request.query,
            "chat_history": langchain_history
        })
        
        # The 'answer' key contains the AI's final answer
        answer = response.get("answer", "No answer found.")
        
        source_docs = response.get("source_documents", [])
        if source_docs:
            print(f"Used {len(source_docs)} source documents.")
        
        print(f"Sending answer: {answer}")
        return {"answer": answer}

    except Exception as e:
        print(f"Error during RAG chain invocation: {e}")
        return {"answer": f"Error: {e}"}


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

@app.get("/")
def read_root():
    return {"message": "AI Backend is running!"}

if __name__ == "__main__":
    print("Starting Uvicorn server...")
    uvicorn.run(app, host="127.0.0.1", port=8000)