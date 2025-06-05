from fastapi import FastAPI, HTTPException, WebSocket, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any, Deque
import os
from dotenv import load_dotenv
from datetime import datetime
import httpx
import asyncio
import logging
from collections import deque
import json
from uvicorn.logging import DefaultFormatter
import pathlib
from jinja2 import Environment, FileSystemLoader
import re
import time

# Import Whisper service
from whisper_service import get_whisper_service, transcribe_audio_bytes

# Load environment variables
load_dotenv()

# Setup Jinja2 environment
templates_dir = pathlib.Path(__file__).parent / 'templates'
jinja_env = Environment(loader=FileSystemLoader(str(templates_dir)))

app = FastAPI()

# Global state
active_connections: List[WebSocket] = []
prompt_history: Deque[Dict[str, Any]] = deque(maxlen=10)
latest_responses: List[Dict[str, Any]] = []
frontend_info_cache: Dict[str, Any] = {}

# Model configurations
MODEL_ZOO = {
    'claude': {
        '3.5': 'claude-3-5-sonnet-20241022',
        'haiku': 'claude-3-haiku-20240307'
    },
    'deepseek': {
        'coder': 'deepseek-ai/deepseek-coder-7b-instruct-v1.5',
        'base': 'base'
    },
    'manim': {
        'finetuned': 'finetuned'
    }
}

MANIM_MODEL_SERVER_URL = os.getenv("MODEL_SERVER_URL")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[f"http://localhost:{os.getenv("FRONTEND_PORT")}"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Get Uvicorn's logger
logger = logging.getLogger("uvicorn")

def process_prompt(prompt_list: List[Dict[str, Any]], current_prompt: str, language: str) -> str:
    """Concatenate all the prompts as a conversation between the user and the model and pass it 
    as context to the model."""
    # Get the Jinja template for the language
    try:
        template = jinja_env.get_template(f"{language.lower()}.j2")
        system_instructions = template.render(prompt=current_prompt) if template else ""
    except:
        system_instructions = f"""You are an expert {language} developer. 
Important Instructions:
1. ALWAYS review the previous code before generating new code
2. Do not add any copyright notices or other legal notices to the code.  
3. If the new request is related to or builds upon previous code, MODIFY the existing code instead of starting from scratch
4. Maintain the structure and style of previous code while adding new features
5. Add clear comments explaining your modifications
6. If completely new code is needed, explain why previous code couldn't be reused

"""

    # Build conversation history
    conversation = []
    for entry in prompt_list:
        conversation.extend([
            f"User: {entry['prompt']}",
            f"Assistant: Here's the generated code:\n```{language}\n{entry['code']}\n```\n"
            f"This code {entry['description']}. Keep this in mind for future modifications."
        ])

    # Add the current prompt with explicit instruction
    conversation.append(
        f"User: {current_prompt}\n"
        f"Important: If this request relates to previous code (like modifying colors, sizes, or adding features), "
        f"please modify the most relevant previous code instead of starting from scratch. "
        f"Explain your modifications in comments."
    )

    # Combine system instructions with conversation history
    full_prompt = f"{system_instructions}\n\n"
    full_prompt += "Previous conversation and code history (IMPORTANT - Review and modify this code when appropriate):\n"
    full_prompt += "\n\n".join(conversation)
    full_prompt += "\n\nPlease generate code based on this context. If the request builds upon previous code (like changing colors or adding features), modify the existing code and explain your changes in comments."

    return full_prompt

class PromptHistoryEntry(BaseModel):
    timestamp: str
    prompt: str
    language: str
    model: str
    code: str
    description: str

async def broadcast_history():
    """Broadcast current history to all connected clients."""
    history_data = {
        "type": "history_update",
        "data": list(prompt_history)
    }
    disconnected = []
    for connection in active_connections:
        try:
            await connection.send_json(history_data)
        except Exception as e:
            logger.error(f"Error broadcasting to client: {str(e)}")
            disconnected.append(connection)
    
    # Clean up disconnected clients
    for connection in disconnected:
        if connection in active_connections:
            active_connections.remove(connection)

async def log_prompt_history(entry: Dict[str, Any]):
    """Add a new entry to the prompt history deque."""
    prompt_history.append(entry)
    await broadcast_history()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        # Send initial history when client connects
        await websocket.send_json({
            "type": "history_update",
            "data": list(prompt_history)
        })
        
        # Keep connection alive with ping/pong
        while True:
            try:
                data = await websocket.receive_text()
                if data == "ping":
                    await websocket.send_text("pong")
                elif data == "get_history":
                    await websocket.send_json({
                        "type": "history_update",
                        "data": list(prompt_history)
                    })
            except Exception as e:
                logger.error(f"WebSocket error: {str(e)}")
                break
    except Exception as e:
        logger.error(f"WebSocket connection error: {str(e)}")
    finally:
        if websocket in active_connections:
            active_connections.remove(websocket)
        try:
            await websocket.close()
        except:
            pass  # Connection might already be closed

class CodeRequest(BaseModel):
    code: str
    language: str
    model: Optional[str] = None
    prompt: Optional[str] = None

class CodeResponse(BaseModel):
    result: str
    error: Optional[str] = None

class FrontendInfoRequest(BaseModel):
    endpoint: Optional[str] = None
    data: Optional[Dict[str, Any]] = None

class ComparisonCountRequest(BaseModel):
    count: int

@app.get("/")
async def read_root():
    return {"status": "ok", "message": "Code Editor Backend API"}

@app.get("/responses")
async def get_responses():
    return {"responses": latest_responses}

def get_system_prompt(language: str, prompt: str) -> str:
    """Get the system prompt for the specified language using Jinja templates."""
    try:
        # Get the language-specific template
        template = jinja_env.get_template(f"{language.lower()}.j2")
        if template:
            # Render the template with the user's prompt
            return template.render(prompt=prompt if prompt else "")
        else:
            # Fallback for unsupported languages
            return f"You are an expert {language} developer. Generate the code and add necessary comments and explanations as you see fit. User request: {prompt}"
    except Exception as e:
        logger.error(f"Error generating prompt for {language}: {str(e)}")
        return f"You are an expert {language} developer. Generate the code and add necessary comments and explanations as you see fit. User request: {prompt}"

def extract_code_block(text: str) -> str:
    """Extract only the code block from the response, removing any explanations."""
    # Look for code between triple backticks
    code_pattern = r"```(?:\w+)?\n([\s\S]*?)```"
    matches = re.findall(code_pattern, text)
    
    if matches:
        # Return the first code block found
        return matches[0].strip()
    else:
        # If no code blocks found, return the original text
        # but remove any markdown formatting or explanations
        lines = text.split('\n')
        code_lines = []
        for line in lines:
            # Skip lines that look like explanations or markdown
            if line.strip().startswith(('#', '>', '-', '*')) or ':' in line[:20]:
                continue
            code_lines.append(line)
        return '\n'.join(code_lines).strip()

async def generate_code(prompt: str, language: str, model: str) -> str:
    max_retries = 3
    retry_count = 0
    last_error = None

    while retry_count < max_retries:
        try:
            logger.info(f"Model Used: {model} (Attempt {retry_count + 1}/{max_retries})")
            # Get conversation history and create full prompt
            history_list = list(prompt_history)[-9:]  # Get last 9 entries to add current as 10th
            full_prompt = process_prompt(history_list, prompt, language)
            
            logger.debug(f"Generating code for model: {model}, language: {language}")
            
            async with httpx.AsyncClient(timeout=300.0) as client:
                # Handle manim models first
                if language == 'manim':
                    model_type = MODEL_ZOO['manim'][model]
                    logger.debug(f"Sending request to local manim model server for {model} -> {model_type}")
                    
                    response = await client.post(
                        f"{MANIM_MODEL_SERVER_URL}/generate",
                        json={
                            "prompt": prompt,  # Use simple prompt for manim models
                            "model_type": model_type,
                            "max_new_tokens": 3600,
                            "temperature": 0.8
                        }
                    )
                    
                    if response.status_code != 200:
                        error_msg = f"Local manim model error: {response.text}"
                        logger.error(error_msg)
                        last_error = error_msg
                        retry_count += 1
                        continue
                        
                    result = response.json()
                    logger.debug(f"Received response from local manim model server")
                    return result['generated_code'].strip()
                
                # Handle Claude models
                elif model.startswith('claude-'):  # Handle all Claude models
                    model_family = 'claude'
                    model_variant = model.split('-')[1]  # Get '3.5' or 'haiku' from 'claude-3.5' or 'claude-haiku'
                    
                    if model_variant not in MODEL_ZOO[model_family]:
                        error_msg = f"Unsupported Claude variant: {model_variant}"
                        logger.error(error_msg)
                        raise HTTPException(status_code=400, detail=error_msg)
                    
                    logger.debug(f"Using model mapping: {MODEL_ZOO[model_family][model_variant]}")
                    headers = {
                        "x-api-key": os.getenv('ANTHROPIC_API_KEY'),
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json"
                    }
                    
                    logger.debug(f"Sending request to Claude API for model {model}")
                    response = await client.post(
                        "https://api.anthropic.com/v1/messages",
                        headers=headers,
                        json={
                            "model": MODEL_ZOO[model_family][model_variant],
                            "max_tokens": 2000,
                            "temperature": 0.1,
                            "system": full_prompt,
                            "messages": [
                                {"role": "user", "content": "Generate the code with explanations."}
                            ]
                        }
                    )
                    
                    if response.status_code != 200:
                        error_msg = f"Claude API error: {response.text}"
                        logger.error(f"Claude API error for {model}: {response.text}")
                        last_error = error_msg
                        retry_count += 1
                        continue
                        
                    result = response.json()
                    logger.debug(f"Received response from Claude API for {model}")
                    return result['content'][0]['text'].strip()
                
                elif model == 'deepseek':  # Deepseek model for non-manim languages
                    logger.debug(f"Using model mapping: {MODEL_ZOO[language][model]}")
                    headers = {
                        "Authorization": f"Bearer {os.getenv('HUGGINGFACE_API_KEY')}",
                        "Content-Type": "application/json"
                    }
                    
                    logger.debug(f"Sending request to Deepseek API")
                    response = await client.post(
                        "https://router.huggingface.co/novita/v3/openai/chat/completions",
                        headers=headers,
                        json={
                            "model": MODEL_ZOO[language][model],
                            "messages": [
                                {"role": "system", "content": full_prompt},
                                {"role": "user", "content": "Generate the code with explanations."}
                            ],
                            "temperature": 0.7,
                            "max_tokens": 4000
                        }
                    )
                    
                    if response.status_code != 200:
                        error_msg = f"Deepseek API error: {response.text}"
                        logger.error(f"Deepseek API error for {model}: {response.text}")
                        last_error = error_msg
                        retry_count += 1
                        continue
                        
                    result = response.json()
                    logger.debug(f"Received response from Deepseek API")
                    return result['choices'][0]['message']['content'].strip()
                    
                else:
                    error_msg = f"Unsupported model: {model} for language: {language}"
                    logger.error(error_msg)
                    raise HTTPException(status_code=400, detail=error_msg)

        except Exception as e:
            error_msg = f"API error for {model}: {str(e)}"
            logger.error(error_msg)
            last_error = error_msg
            retry_count += 1
            continue

    # If we've exhausted all retries, raise the last error
    error_msg = f"Failed to generate valid code after {max_retries} attempts. Last error: {last_error}"
    logger.error(error_msg)
    raise HTTPException(status_code=500, detail=error_msg)

@app.post("/validate")
async def validate_code(request: CodeRequest):
    """
    Sanity check endpoint to validate code and language before generation.
    """
    try:
        supported_languages = ["html", "css", "javascript", "manim"]
        if request.language.lower() not in supported_languages:
            raise HTTPException(status_code=400, detail="Unsupported language")
        
        return {
            "result": request.code,
            "error": None,
            "message": "Code validation successful."
        }
            
    except Exception as e:
        logger.error(f"Error validating code: {str(e)}")
        return {"result": None, "error": str(e)}

@app.post("/save-imported-code")
async def save_imported_code(entry: PromptHistoryEntry):
    """Save code that was imported to main editor."""
    history_entry = {
        "timestamp": entry.timestamp,
        "prompt": entry.prompt,
        "language": entry.language,
        "model": entry.model,
        "code": entry.code,
        "description": f"Imported code from {entry.model}"
    }
    prompt_history.append(history_entry)
    await broadcast_history()
    return {"success": True}

@app.post("/compare")
async def compare_code(requests: List[CodeRequest]):
    """Main endpoint for code generation."""
    try:
        logger.debug(f"Received compare request with {len(requests)} models")
        logger.debug(f"Request details: {[{'model': req.model, 'language': req.language} for req in requests]}")
        
        # Validate language for all requests
        supported_languages = ["html", "css", "javascript", "manim"]
        for req in requests:
            if req.language.lower() not in supported_languages:
                raise HTTPException(status_code=400, detail=f"Unsupported language: {req.language}")

        # Create a dictionary to store results by model
        results_by_model = {}

        async def execute_model_request(req: CodeRequest) -> Dict[str, Any]:
            try:
                logger.debug(f"Processing request for model: {req.model}")
                if not req.model or not req.prompt:
                    logger.debug(f"Skipping code generation for model {req.model} - missing model or prompt")
                    return {
                        "model": req.model,
                        "language": req.language,
                        "code": req.code,
                        "prompt": req.prompt,
                        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                        "error": None
                    }
                
                try:
                    logger.debug(f"Generating code for model {req.model}")
                    code = await generate_code(req.prompt, req.language, req.model)
                    logger.debug(f"Successfully generated code for model {req.model}")
                    result = {
                        "model": req.model,
                        "language": req.language,
                        "code": code,
                        "prompt": req.prompt,
                        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                        "error": None
                    }
                    # Store result in dictionary with model as key
                    results_by_model[req.model] = result
                    return result
                except HTTPException as e:
                    logger.error(f"HTTP error for model {req.model}: {e.detail}")
                    return {
                        "model": req.model,
                        "language": req.language,
                        "code": None,
                        "prompt": req.prompt,
                        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                        "error": str(e.detail)
                    }
            except Exception as e:
                error_msg = f"Error executing request for {req.model}: {str(e)}"
                logger.error(error_msg)
                return {
                    "model": req.model,
                    "language": req.language,
                    "code": None,
                    "prompt": req.prompt,
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "error": error_msg
                }

        # Execute all requests in parallel
        logger.debug("Starting parallel execution of model requests")
        tasks = [execute_model_request(req) for req in requests]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        logger.debug(f"Completed parallel execution, received {len(results)} results")
        
        # Process results and handle any exceptions
        processed_results = []
        for req in requests:  # Iterate through original requests to maintain order
            result = results_by_model.get(req.model)  # Get result for this model
            if result:
                logger.debug(f"Processing result for model: {result.get('model')}")
                processed_results.append(result)
                if not result.get("error"):
                    latest_responses.append(result)
                    if len(latest_responses) > 10:
                        latest_responses.pop(0)
            else:
                # Handle case where model didn't generate a result
                logger.error(f"No result found for model: {req.model}")
                processed_results.append({
                    "model": req.model,
                    "language": req.language,
                    "code": None,
                    "prompt": req.prompt,
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "error": "Failed to generate code"
                })
        
        logger.debug(f"Returning {len(processed_results)} processed results")
        return {
            "results": processed_results,
            "error": None
        }
            
    except Exception as e:
        error_msg = f"Error in compare endpoint: {str(e)}"
        logger.error(error_msg)
        return {"results": None, "error": error_msg}

@app.get("/frontend-info")
async def get_frontend_info():
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.get(f"http://localhost:{os.getenv('FRONTEND_PORT')}")
                
                frontend_data = {
                    "status_code": response.status_code,
                    "headers": dict(response.headers),
                    "content_preview": response.text[:500] + "..." if len(response.text) > 500 else response.text,
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
                
                frontend_info_cache["latest"] = frontend_data
                return {
                    "success": True,
                    "data": frontend_data
                }
                
            except httpx.ConnectError:
                return {
                    "success": False,
                    "error": f"Could not connect to frontend on localhost:{os.getenv('FRONTEND_PORT')}. Is it running?"
                }
                
    except Exception as e:
        error_msg = f"Error fetching frontend info: {str(e)}"
        logger.error(error_msg)
        return {
            "success": False,
            "error": error_msg
        }

@app.post("/frontend-info")
async def post_frontend_info(request: FrontendInfoRequest):
    try:
        endpoint = request.endpoint or ""
        base_url = f"http://localhost:{os.getenv('FRONTEND_PORT')}{endpoint}"
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                if request.data:
                    response = await client.post(base_url, json=request.data)
                else:
                    response = await client.get(base_url)
                
                result_data = {
                    "url": base_url,
                    "method": "POST" if request.data else "GET",
                    "status_code": response.status_code,
                    "headers": dict(response.headers),
                    "content": response.text,
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
                
                return {
                    "success": True,
                    "data": result_data
                }
                
            except httpx.ConnectError:
                return {
                    "success": False,
                    "error": f"Could not connect to {base_url}. Is the frontend running on port {os.getenv('FRONTEND_PORT')}?"
                }
                
    except Exception as e:
        error_msg = f"Error interacting with frontend: {str(e)}"
        logger.error(error_msg)
        return {
            "success": False,
            "error": error_msg
        }

@app.get("/print-frontend-status")
async def print_frontend_status():
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            try:
                response = await client.get(f"http://localhost:{os.getenv('FRONTEND_PORT')}")   
                
                content_lower = response.text.lower()
                app_type = "Frontend Framework Application" if any(framework in content_lower for framework in ['react', 'vue', 'angular', 'svelte']) else "Vite Development Server" if 'vite' in content_lower else "HTML Application" if '<html' in content_lower else "Unknown"
                
                return {
                    "status": "online",
                    "status_code": response.status_code,
                    "response_time": response.elapsed.total_seconds(),
                    "content_length": len(response.text),
                    "app_type": app_type,
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
                
            except httpx.ConnectError:
                return {
                    "status": "offline",
                    "error": "Connection refused",
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
                
    except Exception as e:
        error_msg = f"Error checking frontend status: {str(e)}"
        return {
            "status": "error",
            "error": error_msg,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

@app.get("/debug/latest")
async def get_latest():
    return {
        "count": len(latest_responses),
        "responses": latest_responses
    }

@app.get("/debug/frontend-cache")
async def get_frontend_cache():
    return {
        "cache": frontend_info_cache
    }

@app.post("/notify-comparison-count")
async def notify_comparison_count(request: ComparisonCountRequest):
    try:
        count_message = "No comparisons" if request.count == 0 else f"{request.count} model comparison{'s' if request.count > 1 else ''}"
        logger.info(f"Comparison mode changed to: {count_message}")
        return {"success": True}
    except Exception as e:
        logger.error(f"Error handling comparison count: {str(e)}")
        return {"success": False, "error": str(e)}

@app.get("/prompt-history")
async def get_prompt_history():
    """Get the current prompt history."""
    return {"history": list(prompt_history)}

@app.post("/clear-history")
async def clear_prompt_history():
    """Clear the prompt history."""
    prompt_history.clear()
    await broadcast_history()
    return {"message": "History cleared"}

# Whisper Speech-to-Text Endpoints
class TranscriptionRequest(BaseModel):
    """Request model for audio transcription"""
    language: Optional[str] = None  # Language code (e.g., "en", "es", "fr") or None for auto-detect
    sample_rate: Optional[int] = 16000  # Sample rate of audio data

class TranscriptionResponse(BaseModel):
    """Response model for audio transcription"""
    text: str
    language: str
    success: bool
    error: Optional[str] = None
    processing_time: Optional[float] = None

@app.post("/whisper/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio_file(
    audio_file: UploadFile = File(...),
    language: Optional[str] = Form(None)
):
    """
    Transcribe audio file using Whisper
    
    Args:
        audio_file: Audio file (WAV, MP3, M4A, etc.)
        language: Language code for transcription (optional)
    
    Returns:
        TranscriptionResponse with transcribed text
    """
    start_time = time.time()
    
    try:
        # Validate file type
        if not audio_file.content_type or not audio_file.content_type.startswith('audio/'):
            logger.warning(f"Invalid file type: {audio_file.content_type}")
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid file type. Expected audio file, got: {audio_file.content_type}"
            )
        
        # Read audio file
        audio_data = await audio_file.read()
        logger.info(f"Received audio file: {audio_file.filename} ({len(audio_data)} bytes)")
        
        # Save to temporary file for processing
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=f".{audio_file.filename.split('.')[-1]}", delete=False) as temp_file:
            temp_file.write(audio_data)
            temp_path = temp_file.name
        
        try:
            # Get Whisper service and transcribe
            whisper_service = get_whisper_service()
            result = whisper_service.transcribe_file(temp_path, language)
            
            processing_time = time.time() - start_time
            
            if result["success"]:
                logger.info(f"✅ Transcription successful in {processing_time:.2f}s: {result['text'][:100]}...")
                return TranscriptionResponse(
                    text=result["text"],
                    language=result["language"],
                    success=True,
                    processing_time=processing_time
                )
            else:
                logger.error(f"❌ Transcription failed: {result['error']}")
                return TranscriptionResponse(
                    text="",
                    language="unknown",
                    success=False,
                    error=result["error"],
                    processing_time=processing_time
                )
                
        finally:
            # Clean up temporary file
            os.unlink(temp_path)
            
    except Exception as e:
        processing_time = time.time() - start_time
        error_msg = f"Transcription error: {str(e)}"
        logger.error(error_msg)
        return TranscriptionResponse(
            text="",
            language="unknown",
            success=False,
            error=error_msg,
            processing_time=processing_time
        )

@app.post("/whisper/transcribe-raw", response_model=TranscriptionResponse)
async def transcribe_raw_audio(
    request: TranscriptionRequest,
    audio_data: bytes = File(...)
):
    """
    Transcribe raw audio data using Whisper
    
    Args:
        request: TranscriptionRequest with options
        audio_data: Raw audio data as bytes
    
    Returns:
        TranscriptionResponse with transcribed text
    """
    start_time = time.time()
    
    try:
        logger.info(f"Received raw audio data: {len(audio_data)} bytes, sample_rate: {request.sample_rate}")
        
        # Transcribe using Whisper service
        result = transcribe_audio_bytes(
            audio_data, 
            sample_rate=request.sample_rate,
            language=request.language
        )
        
        processing_time = time.time() - start_time
        
        if result["success"]:
            logger.info(f"✅ Raw transcription successful in {processing_time:.2f}s: {result['text'][:100]}...")
            return TranscriptionResponse(
                text=result["text"],
                language=result["language"],
                success=True,
                processing_time=processing_time
            )
        else:
            logger.error(f"❌ Raw transcription failed: {result['error']}")
            return TranscriptionResponse(
                text="",
                language="unknown",
                success=False,
                error=result["error"],
                processing_time=processing_time
            )
            
    except Exception as e:
        processing_time = time.time() - start_time
        error_msg = f"Raw transcription error: {str(e)}"
        logger.error(error_msg)
        return TranscriptionResponse(
            text="",
            language="unknown",
            success=False,
            error=error_msg,
            processing_time=processing_time
        )

@app.get("/whisper/info")
async def get_whisper_info():
    """
    Get information about the Whisper service
    
    Returns:
        Dict with Whisper model information
    """
    try:
        whisper_service = get_whisper_service()
        info = whisper_service.get_model_info()
        logger.info("📊 Whisper service info requested")
        return {
            "status": "available",
            "model_info": info,
            "supported_languages": list(info["available_languages"].keys()),
            "endpoint": "/whisper/transcribe"
        }
    except Exception as e:
        logger.error(f"❌ Error getting Whisper info: {e}")
        return {
            "status": "unavailable",
            "error": str(e)
        }

@app.post("/whisper/health")
async def whisper_health_check():
    """
    Health check for Whisper service
    
    Returns:
        Health status of the Whisper service
    """
    try:
        whisper_service = get_whisper_service()
        info = whisper_service.get_model_info()
        
        if info["is_loaded"]:
            return {
                "status": "healthy",
                "model_size": info["model_size"],
                "device": info["device"],
                "message": "Whisper service is ready"
            }
        else:
            return {
                "status": "unhealthy", 
                "message": "Whisper model not loaded"
            }
    except Exception as e:
        logger.error(f"❌ Whisper health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }