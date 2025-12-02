#!/bin/bash

# Script to start the Django backend server

echo "🚀 Starting Oneo Backend (Django)..."
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

# Check database connection
echo "🔍 Checking database connection..."
python manage.py check --database default 2>/dev/null
if [ $? -ne 0 ]; then
    echo "⚠️  Warning: Database connection issues detected."
    echo "Make sure PostgreSQL is running and credentials in .env are correct."
fi

# Run migrations if needed
echo "📊 Checking for pending migrations..."
python manage.py migrate --check 2>/dev/null
if [ $? -ne 0 ]; then
    echo "⚠️  Pending migrations detected. Running migrations..."
    python manage.py migrate
fi

# Start the development server
echo ""
echo "✨ Starting Django development server..."
echo "📍 Backend will be available at: http://localhost:8000"
echo "📍 Admin panel: http://localhost:8000/admin/"
echo "📍 API docs: http://localhost:8000/api/docs/"
echo ""
echo "Press Ctrl+C to stop the server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

python manage.py runserver
