# Cursor-V2 <img src="./frontend/src/assets/cursor_v2_icon.ico" alt="drawing" style="width:24px; height: 24px"/>
A modern code editor and comparison tool with AI-powered assistance.

## Cursor-V2 Pitch

[![Cursor-V2 Demo](http://img.youtube.com/vi/68wKv9XQ2fM/0.jpg)](https://youtu.be/68wKv9XQ2fM "Cursor-V2 Pitch")

Click the thumbnail above to watch our Cursor-V2 pitch video!

## 🚀 Launch Instructions

Follow these steps to get the application up and running locally: 

## Prerequisites

- Python 3.10+
- Node.js and npm
- Required Python packages (see `backend/requirements.txt`)



### Backend Setup
Run from the root directory
```bash 
cd backend
python3 -m venv .venv
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
### API Tokens
Paste your OpenAI and Anthropic API Keys in the `backend/.env` file. An example env file (`.example.env`) is provided for key reference. Rename to `.env` once the values are populated


### Test Whisper Integration (Optional)
```bash
python backend/test_whisper_integration.py
```

### Frontend Setup
```bash
cd frontend
# Install dependencies
npm install
# Start development server
npm run dev
# Build for production
npm run build
```
---
