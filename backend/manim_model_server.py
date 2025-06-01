"""
Combined Manim Model Server
Serves both finetuned LoRA and base DeepSeek models for manim code generation
"""

import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel
import argparse
import json
import os
from typing import Dict, Optional
import time
import logging
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from contextlib import asynccontextmanager
import uvicorn

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global model instances
models = {}

class GenerationRequest(BaseModel):
    prompt: str
    model_type: str  # "finetuned" or "base"
    max_new_tokens: int = 3600
    temperature: float = 0.8

class GenerationResponse(BaseModel):
    generated_code: str
    generation_time: float
    model_used: str

class LoRAModelHandler:
    """Handler for the LoRA fine-tuned model"""
    
    def __init__(self, base_model_name: str, lora_adapter_path: str, device: str = "auto"):
        self.base_model_name = base_model_name
        self.lora_adapter_path = lora_adapter_path
        self.device = device
        self.model = None
        self.tokenizer = None
        self.load_model()
    
    def load_model(self):
        """Load the base model and LoRA adapter"""
        logger.info(f"Loading LoRA model: {self.base_model_name}")
        
        # Load base model
        self.model = AutoModelForCausalLM.from_pretrained(
            self.base_model_name,
            trust_remote_code=True,
            torch_dtype=torch.bfloat16,
            device_map=self.device,
            cache_dir="/home/ubuntu/karthik-ragunath-ananda-kumar-utah/text-to-manim/deepseek-ai/model/models--deepseek-ai--deepseek-coder-7b-instruct-v1.5"
        )
        
        logger.info(f"Loading LoRA adapter from: {self.lora_adapter_path}")
        
        # Load LoRA adapter
        self.model = PeftModel.from_pretrained(self.model, self.lora_adapter_path)
        
        # Load tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(self.lora_adapter_path)
        
        # Set model to evaluation mode
        self.model.eval()
        logger.info("🎉 LoRA model loaded successfully!")
    
    def generate_code(self, question: str, max_new_tokens: int = 3600, temperature: float = 0.8) -> str:
        """Generate code for a given question"""
        # Format the prompt (same as training format)
        prompt = f"### Question:\n{question}\n\n### Code:\n"
        
        # Tokenize
        inputs = self.tokenizer(prompt, return_tensors="pt").to(self.model.device)
        
        # Generate with optimized parameters for LoRA
        try:
            with torch.no_grad():
                outputs = self.model.generate(
                    **inputs,
                    max_new_tokens=max_new_tokens,
                    temperature=temperature,
                    do_sample=True,
                    top_p=0.95,
                    top_k=40,
                    pad_token_id=self.tokenizer.eos_token_id,
                    eos_token_id=self.tokenizer.eos_token_id,
                    repetition_penalty=1.05,
                    no_repeat_ngram_size=3,
                )
            
            # Decode and extract generated code
            generated_text = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
            generated_code = generated_text[len(prompt):]
            
            # Clean up generated code
            if "<|EOT|>" in generated_code:
                generated_code = generated_code.split("<|EOT|>")[0]
            
            return generated_code.strip()
            
        except Exception as e:
            logger.error(f"LoRA generation failed: {e}")
            return f"ERROR: LoRA generation failed - {e}"

class BaseModelHandler:
    """Handler for the base model without fine-tuning"""
    
    def __init__(self, base_model_name: str, device: str = "auto"):
        self.base_model_name = base_model_name
        self.device = device
        self.model = None
        self.tokenizer = None
        self.load_model()
    
    def load_model(self):
        """Load the base model"""
        logger.info(f"Loading base model: {self.base_model_name}")
        
        # Load base model
        self.model = AutoModelForCausalLM.from_pretrained(
            self.base_model_name,
            trust_remote_code=True,
            torch_dtype=torch.bfloat16,
            device_map=self.device,
            cache_dir="/home/ubuntu/karthik-ragunath-ananda-kumar-utah/text-to-manim/deepseek-ai/model/models--deepseek-ai--deepseek-coder-7b-instruct-v1.5"
        )
        
        # Load tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(self.base_model_name)
        
        # Set model to evaluation mode
        self.model.eval()
        logger.info("🎉 Base model loaded successfully!")
    
    def generate_code(self, question: str, max_new_tokens: int = 3600, temperature: float = 0.8) -> str:
        """Generate code for a given question"""
        # Format the prompt (same as training format)
        prompt = f"### Question:\n{question}\n\n### Code:\n"
        
        # Tokenize
        inputs = self.tokenizer(prompt, return_tensors="pt").to(self.model.device)
        
        # Generate with standard parameters
        try:
            with torch.no_grad():
                outputs = self.model.generate(
                    **inputs,
                    max_new_tokens=max_new_tokens,
                    temperature=temperature,
                    do_sample=True,
                    top_p=0.9,
                    top_k=50,
                    pad_token_id=self.tokenizer.eos_token_id,
                    eos_token_id=self.tokenizer.eos_token_id,
                    repetition_penalty=1.1,
                    no_repeat_ngram_size=3,
                )
            
            # Decode and extract generated code
            generated_text = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
            generated_code = generated_text[len(prompt):]
            
            # Clean up generated code
            if "<|EOT|>" in generated_code:
                generated_code = generated_code.split("<|EOT|>")[0]
            
            return generated_code.strip()
            
        except Exception as e:
            logger.error(f"Base generation failed: {e}")
            return f"ERROR: Base generation failed - {e}"

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models on startup"""
    logger.info("Loading Manim models...")
    
    # Model paths
    base_model_name = "deepseek-ai/deepseek-coder-7b-instruct-v1.5"
    lora_adapter_path = "/home/ubuntu/github/cursor-V2/deepseek-coder-manim-lora"
    
    try:
        # Load finetuned model
        logger.info("Loading finetuned LoRA model...")
        models["finetuned"] = LoRAModelHandler(base_model_name, lora_adapter_path)
        
        # Load base model
        logger.info("Loading base model...")
        models["base"] = BaseModelHandler(base_model_name)
        
        logger.info("✅ All models loaded successfully!")
        
    except Exception as e:
        logger.error(f"❌ Failed to load models: {e}")
        raise e
    
    yield
    
    # Cleanup on shutdown
    logger.info("Shutting down models...")
    models.clear()

# Create FastAPI app
app = FastAPI(title="Manim Model Server", lifespan=lifespan)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "models_loaded": list(models.keys()),
        "timestamp": time.time()
    }

@app.post("/generate", response_model=GenerationResponse)
async def generate_code(request: GenerationRequest):
    """Generate manim code using the specified model"""
    
    if request.model_type not in models:
        raise HTTPException(
            status_code=400, 
            detail=f"Model type '{request.model_type}' not available. Available: {list(models.keys())}"
        )
    
    try:
        model_handler = models[request.model_type]
        
        logger.info(f"Generating code with {request.model_type} model")
        start_time = time.time()
        
        generated_code = model_handler.generate_code(
            request.prompt,
            max_new_tokens=request.max_new_tokens,
            temperature=request.temperature
        )
        
        generation_time = time.time() - start_time
        
        logger.info(f"Generated {len(generated_code)} characters in {generation_time:.2f}s")
        
        return GenerationResponse(
            generated_code=generated_code,
            generation_time=generation_time,
            model_used=request.model_type
        )
        
    except Exception as e:
        logger.error(f"Generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

@app.get("/models")
async def list_models():
    """List available models"""
    return {
        "available_models": list(models.keys()),
        "model_info": {
            "finetuned": "LoRA fine-tuned DeepSeek model for manim",
            "base": "Base DeepSeek-coder model without fine-tuning"
        }
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Manim Model Server")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind to")
    parser.add_argument("--port", type=int, default=8001, help="Port to bind to")
    parser.add_argument("--log-level", default="info", help="Log level")
    
    args = parser.parse_args()
    
    uvicorn.run(
        "manim_model_server:app",
        host=args.host,
        port=args.port,
        log_level=args.log_level,
        reload=False
    ) 