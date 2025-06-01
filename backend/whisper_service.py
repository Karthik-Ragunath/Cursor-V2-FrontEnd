#!/usr/bin/env python3
"""
Whisper Speech-to-Text Service

This module provides speech-to-text transcription using OpenAI's Whisper model.
It's designed to replace the unreliable browser-based Web Speech API with
a more accurate and reliable local solution.
"""

import whisper
import tempfile
import os
import logging
from typing import Optional, Dict, Any
import torch
import librosa
import soundfile as sf
import numpy as np
from pathlib import Path

# Configure logging
logger = logging.getLogger(__name__)

class WhisperTranscriptionService:
    """
    Service for transcribing audio using OpenAI's Whisper model
    """
    
    def __init__(self, model_size: str = "base", device: Optional[str] = None):
        """
        Initialize the Whisper transcription service
        
        Args:
            model_size: Whisper model size ("tiny", "base", "small", "medium", "large")
            device: Device to run on ("cpu", "cuda", or None for auto-detection)
        """
        self.model_size = model_size
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.model = None
        self._load_model()
    
    def _load_model(self):
        """Load the Whisper model"""
        try:
            logger.info(f"Loading Whisper model '{self.model_size}' on {self.device}")
            self.model = whisper.load_model(self.model_size, device=self.device)
            logger.info("✅ Whisper model loaded successfully")
        except Exception as e:
            logger.error(f"❌ Failed to load Whisper model: {e}")
            raise
    
    def transcribe_audio_data(self, audio_data: bytes, 
                            sample_rate: int = 16000,
                            language: Optional[str] = None) -> Dict[str, Any]:
        """
        Transcribe audio data directly from bytes
        
        Args:
            audio_data: Raw audio data as bytes
            sample_rate: Sample rate of the audio
            language: Language code (e.g., "en", "es", "fr") or None for auto-detect
            
        Returns:
            Dict containing transcription result and metadata
        """
        try:
            # Create temporary file for audio data
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
                temp_path = temp_file.name
                
                # Convert bytes to numpy array and save as WAV
                audio_array = np.frombuffer(audio_data, dtype=np.float32)
                sf.write(temp_path, audio_array, sample_rate)
                
                # Transcribe the audio file
                result = self._transcribe_file(temp_path, language)
                
                # Clean up temporary file
                os.unlink(temp_path)
                
                return result
                
        except Exception as e:
            logger.error(f"Error transcribing audio data: {e}")
            return {
                "text": "",
                "error": str(e),
                "success": False
            }
    
    def transcribe_file(self, file_path: str, language: Optional[str] = None) -> Dict[str, Any]:
        """
        Transcribe audio from a file
        
        Args:
            file_path: Path to the audio file
            language: Language code or None for auto-detect
            
        Returns:
            Dict containing transcription result and metadata
        """
        if not os.path.exists(file_path):
            return {
                "text": "",
                "error": f"File not found: {file_path}",
                "success": False
            }
        
        return self._transcribe_file(file_path, language)
    
    def _transcribe_file(self, file_path: str, language: Optional[str] = None) -> Dict[str, Any]:
        """
        Internal method to transcribe audio file
        
        Args:
            file_path: Path to the audio file
            language: Language code or None for auto-detect
            
        Returns:
            Dict containing transcription result and metadata
        """
        try:
            logger.info(f"Transcribing audio file: {file_path}")
            
            # Prepare transcription options
            options = {
                "fp16": torch.cuda.is_available(),  # Use FP16 on GPU for speed
                "verbose": False
            }
            
            if language:
                options["language"] = language
            
            # Transcribe the audio
            result = self.model.transcribe(file_path, **options)
            
            # Extract text and metadata
            transcribed_text = result["text"].strip()
            detected_language = result.get("language", "unknown")
            
            logger.info(f"✅ Transcription complete. Length: {len(transcribed_text)} chars")
            logger.debug(f"Transcribed text: {transcribed_text[:100]}...")
            
            return {
                "text": transcribed_text,
                "language": detected_language,
                "success": True,
                "segments": result.get("segments", []),
                "error": None
            }
            
        except Exception as e:
            logger.error(f"❌ Transcription failed: {e}")
            return {
                "text": "",
                "error": str(e),
                "success": False,
                "language": "unknown"
            }
    
    def preprocess_audio(self, file_path: str, target_sr: int = 16000) -> str:
        """
        Preprocess audio file for better transcription results
        
        Args:
            file_path: Path to input audio file
            target_sr: Target sample rate
            
        Returns:
            Path to preprocessed audio file
        """
        try:
            # Load audio with librosa
            audio, sr = librosa.load(file_path, sr=target_sr, mono=True)
            
            # Apply noise reduction and normalization
            audio = librosa.effects.preemphasis(audio)
            audio = librosa.util.normalize(audio)
            
            # Create output path
            output_path = file_path.replace(".wav", "_processed.wav")
            
            # Save preprocessed audio
            sf.write(output_path, audio, target_sr)
            
            logger.info(f"✅ Audio preprocessed: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"❌ Audio preprocessing failed: {e}")
            return file_path  # Return original if preprocessing fails
    
    def get_model_info(self) -> Dict[str, Any]:
        """
        Get information about the loaded model
        
        Returns:
            Dict containing model information
        """
        return {
            "model_size": self.model_size,
            "device": self.device,
            "available_languages": whisper.tokenizer.LANGUAGES,
            "is_loaded": self.model is not None
        }

# Global instance
_whisper_service: Optional[WhisperTranscriptionService] = None

def get_whisper_service(model_size: str = "base") -> WhisperTranscriptionService:
    """
    Get or create a global Whisper service instance
    
    Args:
        model_size: Model size to use if creating new instance
        
    Returns:
        WhisperTranscriptionService instance
    """
    global _whisper_service
    
    if _whisper_service is None:
        _whisper_service = WhisperTranscriptionService(model_size=model_size)
    
    return _whisper_service

def transcribe_audio_bytes(audio_data: bytes, 
                          sample_rate: int = 16000,
                          language: Optional[str] = None) -> Dict[str, Any]:
    """
    Convenience function to transcribe audio data
    
    Args:
        audio_data: Raw audio data as bytes
        sample_rate: Sample rate of the audio
        language: Language code or None for auto-detect
        
    Returns:
        Dict containing transcription result
    """
    service = get_whisper_service()
    return service.transcribe_audio_data(audio_data, sample_rate, language)

def transcribe_audio_file(file_path: str, language: Optional[str] = None) -> Dict[str, Any]:
    """
    Convenience function to transcribe audio file
    
    Args:
        file_path: Path to audio file
        language: Language code or None for auto-detect
        
    Returns:
        Dict containing transcription result
    """
    service = get_whisper_service()
    return service.transcribe_file(file_path, language) 