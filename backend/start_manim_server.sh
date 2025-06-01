#!/bin/bash

# Manim Model Server Startup Script
echo "🚀 Starting Manim Model Server..."

# Set environment variables
export CUDA_VISIBLE_DEVICES=0
export TRANSFORMERS_CACHE="/home/ubuntu/karthik-ragunath-ananda-kumar-utah/text-to-manim/deepseek-ai/model"

# Initialize conda (source the conda setup)
if [ -f "/home/ubuntu/miniconda3/etc/profile.d/conda.sh" ]; then
    source /home/ubuntu/miniconda3/etc/profile.d/conda.sh
elif [ -f "/home/ubuntu/anaconda3/etc/profile.d/conda.sh" ]; then
    source /home/ubuntu/anaconda3/etc/profile.d/conda.sh
elif [ -f "$HOME/miniconda3/etc/profile.d/conda.sh" ]; then
    source $HOME/miniconda3/etc/profile.d/conda.sh
elif [ -f "$HOME/anaconda3/etc/profile.d/conda.sh" ]; then
    source $HOME/anaconda3/etc/profile.d/conda.sh
else
    echo "⚠️  Conda installation not found in standard locations"
    echo "Trying to use conda from PATH..."
fi

# Check if required directories exist
LORA_PATH="/home/ubuntu/github/cursor-V2/deepseek-coder-manim-lora"
if [ ! -d "$LORA_PATH" ]; then
    echo "❌ LoRA adapter path not found: $LORA_PATH"
    echo "Please check if the path exists and contains the finetuned model."
    exit 1
fi

CACHE_DIR="/home/ubuntu/karthik-ragunath-ananda-kumar-utah/text-to-manim/deepseek-ai/model/models--deepseek-ai--deepseek-coder-7b-instruct-v1.5"
if [ ! -d "$CACHE_DIR" ]; then
    echo "❌ Model cache directory not found: $CACHE_DIR"
    echo "Please check if the base model is downloaded."
    exit 1
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Function to cleanup on exit
cleanup() {
    echo "🛑 Stopping Manim Model Server..."
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null
    fi
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Check if server is already running
if pgrep -f "manim_model_server" > /dev/null; then
    echo "⚠️  Manim model server appears to be already running"
    echo "Stopping existing server..."
    pkill -f "manim_model_server"
    sleep 5
fi

# Activate conda environment and start the server
echo "🔧 Activating conda environment: cursor-v2"
if conda activate cursor-v2; then
    echo "✅ Successfully activated conda environment"
else
    echo "❌ Failed to activate conda environment 'cursor-v2'"
    echo "Available environments:"
    conda env list
    exit 1
fi

# Start the server
echo "📦 Loading models (this may take a few minutes)..."
echo "📝 Logs will be saved to logs/manim_server.log"

cd /home/ubuntu/github/Cursor-V2-FrontEnd/backend

python manim_model_server.py \
    --host 127.0.0.1 \
    --port 8001 \
    --log-level info \
    > logs/manim_server.log 2>&1 &

SERVER_PID=$!

# Wait a bit and check if server started successfully
sleep 10

if kill -0 $SERVER_PID 2>/dev/null; then
    echo "✅ Manim Model Server started successfully!"
    echo "🌐 Server running on http://127.0.0.1:8001"
    echo "📊 Health check: http://127.0.0.1:8001/health"
    echo "📋 Available models: http://127.0.0.1:8001/models"
    echo ""
    echo "🔍 Monitoring server logs..."
    echo "Press Ctrl+C to stop the server"
    
    # Monitor the server
    while kill -0 $SERVER_PID 2>/dev/null; do
        sleep 1
    done
    
    echo "❌ Server process died unexpectedly"
    echo "Check logs/manim_server.log for details"
    exit 1
else
    echo "❌ Failed to start Manim Model Server"
    echo "Check logs/manim_server.log for details"
    cat logs/manim_server.log
    exit 1
fi 