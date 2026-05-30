#!/bin/bash
# Quick start script for backend

echo "🤖 Starting AI Mock Interview Backend..."

cd "$(dirname "$0")/backend"

# Activate virtual environment if exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Run FastAPI server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
