import os
from dotenv import load_dotenv
import google.generativeai as genai

# Load the keys
load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    print("❌ Error: GOOGLE_API_KEY not found in .env")
    exit()

# Configure the library
genai.configure(api_key=api_key)

print("🔍 Scanning for available models...")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"✅ Found: {m.name}")
except Exception as e:
    print(f"❌ Error scanning models: {e}")