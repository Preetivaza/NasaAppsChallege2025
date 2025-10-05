import os
import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GROK_API_KEY")
API_URL = os.getenv("GROK_API_URL")

def call_grok(prompt: str):
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    body = {
        "prompt": prompt,
        "model": "grok-4"   # or whichever version is available
    }
    resp = requests.post(API_URL, json=body, headers=headers)
    resp.raise_for_status()
    return resp.json()
