#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo ""
echo "   🐶  Dog-Diary — Local Diary Workbench"
echo "   ─────────────────────────────────────"
echo ""

# Check node_modules
if [ ! -d "node_modules" ]; then
    echo "   [1/2] Installing dependencies..."
    npm install
else
    echo "   [1/2] Dependencies ready ✓"
fi

echo "   [2/2] Starting dev server..."
echo ""
echo "   Open browser → http://localhost:3000"
echo "   Press Ctrl+C to stop"
echo ""

# Try to open browser (platform-aware)
case "$(uname -s)" in
    Darwin)    open http://localhost:3000 2>/dev/null & ;;
    Linux)     xdg-open http://localhost:3000 2>/dev/null & ;;
    MINGW*|MSYS*|CYGWIN*) start http://localhost:3000 2>/dev/null & ;;
esac

npm run dev
