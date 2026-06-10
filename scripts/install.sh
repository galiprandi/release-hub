#!/bin/bash

# Configuration
INSTALL_DIR="$HOME/.release-hub"
REPO_URL="https://github.com/galiprandi/release-hub.git"
BINARY_NAME="rhub"

set -e

echo "🛠️  Starting ReleaseHub Installation..."

# 1. Clone or Update Repository
if [ -d "$INSTALL_DIR" ]; then
    echo "🔄 Repository exists at $INSTALL_DIR. Updating..."
    cd "$INSTALL_DIR"
    git fetch origin main
    git reset --hard origin/main || echo "⚠️  Could not update to latest changes. Continuing with local version."
else
    echo "📥 Cloning ReleaseHub to $INSTALL_DIR..."
    git clone "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

# 2. Check for dependencies
./scripts/healthcheck.sh || exit 1

# 3. Install Dependencies
echo "📦 Installing dependencies..."
npm install

# 4. Build Application
echo "🏗️  Building application..."
npm run build

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
    echo "⚠️  Could not find shell config. Please add this manually:"
    echo "alias $BINARY_NAME=\"$INSTALL_DIR/bin/$BINARY_NAME\""
fi

echo ""
echo "🎉 ReleaseHub installed successfully!"
echo "🚀 Type '$BINARY_NAME' to launch the app."
echo ""

# Launch the app immediately
"$INSTALL_DIR/bin/$BINARY_NAME"
