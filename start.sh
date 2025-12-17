#!/bin/bash

# Start Agent Synapse - Backend + Frontend

echo "🚀 Starting Agent Synapse..."
echo ""

# Kill any existing processes on port 8000
echo "Cleaning up port 8000..."
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
sleep 1

# Start backend in background
echo "Starting backend server..."
cd "$(dirname "$0")"
python backend/main.py > /tmp/agent-synapse-backend.log 2>&1 &
BACKEND_PID=$!

# Wait for backend to start
echo "Waiting for backend to start..."
sleep 3

# Check if backend is running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Backend failed to start. Check /tmp/agent-synapse-backend.log"
    exit 1
fi

# Check if port 8000 is listening
if ! lsof -ti:8000 > /dev/null 2>&1; then
    echo "❌ Backend not listening on port 8000. Check /tmp/agent-synapse-backend.log"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo "✅ Backend running on http://localhost:8000"
echo ""

# Start simple HTTP server for frontend (to avoid CORS issues)
echo "Starting frontend server..."
python3 -m http.server 8080 > /tmp/agent-synapse-frontend.log 2>&1 &
FRONTEND_PID=$!

sleep 1

echo "✅ Frontend server running on http://localhost:8080"
echo ""

# Open browser
echo "Opening browser..."
open "http://localhost:8080/demo.html"

echo ""
echo "🎉 Agent Synapse is running!"
echo ""
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:8080/demo.html"
echo "API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Wait for user interrupt
trap "echo ''; echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait

