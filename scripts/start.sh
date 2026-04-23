#!/bin/bash

# Configuration
PORT=30779
APP_NAME="ReleaseHub"

# Function to check if the port is in use
is_port_in_use() {
    lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null
}

echo "🚀 Launching $APP_NAME..."

if is_port_in_use; then
    echo "✨ $APP_NAME is already running on port $PORT."
    echo "🌐 Opening browser..."
    open "http://localhost:$PORT"
else
    # 🔍 Auto-update check
    if [ -d ".git" ]; then
        echo "🔍 Checking for updates..."
        # Try a quick fetch (timeout prevents hanging if offline)
        if git fetch --timeout=3 origin main &>/dev/null; then
            LOCAL=$(git rev-parse HEAD)
            REMOTE=$(git rev-parse @{u})
            if [ "$LOCAL" != "$REMOTE" ]; then
                echo "✨ New version detected. Updating $APP_NAME..."
                git pull origin main
                npm install
                npm run build
                echo "✅ Update complete!"
            fi
        fi
    fi

    echo "📦 Starting $APP_NAME on port $PORT..."
    
    # Check if we are in the right directory
    if [ ! -f "package.json" ]; then
        echo "❌ Error: package.json not found. Please run this script from the project root."
        exit 1
    fi

    # Install dependencies if node_modules is missing
    if [ ! -d "node_modules" ]; then
        echo "📥 node_modules not found. Installing dependencies..."
        npm install
    fi

    # Build the app if dist is missing
    if [ ! -d "dist" ]; then
        echo "🛠️ Building application..."
        npm run build
    fi

    # Start the preview server
    echo "⚡ Starting preview server..."
    npm run preview -- --port $PORT --open
fi
