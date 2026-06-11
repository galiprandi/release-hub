#!/bin/bash

# Configuration
PORT=30779
APP_NAME="ReleaseHub"

# Function to check if the port is in use
is_port_in_use() {
    lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null
}

echo "🚀 Launching $APP_NAME..."

# Healthcheck
./scripts/healthcheck.sh

if is_port_in_use; then
    echo "✨ $APP_NAME is already running on port $PORT."
    echo "🌐 Opening browser..."
    open "http://localhost:$PORT"
else
    # 🔍 Auto-update check
    if [ -d ".git" ]; then
        echo "🔍 Checking for updates..."
        # Ensure upstream is set
        if ! git rev-parse @{u} &>/dev/null; then
            git branch --set-upstream-to=origin/main main &>/dev/null || true
        fi
        # Pull latest changes
        if git pull &>/dev/null; then
            echo "✨ Latest changes pulled successfully."
            npm install
            npm run build
            echo "✅ Update complete!"
        else
            echo "⚠️  Could not pull updates (offline or network issue)."
        fi
    fi

    echo "📦 Starting $APP_NAME on port $PORT..."
    
    # Check if we are in the right directory
    if [ ! -f "package.json" ]; then
        echo "❌ Error: package.json not found. Please run this script from the project root."
        exit 1
    fi

    # Deep healthcheck
    if ! ./scripts/healthcheck.sh --deps --build; then
        echo "🔄 Attempting to fix environment..."
        if [ ! -d "node_modules" ]; then
            echo "📥 node_modules not found. Installing dependencies..."
            npm install
        fi
        if [ ! -d "dist" ]; then
            echo "🛠️ Building application..."
            npm run build
        fi
    fi

    # Start the preview server
    echo "⚡ Starting preview server..."
    npm run preview -- --port $PORT --open
fi
