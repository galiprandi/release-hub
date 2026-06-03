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

# 6. Create Symbolic Link
echo "🔗 Setting up global command '$BINARY_NAME'..."

# Create a small launcher that handles the directory switching
mkdir -p "$INSTALL_DIR/bin"
cat <<EOF > "$INSTALL_DIR/bin/$BINARY_NAME"
#!/bin/bash
cd "$INSTALL_DIR" && ./scripts/start.sh "\$@"
EOF
chmod +x "$INSTALL_DIR/bin/$BINARY_NAME"

# Try to link to /usr/local/bin (without sudo to avoid credential prompts)
DEST="/usr/local/bin/$BINARY_NAME"
if [ -w "/usr/local/bin" ]; then
    ln -sf "$INSTALL_DIR/bin/$BINARY_NAME" "$DEST"
    echo "✅ Success! Link created at $DEST"
else
    # Try to use ~/.local/bin (usually in PATH without sudo)
    LOCAL_BIN="$HOME/.local/bin"
    mkdir -p "$LOCAL_BIN"
    if [ -w "$LOCAL_BIN" ]; then
        ln -sf "$INSTALL_DIR/bin/$BINARY_NAME" "$LOCAL_BIN/$BINARY_NAME"
        echo "✅ Success! Link created at $LOCAL_BIN/$BINARY_NAME"
        # Check if ~/.local/bin is in PATH
        if [[ ":$PATH:" != *":$LOCAL_BIN:"* ]]; then
            echo "⚠️  $LOCAL_BIN is not in your PATH. Please add this to your shell config:"
            echo "export PATH=\"\$HOME/.local/bin:\$PATH\""
        fi
    else
        # Fallback: add alias to shell config
        SHELL_CONFIG=""
        if [ -n "$ZSH_VERSION" ]; then
            SHELL_CONFIG="$HOME/.zshrc"
        elif [ -n "$BASH_VERSION" ]; then
            SHELL_CONFIG="$HOME/.bashrc"
        else
            SHELL_CONFIG="$HOME/.profile"
        fi

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
    fi
fi

echo ""
echo "🎉 ReleaseHub installed successfully!"
echo "🚀 Type '$BINARY_NAME' to launch the app."
echo ""

# Launch the app immediately
"$INSTALL_DIR/bin/$BINARY_NAME"
