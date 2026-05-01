#!/bin/bash
# Run GoWild search and commit results to GitHub
# This script runs on the Mac Mini and pushes results to GitHub for Vercel to display

set -e

cd /Users/brett/.openclaw/workspace/gowild-searcher

echo "🔍 Running GoWild search..."

# Run the Python searcher
python3 gowild_searcher.py

# Check if new results were generated
if [ -z "$(ls -A logs/gowild-*.json 2>/dev/null)" ]; then
    echo "❌ No results generated"
    exit 1
fi

echo "✅ Search complete, committing results..."

# Configure git
git config --global user.email "2632861+bap22@users.noreply.github.com"
git config --global user.name "Brett Peterson"

# Add only the logs directory
git add logs/gowild-*.json logs/search.log

# Commit with timestamp
git commit -m "GoWild search results $(date +%Y-%m-%d)" || echo "No changes to commit"

# Push to GitHub
git push origin main

echo "✅ Results pushed to GitHub"
echo "🌐 Vercel will auto-update at: https://gowild-searcher.vercel.app"
