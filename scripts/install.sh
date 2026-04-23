#!/bin/bash

# Configuration
INSTALL_DIR="$HOME/.release-hub"
REPO_URL="https://github.com/galiprandi/release-hub.git"
BINARY_NAME="rhub"

set -e

echo "🛠️  Starting ReleaseHub Installation..."

# 1. Check for dependencies
if ! command -v pnpm &> /dev/null; then
    echo "❌ Error: pnpm is not installed. Please install it first: npm install -g pnpm"
    exit 1
fi

if ! command -v gh &> /dev/null; then
    echo "⚠️  Warning: GitHub CLI (gh) is not installed. ReleaseHub requires it to function."
    echo "Please install it: brew install gh"
fi

# 2. Clone or Update Repository
if [ -d "$INSTALL_DIR" ]; then
    echo "🔄 Repository exists at $INSTALL_DIR. Updating..."
    cd "$INSTALL_DIR"
    git pull origin main || echo "⚠️  Could not pull latest changes. Continuing with local version."
else
    echo "📥 Cloning ReleaseHub to $INSTALL_DIR..."
    git clone "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

# 3. Install Dependencies
echo "📦 Installing dependencies..."
pnpm install

# 4. Build Application
echo "🏗️  Building application..."
pnpm run build

# 5. Setup Permissions
chmod +x scripts/start.sh

# 6. Create Symbolic Link
echo "🔗 Setting up global command '$BINARY_NAME'..."

# Create a small launcher that handles the directory switching
mkdir -p "$INSTALL_DIR/bin"
cat <<EOF > "$INSTALL_DIR/bin/$BINARY_NAME"
#!/bin/bash
cd "$INSTALL_DIR" && ./scripts/start.sh "\$@"
EOF
chmod +x "$INSTALL_DIR/bin/$BINARY_NAME"

# Try to link to /usr/local/bin (requires sudo often, so we handle it gracefully)
DEST="/usr/local/bin/$BINARY_NAME"
if [ -w "/usr/local/bin" ]; then
    ln -sf "$INSTALL_DIR/bin/$BINARY_NAME" "$DEST"
    echo "✅ Success! Link created at $DEST"
else
    echo "⚠️  Could not write to /usr/local/bin. Trying with sudo..."
    sudo ln -sf "$INSTALL_DIR/bin/$BINARY_NAME" "$DEST" || {
        echo "❌ Could not create link. Please add this to your .zshrc or .bashrc:"
        echo "alias $BINARY_NAME=\"$INSTALL_DIR/bin/$BINARY_NAME\""
    }
fi

echo ""
echo "🎉 ReleaseHub installed successfully!"
echo "🚀 Type '$BINARY_NAME' to launch the app."
echo ""

# Launch the app immediately
"$INSTALL_DIR/bin/$BINARY_NAME"
