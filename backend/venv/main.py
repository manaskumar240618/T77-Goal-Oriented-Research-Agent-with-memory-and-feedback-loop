from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# This is CRITICAL for your frontend to talk to your backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allows all websites
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods (GET, POST, etc.)
    allow_headers=["*"], # Allows all headers
)

@app.get("/")
def read_root():
    return {"Hello": "From the Backend!"}