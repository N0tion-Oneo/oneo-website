#!/bin/bash

# Script to start the Django backend server with Celery

echo "🚀 Starting Oneo Backend (Django + Celery)..."
echo ""

# Get the script's directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"

# Check if backend directory exists
if [ ! -d "$BACKEND_DIR" ]; then
    echo "❌ Error: Backend directory not found at $BACKEND_DIR"
    exit 1
fi

# Navigate to backend directory
cd "$BACKEND_DIR"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Error: Virtual environment not found."
    echo "Please run: cd backend && python3 -m venv venv && pip install -r requirements.txt"
    exit 1
fi

# Activate virtual environment
echo "📦 Activating virtual environment..."
source venv/bin/activate

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found. Creating from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ Created .env file. Please update with your configuration."
    else
        echo "❌ Error: .env.example not found."
        exit 1
    fi
fi

# Note: Database checks and migrations are skipped in this script
# Run manually if needed: python manage.py migrate

# Cleanup function to kill background processes
cleanup() {
    echo ""
    echo "🛑 Shutting down..."
    echo "   Stopping Celery worker..."
    pkill -f "celery -A config" 2>/dev/null
    sleep 1
    echo "✅ Shutdown complete"
    exit 0
}

# Trap signals to cleanup on exit
trap cleanup SIGINT SIGTERM EXIT

# Start Celery worker with beat scheduler in background
echo ""
echo "🔄 Starting Celery worker with beat scheduler..."
celery -A config worker -B -l warning --concurrency=2 --without-heartbeat &
CELERY_PID=$!

# Wait for Celery to initialize
sleep 3
echo "✅ Celery started (PID: $CELERY_PID)"

# Start the development server
echo ""
echo "✨ Starting Django development server..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📍 Backend:    http://localhost:8000"
echo "📍 Admin:      http://localhost:8000/admin/"
echo "📍 API docs:   http://localhost:8000/api/docs/"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔄 Celery is running background tasks (automations, bottleneck detection)"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

python manage.py runserver
