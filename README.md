# Cursor-V2-FrontEnd

A modern code editor and comparison tool with AI-powered assistance.

## 🎥 Cursor-V2 Pitch

[![Cursor-V2 Demo](http://img.youtube.com/vi/68wKv9XQ2fM/0.jpg)](https://youtu.be/68wKv9XQ2fM "Cursor-V2 Pitch")

*Click the thumbnail above to watch our Cursor-V2 pitch video!*

## 🚀 Launch Instructions

Follow these steps to get the application up and running:

### Backend Setup
```bash
cd /home/ubuntu/github/Cursor-V2-FrontEnd/backend
pip install -r requirements.txt

python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Test Whisper Integration (Optional)
```bash
python /home/ubuntu/github/Cursor-V2-FrontEnd/backend/test_whisper_integration.py
```

### Frontend Setup
```bash
cd frontend
npm start
```

## 📋 Prerequisites

- Python 3.10+
- Node.js and npm
- Required Python packages (see `backend/requirements.txt`)

## 🎯 Features

- Modern code editor with syntax highlighting
- AI-powered code comparison
- Real-time collaboration
- Voice integration with Whisper
- Responsive design

---

*Built with ❤️ for better coding experiences*
