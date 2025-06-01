#!/usr/bin/env python3
"""
Test script for Whisper speech-to-text integration.
Tests the Whisper service endpoints and functionality.
"""

import httpx
import asyncio
import json
import time
import tempfile
import wave
import numpy as np
from typing import Dict, Any

# Test configuration
BACKEND_URL = "http://localhost:8000"
WHISPER_ENDPOINTS = {
    "health": f"{BACKEND_URL}/whisper/health",
    "transcribe": f"{BACKEND_URL}/whisper/transcribe", 
    "info": f"{BACKEND_URL}/whisper/info"
}

async def test_whisper_health() -> Dict[str, Any]:
    """Test Whisper health endpoint."""
    print("\n🔍 Testing Whisper health check...")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(WHISPER_ENDPOINTS["health"])
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Health check passed: {data}")
                return {"success": True, "data": data}
            else:
                print(f"❌ Health check failed: {response.status_code}")
                return {"success": False, "error": f"Status code: {response.status_code}"}
                
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return {"success": False, "error": str(e)}

async def test_whisper_info() -> Dict[str, Any]:
    """Test Whisper info endpoint."""
    print("\n📋 Testing Whisper info endpoint...")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(WHISPER_ENDPOINTS["info"])
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Info retrieved: {json.dumps(data, indent=2)}")
                return {"success": True, "data": data}
            else:
                print(f"❌ Info failed: {response.status_code}")
                return {"success": False, "error": f"Status code: {response.status_code}"}
                
    except Exception as e:
        print(f"❌ Info error: {e}")
        return {"success": False, "error": str(e)}

def generate_test_audio(duration: float = 2.0, sample_rate: int = 16000) -> bytes:
    """Generate a simple test audio file."""
    # Generate a sine wave (440 Hz - A note)
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    frequency = 440  # A note
    audio_data = np.sin(2 * np.pi * frequency * t)
    
    # Convert to 16-bit PCM
    audio_data = (audio_data * 32767).astype(np.int16)
    
    # Create WAV file in memory
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
        with wave.open(temp_file.name, 'wb') as wav_file:
            wav_file.setnchannels(1)  # Mono
            wav_file.setsampwidth(2)  # 16-bit
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(audio_data.tobytes())
        
        # Read file back as bytes
        with open(temp_file.name, 'rb') as f:
            return f.read()

async def test_whisper_transcription() -> Dict[str, Any]:
    """Test Whisper transcription endpoint with generated audio."""
    print("\n🎤 Testing Whisper transcription...")
    
    try:
        # Generate test audio
        print("🔧 Generating test audio...")
        audio_data = generate_test_audio(duration=1.0)
        print(f"📦 Generated audio: {len(audio_data)} bytes")
        
        # Prepare multipart form data
        files = {
            'audio_file': ('test_audio.wav', audio_data, 'audio/wav')
        }
        
        start_time = time.time()
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                WHISPER_ENDPOINTS["transcribe"],
                files=files
            )
            
        processing_time = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Transcription successful in {processing_time:.2f}s")
            print(f"📝 Result: {json.dumps(data, indent=2)}")
            return {"success": True, "data": data, "processing_time": processing_time}
        else:
            print(f"❌ Transcription failed: {response.status_code}")
            print(f"📄 Response: {response.text}")
            return {"success": False, "error": f"Status code: {response.status_code}"}
            
    except Exception as e:
        print(f"❌ Transcription error: {e}")
        return {"success": False, "error": str(e)}

async def test_whisper_with_text_audio() -> Dict[str, Any]:
    """Test with a more realistic audio sample."""
    print("\n🎵 Testing with speech-like audio...")
    
    try:
        # Generate a more complex audio pattern that might resemble speech
        sample_rate = 16000
        duration = 2.0
        t = np.linspace(0, duration, int(sample_rate * duration), False)
        
        # Create a complex waveform with multiple frequencies
        audio_data = (
            0.3 * np.sin(2 * np.pi * 300 * t) +  # Lower frequency
            0.3 * np.sin(2 * np.pi * 800 * t) +  # Mid frequency  
            0.2 * np.sin(2 * np.pi * 1200 * t) + # Higher frequency
            0.1 * np.random.normal(0, 0.1, len(t))  # Add some noise
        )
        
        # Normalize and convert to 16-bit PCM
        audio_data = audio_data / np.max(np.abs(audio_data))
        audio_data = (audio_data * 32767).astype(np.int16)
        
        # Create WAV file
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
            with wave.open(temp_file.name, 'wb') as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2) 
                wav_file.setframerate(sample_rate)
                wav_file.writeframes(audio_data.tobytes())
            
            with open(temp_file.name, 'rb') as f:
                audio_bytes = f.read()
        
        print(f"📦 Generated complex audio: {len(audio_bytes)} bytes")
        
        files = {
            'audio_file': ('speech_test.wav', audio_bytes, 'audio/wav')
        }
        
        start_time = time.time()
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                WHISPER_ENDPOINTS["transcribe"],
                files=files,
                data={'language': 'en'}  # Force English
            )
            
        processing_time = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Complex audio transcription successful in {processing_time:.2f}s")
            print(f"📝 Result: {json.dumps(data, indent=2)}")
            return {"success": True, "data": data, "processing_time": processing_time}
        else:
            print(f"❌ Complex audio transcription failed: {response.status_code}")
            return {"success": False, "error": f"Status code: {response.status_code}"}
            
    except Exception as e:
        print(f"❌ Complex audio error: {e}")
        return {"success": False, "error": str(e)}

async def main():
    """Run all Whisper integration tests."""
    print("🚀 Starting Whisper Integration Tests")
    print("=" * 50)
    
    test_results = {}
    
    # Test 1: Health Check
    test_results["health"] = await test_whisper_health()
    
    # Test 2: Info Endpoint
    test_results["info"] = await test_whisper_info()
    
    # Test 3: Basic Transcription
    test_results["transcription"] = await test_whisper_transcription()
    
    # Test 4: Complex Audio
    test_results["complex_audio"] = await test_whisper_with_text_audio()
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)
    
    total_tests = len(test_results)
    passed_tests = sum(1 for result in test_results.values() if result.get("success", False))
    
    for test_name, result in test_results.items():
        status = "✅ PASS" if result.get("success", False) else "❌ FAIL"
        print(f"{test_name.upper()}: {status}")
        
        if not result.get("success", False) and "error" in result:
            print(f"  Error: {result['error']}")
    
    print(f"\nOverall: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("🎉 All Whisper integration tests passed!")
        print("\nNext steps:")
        print("1. ✅ Backend Whisper service is working")
        print("2. ✅ Frontend can now use Whisper for speech-to-text")
        print("3. ✅ Voice input will be more reliable than Web Speech API")
    else:
        print("⚠️  Some tests failed. Check the backend setup:")
        print("1. Ensure backend is running: python -m uvicorn main:app --reload")
        print("2. Check Whisper dependencies: pip install -r requirements.txt")
        print("3. Verify Whisper model download completed")
        print("4. Check logs for detailed error information")

if __name__ == "__main__":
    asyncio.run(main()) 