# Whisper Speech-to-Text Integration

## Overview

This project now includes a Whisper-based speech-to-text solution that replaces the unreliable browser-based Web Speech API. Whisper provides:

- ✅ **Better Accuracy**: Higher quality transcriptions
- ✅ **No Network Dependencies**: Works offline once model is loaded
- ✅ **Cross-Browser Support**: Works in all modern browsers
- ✅ **No Permission Issues**: Avoids common Web Speech API problems
- ✅ **Multiple Languages**: Supports 99+ languages

## Architecture

```
Frontend (Browser)          Backend (Python)
┌─────────────────┐         ┌──────────────────┐
│ Audio Recording │────────▶│ Whisper Model    │
│ (MediaRecorder) │         │ (OpenAI Whisper) │
└─────────────────┘         └──────────────────┘
        │                            │
        ▼                            ▼
┌─────────────────┐         ┌──────────────────┐
│ Audio Blob      │────────▶│ Text Response    │
│ (WebM/Opus)     │         │ (JSON)           │
└─────────────────┘         └──────────────────┘
```

## Setup Instructions

### 1. Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

The requirements include:
- `openai-whisper`: Core Whisper model
- `librosa`: Audio processing
- `soundfile`: Audio file handling
- `torch`: PyTorch for model execution

### 2. Download Whisper Model

The first time you use Whisper, it will automatically download the model:

```python
# Models available (by accuracy/speed):
# - tiny: Fastest, least accurate (~39 MB)
# - base: Balanced (~74 MB) - Default
# - small: Better accuracy (~244 MB)  
# - medium: High accuracy (~769 MB)
# - large: Best accuracy (~1550 MB)
```

### 3. Test Whisper Service

```bash
# Start the backend
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Test Whisper health
curl -X POST http://localhost:8000/whisper/health

# Expected response:
{
  "status": "healthy",
  "model_size": "base", 
  "device": "cuda",
  "message": "Whisper service is ready"
}
```

## API Endpoints

### 1. Health Check
```http
POST /whisper/health
```

**Response:**
```json
{
  "status": "healthy",
  "model_size": "base",
  "device": "cuda",
  "message": "Whisper service is ready"
}
```

### 2. Audio File Transcription
```http
POST /whisper/transcribe
Content-Type: multipart/form-data

audio_file: <audio_file>
language: en  # Optional
```

**Response:**
```json
{
  "text": "Hello, this is a test transcription.",
  "language": "en",
  "success": true,
  "processing_time": 1.23
}
```

### 3. Service Information
```http
GET /whisper/info
```

**Response:**
```json
{
  "status": "available",
  "model_info": {
    "model_size": "base",
    "device": "cuda",
    "is_loaded": true
  },
  "supported_languages": ["en", "es", "fr", "de", ...]
}
```

## Frontend Usage

The frontend automatically uses Whisper when the voice input button is clicked:

```typescript
// New hook replaces useSpeechRecognition
import { useWhisperRecognition } from '../hooks/useWhisperRecognition';

const {
  isRecording,
  isProcessing, 
  error,
  startRecording,
  stopRecording
} = useWhisperRecognition({
  onTranscript: (text) => {
    // Handle transcribed text
    console.log('Transcribed:', text);
  }
});
```

## Audio Processing Flow

1. **Recording Start**: User clicks microphone button
2. **Audio Capture**: MediaRecorder captures audio as WebM/Opus
3. **Recording Stop**: User clicks stop or after timeout
4. **Audio Upload**: Frontend sends audio blob to backend
5. **Whisper Processing**: Backend transcribes using Whisper
6. **Text Return**: Transcribed text sent back to frontend
7. **UI Update**: Text appears in prompt input field

## Performance Considerations

### Model Sizes vs Performance

| Model | Size | Speed | Accuracy | Use Case |
|-------|------|-------|----------|----------|
| tiny  | 39MB | Very Fast | Good | Quick testing |
| base  | 74MB | Fast | Better | **Recommended** |
| small | 244MB | Medium | High | Production |
| medium | 769MB | Slow | Very High | Critical accuracy |
| large | 1.5GB | Very Slow | Best | Maximum accuracy |

### Hardware Recommendations

- **CPU Only**: Works but slower (~3-5s per audio clip)
- **GPU (CUDA)**: Much faster (~0.5-1s per audio clip)  
- **Memory**: 2GB+ RAM for base model, 4GB+ for larger models

### Audio Quality Tips

- **Microphone**: Use good quality microphone
- **Environment**: Reduce background noise
- **Speaking**: Speak clearly and at normal pace
- **Length**: Keep recordings under 30 seconds for best results

## Language Support

Whisper supports 99+ languages including:

```python
# Major languages
"en": "English"
"es": "Spanish" 
"fr": "French"
"de": "German"
"it": "Italian"
"pt": "Portuguese"
"ru": "Russian"
"ja": "Japanese"
"ko": "Korean"
"zh": "Chinese"
"ar": "Arabic"
"hi": "Hindi"
# ... and many more
```

## Troubleshooting

### 1. Model Download Issues
```bash
# Manual model download
python -c "import whisper; whisper.load_model('base')"
```

### 2. CUDA Issues
```bash
# Check CUDA availability
python -c "import torch; print(torch.cuda.is_available())"

# Force CPU usage
export CUDA_VISIBLE_DEVICES=""
```

### 3. Audio Format Issues
- **Supported**: WAV, MP3, M4A, WebM, OGG
- **Recommended**: WebM with Opus codec (browser default)
- **Sample Rate**: 16kHz optimal, auto-converted if different

### 4. Memory Issues
```bash
# Use smaller model
# In whisper_service.py, change:
whisper_service = WhisperTranscriptionService(model_size="tiny")
```

### 5. Permission Issues
- Ensure microphone permissions granted in browser
- Check browser console for errors
- Test with different browsers

## Configuration Options

### Backend Configuration

Edit `whisper_service.py`:

```python
# Change model size
_whisper_service = WhisperTranscriptionService(model_size="small")

# Force CPU usage  
_whisper_service = WhisperTranscriptionService(device="cpu")

# Custom options
options = {
    "fp16": False,  # Disable FP16 for CPU
    "language": "en",  # Force English
    "temperature": 0.0  # Deterministic output
}
```

### Frontend Configuration

Edit `useWhisperRecognition.ts`:

```typescript
const {
  // ...
} = useWhisperRecognition({
  onTranscript: handleTranscript,
  serverUrl: 'http://localhost:8000',  // Backend URL
  language: 'en'  // Force language (optional)
});
```

## Migration from Web Speech API

The Whisper integration is designed as a drop-in replacement:

### Before (Web Speech API):
```typescript
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

const { isListening, startListening, stopListening } = useSpeechRecognition({
  onTranscript: handleTranscript
});
```

### After (Whisper):
```typescript
import { useWhisperRecognition } from '../hooks/useWhisperRecognition';

const { isListening, startListening, stopListening } = useWhisperRecognition({
  onTranscript: handleTranscript
});
```

**Key Differences:**
- `isListening` now includes processing time
- `isRecording` and `isProcessing` available separately  
- Better error handling and status reporting
- No network dependency issues

## Security Considerations

- **Audio Data**: Processed locally, not sent to external services
- **Privacy**: No audio data stored permanently
- **HTTPS**: Not required (unlike Web Speech API)
- **Permissions**: Standard microphone access only

## Monitoring and Logging

Backend logs provide detailed information:

```bash
# View Whisper processing logs
tail -f logs/whisper.log

# Key log entries:
# ✅ Whisper model loaded successfully  
# 🎤 Starting audio recording...
# 📦 Audio blob created: 45234 bytes
# ✅ Transcription successful in 1.23s: "Hello world"
```

## Future Enhancements

- [ ] Real-time streaming transcription
- [ ] Custom model fine-tuning
- [ ] Voice activity detection
- [ ] Speaker identification
- [ ] Noise reduction preprocessing
- [ ] Multiple audio format support

## Support

For issues or questions:

1. Check logs for error messages
2. Verify model download completed
3. Test with simple audio files
4. Check GPU/CUDA availability
5. Try different model sizes

The Whisper integration provides a robust, accurate alternative to browser-based speech recognition with better reliability and offline capabilities. 