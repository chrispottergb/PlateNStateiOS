#!/bin/bash
set -e

echo "[1/4] Installing dependencies..."
npm install

echo "[2/4] Building web project..."
npm run build

if [ ! -d "ios" ]; then
  echo "[3/4] Adding iOS platform..."
  npx cap add ios
else
  echo "[3/4] iOS platform already present, skipping add."
fi

echo "[4/4] Syncing web bundle into iOS project..."
npx cap sync ios

# Inject export compliance key
PLIST="ios/App/App/Info.plist"
if [ -f "$PLIST" ]; then
  echo "Injecting export compliance key into $PLIST"
  plutil -replace ITSAppUsesNonExemptEncryption -bool NO "$PLIST"
fi
