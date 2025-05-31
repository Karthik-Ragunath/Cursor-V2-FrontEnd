from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Frontend dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CodeRequest(BaseModel):
    code: str
    language: str
    model: Optional[str] = None
    prompt: Optional[str] = None

class CodeResponse(BaseModel):
    result: str
    error: Optional[str] = None

@app.get("/")
async def read_root():
    return {"status": "ok", "message": "Code Editor Backend API"}

@app.post("/execute")
async def execute_code(request: CodeRequest):
    try:
        if request.language not in ["html", "css", "javascript", "manim"]:
            raise HTTPException(status_code=400, detail="Unsupported language")
        
        # Handle different languages
        if request.language == "manim":
            # TODO: Implement Manim execution
            return {"result": "Manim execution not implemented yet", "error": None}
        elif request.language == "javascript":
            # TODO: Implement JavaScript execution
            return {"result": "JavaScript execution not implemented yet", "error": None}
        else:
            # For HTML and CSS, we can return the code as-is
            return {"result": request.code, "error": None}
            
    except Exception as e:
        return {"result": None, "error": str(e)}

@app.post("/compare")
async def compare_code(requests: List[CodeRequest]):
    try:
        results = []
        for req in requests:
            # TODO: Implement actual model-based code generation
            # For now, just echo back the request
            results.append({
                "model": req.model,
                "code": req.code,
                "prompt": req.prompt
            })
        return {"results": results, "error": None}
    except Exception as e:
        return {"results": None, "error": str(e)} 