# backend/ingest.py
import os
from langchain_community.document_loaders import DirectoryLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import OllamaEmbeddings

# --- CONFIGURATION ---
# The path to your data folder (relative to this script)
DATA_PATH = "../data"  
# The path where the AI's memory will be stored
CHROMA_DB_PATH = "./chroma_db"  
# The embedding model to use
EMBEDDING_MODEL = "nomic-embed-text" 

def main():
    print("--- Starting Ingestion ---")

    # Check if the data directory exists
    if not os.path.exists(DATA_PATH) or not os.listdir(DATA_PATH):
        print(f"Error: Data directory '{DATA_PATH}' is empty or does not exist.")
        print("Please create the 'data' folder in the root directory and add 'knowledge.txt'.")
        return

    # 1. Load documents
    print(f"Loading documents from {DATA_PATH}...")
    loader = DirectoryLoader(DATA_PATH, glob="*.txt", show_progress=True)
    documents = loader.load()
    print(f"Loaded {len(documents)} documents.")

    # 2. Split documents into chunks
    print("Splitting documents into chunks...")
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    chunks = text_splitter.split_documents(documents)
    print(f"Created {len(chunks)} chunks.")

    # 3. Create embeddings and store in ChromaDB
    print("Initializing embedding model...")
    # Make sure Ollama is running and you have the model
    # Run: ollama pull nomic-embed-text
    embeddings = OllamaEmbeddings(model=EMBEDDING_MODEL)

    print(f"Creating vector store at {CHROMA_DB_PATH}...")
    # This creates the vector store on disk
    vector_store = Chroma.from_documents(
        documents=chunks, 
        embedding=embeddings, 
        persist_directory=CHROMA_DB_PATH
    )
    print("--- Vector store created successfully! ---")
    print("--- Ingestion Complete ---")

if __name__ == "__main__":
    main()