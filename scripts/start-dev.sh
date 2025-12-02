#!/bin/bash

# Script to start both backend and frontend servers concurrently

echo "🚀 Starting Oneo Development Environment..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get the script's directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if both scripts exist
if [ ! -f "$SCRIPT_DIR/start-backend.sh" ] || [ ! -f "$SCRIPT_DIR/start-frontend.sh" ]; then
    echo "❌ Error: Required scripts not found"
    exit 1
fi

# Function to handle cleanup
cleanup() {
    echo ""
    echo "🛑 Shutting down development servers..."
    kill $(jobs -p) 2>/dev/null
    exit
}

# Trap Ctrl+C and call cleanup
trap cleanup INT TERM

echo "Starting Backend and Frontend servers..."
echo ""
echo "📍 Backend: http://localhost:8000"
echo "📍 Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Start backend in background
"$SCRIPT_DIR/start-backend.sh" &
BACKEND_PID=$!

# Give backend a moment to start
sleep 2

# Start frontend in foreground (so we can see logs)
"$SCRIPT_DIR/start-frontend.sh" &
FRONTEND_PID=$!

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
