# backend/main.py
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

# 1. Create the FastAPI app
app = FastAPI()

# 2. Set up CORS (This is CRITICAL)
# This allows M's frontend (http://localhost:3000)
# to talk to your backend (http://localhost:8000)
origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Define the "API Contract"
# This defines what M's request will look like
class ChatRequest(BaseModel):
    query: str

# This defines what your response will look like
class ChatResponse(BaseModel):
    answer: str

# 4. Create the Mock API Endpoint
@app.post("/api/v1/chat", response_model=ChatResponse)
def chat_with_agent(request: ChatRequest):
    
    # --- MOCKED RESPONSE ---
    # We are not using AI yet. We are just pretending.
    # This unblocks M from doing their work.
    print(f"Received query: {request.query}")
    mock_answer = f"This is a mock response to your query: '{request.query}'"
    
    return ChatResponse(answer=mock_answer)

# A simple root endpoint to test if the server is running
@app.get("/")
def read_root():
    return {"status": "Backend is running"}