# Code Editor Backend

This is the backend service for the Code Editor application. It provides APIs for code execution and comparison between different AI models.

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
```

2. Activate the virtual environment:
- Windows:
```bash
.\venv\Scripts\activate
```
- Unix/MacOS:
```bash
source venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

## Running the Server

To start the development server:

```bash
python run.py
```

The server will start at `http://localhost:8000`

## API Endpoints

### GET /
- Health check endpoint
- Returns: `{"status": "ok", "message": "Code Editor Backend API"}`

### POST /execute
- Executes code in the specified language
- Request body:
```json
{
    "code": "string",
    "language": "string",
    "model": "string (optional)",
    "prompt": "string (optional)"
}
```
- Supported languages: html, css, javascript, manim

### POST /compare
- Compares code using different AI models
- Request body: Array of CodeRequest objects
```json
[
    {
        "code": "string",
        "language": "string",
        "model": "string",
        "prompt": "string"
    }
]
```

## Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# Add your environment variables here
``` 