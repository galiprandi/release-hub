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
    echo "📦 Building and starting $APP_NAME on port $PORT..."
    
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
