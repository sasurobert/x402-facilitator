#!/bin/bash
set -e

echo "============================================"
echo " x402 Facilitator — Setup"
echo "============================================"

# Prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js not found. Install v20+."; exit 1; }
NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
[ "$NODE_MAJOR" -ge 20 ] 2>/dev/null || echo "⚠ Node.js v20+ recommended (found $(node -v))"

if ! command -v pnpm >/dev/null 2>&1; then
    echo "📦 Installing pnpm..."
    npm install -g pnpm
fi

echo "✓ node $(node -v), pnpm $(pnpm -v)"

# Install
echo "📦 Installing dependencies..."
pnpm install

# Config
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "⚙️  Created .env from .env.example — edit before running"
    else
        cat > .env << 'EOF'
PORT=3000
NETWORK_PROVIDER=https://devnet-api.multiversx.com
RELAYER_WALLETS_DIR=./wallets/
EOF
        echo "⚙️  Created default .env — edit before running"
    fi
fi

# Build
echo "🔨 Building..."
pnpm build

# Test
echo "🧪 Running tests..."
pnpm test

echo ""
echo "✅ Setup complete!"
echo "   Start: pnpm start"
