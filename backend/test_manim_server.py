#!/usr/bin/env python3
"""
Test script for the Manim Model Server
Tests both finetuned and base models with sample prompts
"""

import httpx
import asyncio
import json
import time
from typing import Dict, Any

MANIM_SERVER_URL = "http://localhost:8001"

async def test_health_check():
    """Test the health check endpoint"""
    print("🔍 Testing health check...")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{MANIM_SERVER_URL}/health")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Health check passed: {data}")
                return True
            else:
                print(f"❌ Health check failed: {response.status_code} - {response.text}")
                return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

async def test_models_endpoint():
    """Test the models listing endpoint"""
    print("📋 Testing models endpoint...")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{MANIM_SERVER_URL}/models")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Models endpoint working: {data}")
                return True
            else:
                print(f"❌ Models endpoint failed: {response.status_code} - {response.text}")
                return False
    except Exception as e:
        print(f"❌ Models endpoint error: {e}")
        return False

async def test_code_generation(model_type: str, prompt: str):
    """Test code generation for a specific model"""
    print(f"🧪 Testing {model_type} model with prompt: '{prompt[:50]}...'")
    
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            start_time = time.time()
            
            response = await client.post(
                f"{MANIM_SERVER_URL}/generate",
                json={
                    "prompt": prompt,
                    "model_type": model_type,
                    "max_new_tokens": 512,  # Smaller for testing
                    "temperature": 0.8
                }
            )
            
            generation_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ {model_type} generation successful!")
                print(f"⏱️  Generation time: {generation_time:.2f}s")
                print(f"📊 Server reported time: {data.get('generation_time', 'N/A')}s")
                print(f"📝 Generated code length: {len(data.get('generated_code', ''))} characters")
                print(f"🎯 Model used: {data.get('model_used', 'N/A')}")
                print("📋 Generated code preview:")
                print("-" * 50)
                print(data.get('generated_code', '')[:300] + "...")
                print("-" * 50)
                return True
            else:
                print(f"❌ {model_type} generation failed: {response.status_code} - {response.text}")
                return False
                
    except Exception as e:
        print(f"❌ {model_type} generation error: {e}")
        return False

async def main():
    """Main test function"""
    print("🚀 Starting Manim Model Server Tests")
    print("=" * 60)
    
    # Test prompts
    test_prompts = [
        "Create a simple scene that displays the text 'Hello Manim' in the center of the screen.",
        "Create an animation showing a circle transforming into a square.",
        "Create a scene with a mathematical equation f(x) = x^2 and show its graph."
    ]
    
    # Step 1: Health check
    if not await test_health_check():
        print("❌ Server is not healthy. Please check if it's running.")
        return
    
    print()
    
    # Step 2: Models endpoint
    if not await test_models_endpoint():
        print("❌ Models endpoint is not working.")
        return
    
    print()
    
    # Step 3: Test both models
    models_to_test = ["finetuned", "base"]
    
    for model_type in models_to_test:
        print(f"🎯 Testing {model_type} model")
        print("-" * 40)
        
        # Test with first prompt
        success = await test_code_generation(model_type, test_prompts[0])
        
        if success:
            print(f"✅ {model_type} model is working correctly!")
        else:
            print(f"❌ {model_type} model test failed!")
        
        print()
    
    print("🏁 Testing completed!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main()) 