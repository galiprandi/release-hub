#!/bin/bash

# ReleaseHub Launcher — resilient update + launch for end users
#
# Flow:
#   1. Healthcheck (node, npm, git)
#   2. git pull --ff-only (non-fatal if offline)
#   3. Detect if build is stale (HEAD hash vs dist/.build-hash)
#   4. If stale: npm install (if needed) + npm run build + stamp hash
#   5. If server running AND build was just updated → kill old, start new
#   6. If server running AND build fresh → just open browser
#   7. If server not running → start it

# Configuration
PORT=30779
APP_NAME="ReleaseHub"
MAX_RETRIES=3
BUILD_HASH_FILE="dist/.build-hash"

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

# Function to kill any process on the port
kill_port() {
    local pid
    pid=$(lsof -Pi :$PORT -sTCP:LISTEN -t 2>/dev/null)
    if [ -n "$pid" ]; then
        log_info "Stopping existing server (PID $pid)..."
        kill "$pid" 2>/dev/null
        # Wait up to 5s for graceful shutdown
        local waited=0
        while is_port_in_use && [ $waited -lt 5 ]; do
            sleep 1
            waited=$((waited + 1))
        done
        # Force kill if still alive
        if is_port_in_use; then
            log_warn "Force killing..."
            kill -9 "$pid" 2>/dev/null
            sleep 1
        fi
        echo "✓ Server stopped."
    fi
}

# Function to get current commit hash
get_head_hash() {
    git rev-parse HEAD 2>/dev/null || echo ""
}

# Function to get the hash of the last build
get_built_hash() {
    if [ -f "$BUILD_HASH_FILE" ]; then
        cat "$BUILD_HASH_FILE" 2>/dev/null || echo ""
    else
        echo ""
    fi
}

# Function to check if build is stale
# Returns 0 (true) if stale, 1 (false) if fresh
is_build_stale() {
    local current_hash built_hash
    current_hash=$(get_head_hash)
    built_hash=$(get_built_hash)
    # Stale if: no dist, no index.html, no hash, or hash differs
    if [ ! -d "dist" ] || [ ! -f "dist/index.html" ] || [ -z "$built_hash" ] || [ "$built_hash" != "$current_hash" ]; then
        return 0
    fi
    return 1
}

# Function to run build and stamp the commit hash
do_build() {
    if ! retry "npm run build" npm run build; then
        log_error "Failed to build application after $MAX_RETRIES attempts."
        return 1
    fi
    # Stamp the build with current commit hash
    get_head_hash > "$BUILD_HASH_FILE" 2>/dev/null || true
    return 0
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

# === Main ===

echo "🚀 Launching $APP_NAME..."

# 1. Healthcheck
./scripts/healthcheck.sh || {
    log_error "Healthcheck failed. Please ensure Node.js and npm are installed."
    exit 1
}

# 2. Git pull (if git repo)
PULLED_CHANGES=false
if [ -d ".git" ]; then
    echo "🔍 Checking for updates..."
    # Ensure upstream is set
    if ! git rev-parse @{u} &>/dev/null; then
        git branch --set-upstream-to=origin/main main &>/dev/null || true
    fi
    # Capture hash before pull
    LOCAL_HASH=$(get_head_hash)
    # Pull latest changes (non-fatal)
    if git pull --ff-only &>/dev/null; then
        NEW_HASH=$(get_head_hash)
        if [ "$LOCAL_HASH" != "$NEW_HASH" ] && [ -n "$NEW_HASH" ]; then
            echo "✨ Updates pulled: ${LOCAL_HASH:0:7} → ${NEW_HASH:0:7}"
            PULLED_CHANGES=true
        else
            echo "✓ Already up to date (${NEW_HASH:0:7})"
        fi
    else
        log_warn "Could not pull updates (offline or network issue). Continuing with local version."
    fi
fi

# 3. Ensure dependencies (always check, reinstall if pull brought changes)
if [ "$PULLED_CHANGES" = true ]; then
    log_info "Updates detected. Reinstalling dependencies..."
    retry "npm install" npm install || log_warn "npm install failed, using existing node_modules."
else
    ensure_deps || exit 1
fi

# 4. Check if build is stale
WAS_STALE=false
if is_build_stale; then
    WAS_STALE=true
    log_info "Building application..."
    if ! do_build; then
        log_error "Build failed. Cannot start server."
        exit 1
    fi
    echo "✓ Build complete."
fi

# 5. Validate we have a build
if [ ! -f "dist/index.html" ]; then
    log_warn "Build output missing. Attempting rebuild..."
    if ! do_build; then
        log_error "Build failed. Cannot start server."
        exit 1
    fi
fi

# 6. Decide: restart or just open browser
if is_port_in_use; then
    if [ "$WAS_STALE" = true ] || [ "$PULLED_CHANGES" = true ]; then
        # Build was updated or code was pulled → must restart server to serve new files
        log_info "Restarting server to serve updated build..."
        kill_port
        echo "⚡ Starting preview server..."
        npm run preview -- --port $PORT --open
    else
        # Build is fresh and server is running → just open browser
        echo "✨ $APP_NAME is already running on port $PORT (build is current)."
        echo "🌐 Opening browser..."
        open "http://localhost:$PORT" 2>/dev/null || xdg-open "http://localhost:$PORT" 2>/dev/null || true
    fi
else
    # Server not running → start it
    echo "📦 Starting $APP_NAME on port $PORT..."
    echo "⚡ Starting preview server..."
    npm run preview -- --port $PORT --open
fi
