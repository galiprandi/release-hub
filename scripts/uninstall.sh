#!/bin/bash

# Configuration
INSTALL_DIR="$HOME/.release-hub"
BINARY_NAME="rhub"
DEST="/usr/local/bin/$BINARY_NAME"

set -e

echo "🗑️  Starting ReleaseHub Uninstallation..."

# 1. Remove symbolic link
if [ -L "$DEST" ]; then
    echo "🔗 Removing symbolic link at $DEST..."
    if [ -w "/usr/local/bin" ]; then
        rm -f "$DEST"
        echo "✅ Symbolic link removed."
    else
        echo "⚠️  Could not remove link (no write permissions). Trying with sudo..."
        sudo rm -f "$DEST" || echo "❌ Could not remove link. Please remove it manually: sudo rm -f $DEST"
    fi
else
    echo "ℹ️  No symbolic link found at $DEST."
fi

# 2. Remove installation directory
if [ -d "$INSTALL_DIR" ]; then
    echo "📁 Removing installation directory at $INSTALL_DIR..."
    rm -rf "$INSTALL_DIR"
    echo "✅ Installation directory removed."
else
    echo "ℹ️  No installation directory found at $INSTALL_DIR."
fi

# 3. Reminder to remove alias from shell config
echo ""
echo "⚠️  If you added an alias to your .zshrc or .bashrc, please remove it manually:"
echo "   alias $BINARY_NAME=\"$INSTALL_DIR/bin/$BINARY_NAME\""
echo ""

echo "🎉 ReleaseHub uninstalled successfully!"
