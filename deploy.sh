#!/bin/zsh

# --- CONFIGURATION ---
# Use . to stage all whitelisted files in the directory
STAGE_ALL="." 
BRANCH="main"
MESSAGE="Surgical Intel Update: $(date +'%Y-%m-%d %H:%M:%S')"

# --- EXECUTION ---
echo "🚀 Initiating Surgical Push to GitHub..."

# Ensure we are actually on the main branch locally
git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH"

# Git Operations
# Changed from "$FILE" to "." to catch all updates in js/, css/, and root
git add .
git commit -m "$MESSAGE"
git push origin "$BRANCH"

echo "✅ Update Live! URL: https://jimsngo.github.io/market-hub/"