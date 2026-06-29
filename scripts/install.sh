#!/bin/bash

# Configuration
INSTALL_DIR="$HOME/.release-hub"
REPO_URL="https://github.com/galiprandi/release-hub.git"
BINARY_NAME="rhub"
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

echo "🛠️  Starting ReleaseHub Installation..."

# 1. Clone or Update Repository
if [ -d "$INSTALL_DIR" ]; then
    echo "🔄 Repository exists at $INSTALL_DIR. Updating..."
    cd "$INSTALL_DIR"
    if ! git fetch origin main 2>/dev/null; then
        log_warn "Could not fetch from remote. Continuing with local version."
    else
        git reset --hard origin/main 2>/dev/null || log_warn "Could not reset to origin/main. Continuing with local version."
    fi
else
    echo "📥 Cloning ReleaseHub to $INSTALL_DIR..."
    if ! retry "git clone" git clone "$REPO_URL" "$INSTALL_DIR"; then
        log_error "Failed to clone repository after $MAX_RETRIES attempts."
        log_error "Please check your network connection and try again."
        exit 1
    fi
    cd "$INSTALL_DIR"
fi

# 2. Check for dependencies
if ! ./scripts/healthcheck.sh; then
    log_error "Healthcheck failed. Please ensure Node.js and npm are installed."
    exit 1
fi

# 3. Install Dependencies (with retry)
echo "📦 Installing dependencies..."
if ! retry "npm install" npm install; then
    log_error "Failed to install dependencies after $MAX_RETRIES attempts."
    log_error "Try removing node_modules and running 'npm install' manually."
    exit 1
fi

# 4. Build Application (with retry)
echo "🏗️  Building application..."
if ! retry "npm run build" npm run build; then
    log_error "Failed to build application after $MAX_RETRIES attempts."
    log_error "Try running 'npm run build' manually to see the full error."
    exit 1
fi

# 5. Setup Permissions
chmod +x scripts/start.sh

# 6. Add alias to shell config
echo "🔗 Setting up command '$BINARY_NAME' via alias..."

# Create a small launcher that handles the directory switching
mkdir -p "$INSTALL_DIR/bin"
cat <<EOF > "$INSTALL_DIR/bin/$BINARY_NAME"
#!/bin/bash
cd "$INSTALL_DIR" && ./scripts/start.sh "\$@"
EOF
chmod +x "$INSTALL_DIR/bin/$BINARY_NAME"

SHELL_CONFIG=""
for f in "$HOME/.zshrc" "$HOME/.bashrc" "$HOME/.profile"; do
    if [ -f "$f" ]; then
        SHELL_CONFIG="$f"
        break
    fi
done

if [ -f "$SHELL_CONFIG" ]; then
    ALIAS_LINE="alias $BINARY_NAME=\"$INSTALL_DIR/bin/$BINARY_NAME\""
    if ! grep -q "$ALIAS_LINE" "$SHELL_CONFIG" 2>/dev/null; then
        echo "" >> "$SHELL_CONFIG"
        echo "# ReleaseHub" >> "$SHELL_CONFIG"
        echo "$ALIAS_LINE" >> "$SHELL_CONFIG"
        echo "✅ Alias added to $SHELL_CONFIG"
        echo "🔄 Please run 'source $SHELL_CONFIG' or restart your terminal to use '$BINARY_NAME'"
    else
        echo "✅ Alias already exists in $SHELL_CONFIG"
    fi
else
    log_warn "Could not find shell config. Please add this manually:"
    echo "alias $BINARY_NAME=\"$INSTALL_DIR/bin/$BINARY_NAME\""
fi

echo ""
echo "🎉 ReleaseHub installed successfully!"
echo "🚀 Type '$BINARY_NAME' to launch the app."
echo ""

# Launch the app immediately
"$INSTALL_DIR/bin/$BINARY_NAME"
