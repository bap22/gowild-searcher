#!/bin/bash
# GoWild Searcher Setup Script

set -e

echo "🎯 Frontier GoWild Fare Searcher - Setup"
echo "========================================"
echo ""

# Check for Python
if command -v python3 &> /dev/null; then
    PYTHON_CMD=python3
elif command -v python &> /dev/null; then
    PYTHON_CMD=python
else
    echo "❌ Python not found. Please install Python 3.8+"
    exit 1
fi

echo "✓ Found Python: $($PYTHON_CMD --version)"

# Check for Node.js (optional, for Node version)
if command -v node &> /dev/null; then
    echo "✓ Found Node.js: $(node --version)"
    NODE_AVAILABLE=true
else
    echo "⚠ Node.js not found (optional)"
    NODE_AVAILABLE=false
fi

echo ""
echo "📦 Installing Python dependencies..."
$PYTHON_CMD -m pip install -r requirements.txt --quiet

echo ""
echo "📦 Installing Playwright browsers..."
$PYTHON_CMD -m playwright install chromium

echo ""
if [ "$NODE_AVAILABLE" = true ]; then
    echo "📦 Installing Node.js dependencies (optional)..."
    npm install --quiet
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit config.json to customize your settings"
echo "2. Run a test search: $PYTHON_CMD gowild_searcher.py"
echo "3. Start the scheduler: $PYTHON_CMD scheduler.py --start"
echo ""
echo "Or with Node.js:"
echo "  npm run search    - Run one-time search"
echo "  npm run schedule  - Start daily scheduler"
