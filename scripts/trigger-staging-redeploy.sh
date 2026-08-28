#!/bin/bash

# Script to trigger staging redeploy by creating a PR with auto-merge
# Usage: ./trigger-staging-redeploy.sh <repo> <branch_name>

set -e

REPO="${1:?Usage: $0 <org/repo> [branch_name]}"
BRANCH_NAME="${2:-chore/trigger-staging-redeploy-$(date +%s)}"
FORCE_FILE=".releasehub-force-redeploy"

# Create temporary directory
TEMP_DIR=$(mktemp -d -t release-hub-XXXX)
echo "Created temp directory: $TEMP_DIR"

# Cleanup function
cleanup() {
  echo "Cleaning up..."
  cd /
  rm -rf "$TEMP_DIR"
  echo "Cleanup complete"
}

# Set trap for cleanup on exit
trap cleanup EXIT

# Clone repo with depth 1 (only latest commit)
echo "Cloning $REPO..."
git clone --depth 1 --branch main "git@github.com:$REPO.git" "$TEMP_DIR"

# Change to repo directory
cd "$TEMP_DIR"

# Create new branch
echo "Creating branch $BRANCH_NAME..."
git checkout -b "$BRANCH_NAME"

# Create or update force file
echo "Creating/updating $FORCE_FILE..."
echo "Force redeploy $(date)" > "$FORCE_FILE"

# Commit changes
echo "Committing changes..."
git add "$FORCE_FILE"
git commit -m "Force redeploy staging $(date)"

# Push branch
echo "Pushing branch to remote..."
git push origin "$BRANCH_NAME"

# Create PR
echo "Creating pull request..."
PR_URL=$(gh pr create \
  --repo "$REPO" \
  --base main \
  --head "$BRANCH_NAME" \
  --title "chore: trigger staging redeploy" \
  --body "This PR triggers a redeploy to staging by forcing Nx to rebuild the dependency graph.

Created with [ReleaseHub](https://github.com/galiprandi/release-hub) - a tool for visualizing and managing CI/CD pipelines.

**Purpose**: Trigger staging redeploy without structural code changes")

echo "PR created: $PR_URL"

# Enable auto merge
echo "Enabling auto merge..."
PR_NUMBER=$(echo "$PR_URL" | grep -o '[0-9]*$')
gh pr merge "$PR_NUMBER" --auto --squash --repo "$REPO"

echo "Auto merge enabled for PR #$PR_NUMBER"

# Return PR URL to caller
echo "$PR_URL"
