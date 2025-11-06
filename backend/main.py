from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import json
import aiofiles
from typing import List, Optional
import os 
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.llms import Ollama
from langchain.prompts import PromptTemplate
from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationBufferMemory

# --- CONFIGURATION ---
CHROMA_DB_PATH = "./chroma_db"
EMBEDDING_MODEL = "nomic-embed-text"
LLM_MODEL = "llama3"

# --- GLOBAL VARIABLES ---
rag_chain = None
error_message = None

# --- SETUP FUNCTION (Handles Initialization and Errors) ---

def initialize_rag_chain():
    """Initializes the RAG components and handles startup errors."""
    global rag_chain, error_message

    print("Initializing models and chain...")
    
    try:
        # 1. Initialize Models
        embeddings = OllamaEmbeddings(model=EMBEDDING_MODEL)
        llm = Ollama(model=LLM_MODEL)
        print("Models initialized.")

        # 2. Load Vector Store
        if not os.path.exists(CHROMA_DB_PATH):
            error_message = f"Knowledge base path not found: {CHROMA_DB_PATH}. Please run ingest.py."
            print(f"Error: {error_message}")
            return
            
        vector_store = Chroma(
            persist_directory=CHROMA_DB_PATH, 
            embedding_function=embeddings
        )
        retriever = vector_store.as_retriever()
        print("Vector store loaded successfully.")

        # 3. Define Prompts (Isolation Logic Included)
        answer_prompt_template = """
        You are a strictly factual research assistant. 
        
        1. **PRIORITIZE** providing a detailed and comprehensive answer, unless a word count or length constraint is explicitly given.
        2. **STRICTLY FOLLOW** any constraints in the question (e.g., word count).
        3. Use the following CONTEXT (and ONLY the context) to formulate your answer.
        4. Do NOT be conversational, make guesses, or add extra information.
        
        Context: {context}
        
        Question: {question}
        
        Answer:
        """
        ANSWER_PROMPT = PromptTemplate(
            template=answer_prompt_template, input_variables=["context", "question"]
        )
        
        # --- CRITICAL FIX FOR ISOLATION ---
        # Only use history if the new question explicitly refers to the last topic (e.g., "explain it", "what was my last question").
        # If the question is a new topic (e.g., "what is LLM?"), ignore the history.
        condense_question_template = """
        Given the following conversation and a follow-up question, determine if the 
        follow-up question requires the context of the chat history to be understood.

        If the follow-up question is a command to modify or explain the previous topic 
        (e.g., 'explain it in detail,' 'explain my last prompt'), then rephrase it into 
        a single, standalone question that incorporates both the previous topic and the command.

        If the follow-up question introduces a new topic (e.g., 'what is LLM?'), then 
        simply return the follow-up question as the standalone question without modification.

        Chat History:
        {chat_history}
        
        Follow Up Input: {question}
        Standalone question:
        """
        CONDENSE_QUESTION_PROMPT = PromptTemplate.from_template(condense_question_template)

        # 4. Setup Memory and Chain
        memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True,
            output_key='answer'
        )

        rag_chain = ConversationalRetrievalChain.from_llm(
            llm=llm,
            retriever=retriever,
            memory=memory, 
            condense_question_prompt=CONDENSE_QUESTION_PROMPT, 
            combine_docs_chain_kwargs={"prompt": ANSWER_PROMPT}, 
            return_source_documents=False
        )
        print("ConversationalRAG chain created and ready.")

    except Exception as e:
        error_message = f"Failed to initialize RAG chain (Check Ollama/Models): {e}"
        rag_chain = None
        print(f"CRITICAL ERROR DURING STARTUP: {error_message}")


# Execute initialization on startup
initialize_rag_chain()


# --- API DEFINITION ---

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Define Data Models ---
class ChatMessage(BaseModel):
    id: float 
    text: str
    sender: str
    feedbackSent: Optional[bool] = None 

class ChatRequest(BaseModel):
    query: str
    chat_history: List[ChatMessage] = [] 

class FeedbackRequest(BaseModel):
    query: str
    response: str
    feedback: str


@app.post("/api/v1/chat")
def post_chat(request: ChatRequest):
    print(f"Received query: {request.query}")
    
    # --- Robust Initialization Check ---
    if rag_chain is None:
        return {"answer": f"Error: RAG chain is not initialized. Reason: {error_message}. Ensure Ollama is running and models are installed."}

    # --- History Formatting ---
    langchain_history = []
    user_msg = None
    for msg in request.chat_history:
        if msg.sender == 'user':
            user_msg = msg.text
        elif msg.sender == 'ai' and user_msg is not None:
            langchain_history.append((user_msg, msg.text))
            user_msg = None 
    
    try:
        response = rag_chain.invoke({
            "question": request.query,
            "chat_history": langchain_history
        })
        
        answer = response.get("answer", "No answer found.")
        print(f"Sending answer: {answer}")
        return {"answer": answer}

    except Exception as e:
        print(f"Error during RAG chain invocation: {e}")
        return {"answer": f"A temporary error occurred while processing the request. Please ensure Ollama is running."}


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
    # Add a check to confirm necessary environment for the presentation
    if rag_chain is None and error_message is not None:
        print("\n=======================================================")
        print("!! WARNING: RAG Chain Failed to Initialize. !!")
        print(f"!! Reason: {error_message} !!")
        print("!! Check Ollama, 'llama3', and the knowledge base folder.")
        print("=======================================================\n")
    
    uvicorn.run(app, host="127.0.0.1", port=8000)