# Manim Local Model Integration

This document describes the integration of local manim models (finetuned LoRA and base DeepSeek) with the Cursor-V2 frontend.

## Overview

The integration consists of:
1. **Manim Model Server** (`manim_model_server.py`) - Serves both finetuned and base models
2. **Backend Integration** - Modified `main.py` to route manim requests to local models
3. **Frontend Integration** - Model selection for "Main Finetuned" and "Deepseek" in manim language

## Model Mapping

| Frontend Model Name | Backend Model Type | Description |
|-------------------|-------------------|-------------|
| "Main Finetuned"  | `finetuned`       | LoRA fine-tuned DeepSeek model for manim |
| "Deepseek"        | `base`            | Base DeepSeek-coder model without fine-tuning |
| "Claude-3.5"      | External API      | Claude API (for comparison) |

## Prerequisites

### Required Model Files
1. **Base Model**: `deepseek-ai/deepseek-coder-7b-instruct-v1.5` 
   - Location: `/home/ubuntu/karthik-ragunath-ananda-kumar-utah/text-to-manim/deepseek-ai/model/models--deepseek-ai--deepseek-coder-7b-instruct-v1.5`

2. **LoRA Adapter**: Finetuned LoRA adapter for manim
   - Location: `/home/ubuntu/github/cursor-V2/deepseek-coder-manim-lora`

### Python Dependencies
Install the required packages:
```bash
pip install -r backend/manim_model_requirements.txt
```

## Setup Instructions

### 1. Verify Model Files
Ensure both model directories exist and contain the required files:
```bash
# Check base model
ls -la /home/ubuntu/karthik-ragunath-ananda-kumar-utah/text-to-manim/deepseek-ai/model/models--deepseek-ai--deepseek-coder-7b-instruct-v1.5

# Check LoRA adapter
ls -la /home/ubuntu/github/cursor-V2/deepseek-coder-manim-lora
```

### 2. Start the Manim Model Server
```bash
cd /home/ubuntu/github/Cursor-V2-FrontEnd/backend
./start_manim_server.sh
```

The script will:
- Check for required model files
- Load both finetuned and base models
- Start the server on `http://localhost:8001`
- Monitor the server and log output

### 3. Test the Server
Run the test script to verify everything is working:
```bash
cd /home/ubuntu/github/Cursor-V2-FrontEnd/backend
python test_manim_server.py
```

### 4. Start the Main Backend
In a separate terminal:
```bash
cd /home/ubuntu/github/Cursor-V2-FrontEnd/backend
python main.py
```

### 5. Start the Frontend
In another terminal:
```bash
cd /home/ubuntu/github/Cursor-V2-FrontEnd/frontend
npm start
```

## API Endpoints

### Manim Model Server (Port 8001)

#### Health Check
```bash
GET http://localhost:8001/health
```

#### List Models
```bash
GET http://localhost:8001/models
```

#### Generate Code
```bash
POST http://localhost:8001/generate
Content-Type: application/json

{
    "prompt": "Create a simple scene with text",
    "model_type": "finetuned",  // or "base"
    "max_new_tokens": 3600,
    "temperature": 0.8
}
```

### Main Backend Integration

The main backend (`main.py`) automatically routes manim requests:
- Language: `manim` + Model: `Main Finetuned` → Local `finetuned` model
- Language: `manim` + Model: `Deepseek` → Local `base` model
- Other languages continue using external APIs

## Usage in Frontend

1. Select **"manim"** as the language
2. Choose comparison mode (1 or 2 models)
3. Select models:
   - **"Main Finetuned"** for the LoRA fine-tuned model
   - **"Deepseek"** for the base model
   - **"Claude-3.5"** for external API comparison
4. Enter your manim prompt and generate code

## Troubleshooting

### Server Won't Start
1. Check if models exist in the specified paths
2. Verify GPU availability: `nvidia-smi`
3. Check logs: `cat backend/logs/manim_server.log`
4. Ensure port 8001 is free: `lsof -i :8001`

### Memory Issues
- The models require significant GPU memory
- Consider reducing `max_new_tokens` in requests
- Monitor GPU usage: `watch -n 1 nvidia-smi`

### Generation Errors
1. Check server logs for detailed error messages
2. Verify the prompt format matches training expectations
3. Test with simpler prompts first

### Connection Issues
1. Ensure the manim server is running: `curl http://localhost:8001/health`
2. Check backend logs for connection errors
3. Verify firewall settings

## Performance Notes

### Model Loading Time
- Initial startup takes 2-5 minutes to load both models
- Subsequent requests are fast (typically < 30 seconds)

### Generation Speed
- **Finetuned model**: ~10-30 seconds per generation
- **Base model**: ~15-45 seconds per generation
- Speed depends on prompt complexity and `max_new_tokens`

### Resource Usage
- **GPU Memory**: ~12-16GB total for both models
- **System RAM**: ~8-12GB
- **CPU**: Moderate usage during generation

## Monitoring

### Server Logs
```bash
tail -f backend/logs/manim_server.log
```

### Server Status
```bash
# Check if server is running
curl http://localhost:8001/health

# View loaded models
curl http://localhost:8001/models
```

### GPU Usage
```bash
watch -n 1 nvidia-smi
```

## Advanced Configuration

### Environment Variables
- `CUDA_VISIBLE_DEVICES`: Control GPU usage
- `TRANSFORMERS_CACHE`: Model cache directory

### Model Parameters
Adjust in `manim_model_server.py`:
- `max_new_tokens`: Maximum generation length
- `temperature`: Randomness (0.1-1.0)
- `top_p`, `top_k`: Sampling parameters

### Server Configuration
Modify `start_manim_server.sh`:
- `--port`: Change server port
- `--host`: Change bind address
- `--log-level`: Adjust logging verbosity

## File Structure

```
backend/
├── manim_model_server.py          # Main model server
├── manim_model_requirements.txt    # Python dependencies
├── start_manim_server.sh          # Startup script
├── test_manim_server.py           # Test script
├── MANIM_MODEL_SETUP.md           # This documentation
├── main.py                        # Modified backend with integration
├── templates/
│   └── manim.j2                   # Manim prompt template
└── logs/
    └── manim_server.log           # Server logs
```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review server logs for detailed error messages
3. Test individual components (server, backend, frontend)
4. Verify model files and dependencies 