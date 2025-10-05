from fastapi import FastAPI
from app.api.routes_grok import router as grok_router
import os
from dotenv import load_dotenv

# Load the .env file
load_dotenv()
app = FastAPI()

XAI_API_KEY = os.getenv("XAI_API_KEY")
app.include_router(grok_router, prefix="/api")

@app.get("/")
def root():
    return {"message": "Grok advisory backend up"}
