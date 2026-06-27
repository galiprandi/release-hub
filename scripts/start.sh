#!/bin/bash

# Configuration
PORT=30779
APP_NAME="ReleaseHub"
MAX_RETRIES=3

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info()  { echo -e "${GREEN}ℹ️  $1${NC}"; }
log_warn()  { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Retry function: runs a command up to MAX_RETRIES times
# Usage: retry "description" command args...
retry() {
    local desc="$1"
    shift
    local attempt=1
    while [ $attempt -le $MAX_RETRIES ]; do
        echo "   Attempt $attempt/$MAX_RETRIES: $desc"
        if "$@"; then
            return 0
        fi
        attempt=$((attempt + 1))
        if [ $attempt -le $MAX_RETRIES ]; then
            echo "   Retrying in 3s..."
            sleep 3
        fi
    done
    return 1
}

# Function to check if the port is in use
is_port_in_use() {
    lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1
}

# Function to ensure dependencies are installed
ensure_deps() {
    if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
        log_info "Installing dependencies..."
        if ! retry "npm install" npm install; then
            log_error "Failed to install dependencies after $MAX_RETRIES attempts."
            return 1
        fi
    fi
    return 0
}

# Function to check if build is stale (commit hash changed since last build)
is_build_stale() {
    local current_hash
    current_hash=$(git rev-parse HEAD 2>/dev/null || echo "")
    local built_hash=""
    if [ -f "dist/.build-hash" ]; then
        built_hash=$(cat dist/.build-hash 2>/dev/null || echo "")
    fi
    # Stale if: no dist, no hash file, or hash differs from current commit
    if [ ! -d "dist" ] || [ ! -f "dist/index.html" ] || [ -z "$built_hash" ] || [ "$built_hash" != "$current_hash" ]; then
        return 0  # true = stale
    fi
    return 1  # false = fresh
}

# Function to run build and stamp the commit hash
do_build() {
    if ! retry "npm run build" npm run build; then
        log_error "Failed to build application after $MAX_RETRIES attempts."
        return 1
    fi
    # Stamp the build with current commit hash
    git rev-parse HEAD > dist/.build-hash 2>/dev/null || true
    return 0
}

# Function to ensure build is up to date
ensure_build() {
    if is_build_stale; then
        log_info "Building application..."
        do_build || return 1
    fi
    return 0
}

echo "🚀 Launching $APP_NAME..."

# Healthcheck
./scripts/healthcheck.sh || {
    log_error "Healthcheck failed. Please ensure Node.js and npm are installed."
    exit 1
}

if is_port_in_use; then
    echo "✨ $APP_NAME is already running on port $PORT."
    echo "🌐 Opening browser..."
    open "http://localhost:$PORT" 2>/dev/null || xdg-open "http://localhost:$PORT" 2>/dev/null || true
else
    # 🔍 Auto-update check
    if [ -d ".git" ]; then
        echo "🔍 Checking for updates..."
        # Ensure upstream is set
        if ! git rev-parse @{u} &>/dev/null; then
            git branch --set-upstream-to=origin/main main &>/dev/null || true
        fi
        # Capture hash before pull to detect actual changes
        LOCAL_HASH=$(git rev-parse HEAD 2>/dev/null || echo "")
        # Pull latest changes (non-fatal)
        if git pull --ff-only &>/dev/null; then
            NEW_HASH=$(git rev-parse HEAD 2>/dev/null || echo "")
            if [ "$LOCAL_HASH" != "$NEW_HASH" ] && [ -n "$NEW_HASH" ]; then
                echo "✨ Updates pulled: $LOCAL_HASH → $NEW_HASH"
                log_info "Reinstalling dependencies..."
                retry "npm install" npm install || log_warn "npm install failed, using existing node_modules."
            else
                echo "✓ Already up to date ($NEW_HASH)"
            fi
        else
            log_warn "Could not pull updates (offline or network issue). Continuing with local version."
        fi

        # Always ensure deps and build are valid
        ensure_deps || exit 1
        ensure_build || exit 1
    else
        # Not a git repo — just ensure deps and build
        ensure_deps || exit 1
        ensure_build || exit 1
    fi

    echo "📦 Starting $APP_NAME on port $PORT..."

    # Check if we are in the right directory
    if [ ! -f "package.json" ]; then
        log_error "package.json not found. Please run this script from the project root."
        exit 1
    fi

    # Final validation: ensure dist exists and is valid
    if [ ! -f "dist/index.html" ]; then
        log_warn "Build output missing. Attempting rebuild..."
        if ! do_build; then
            log_error "Build failed. Cannot start server."
            exit 1
        fi
    fi

    # Start the preview server
    echo "⚡ Starting preview server..."
    npm run preview -- --port $PORT --open
fi
