#!/usr/bin/env bash
# Plate N' State — iOS Build (macOS + Xcode required)
set -e

echo "=== Plate N' State — iOS Build ==="

export NODE_ENV=production

echo "[1/4] Installing dependencies..."
npm install

echo "[2/4] Building web bundle..."
npm run build

if [ ! -d "ios" ]; then
  echo "[3/4] Adding iOS platform..."
  npx cap add ios
else
  echo "[3/4] iOS platform already present, skipping add."
fi

echo "[4/4] Syncing web bundle into iOS project..."
npx cap sync ios

echo ""
echo "=== Done! ==="
echo "Next: open Xcode with  npx cap open ios"
echo "Then: Product > Archive > Distribute App > App Store Connect"
echo ""
echo "REMINDER: swap VITE_PAYMENTS_CLIENT_TOKEN to your live Stripe pk_live_ key before release."
