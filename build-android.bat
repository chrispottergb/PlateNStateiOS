@echo off
echo === Plate N' State — Android Build ===

:: Require NODE_ENV=production so capacitor.config.ts strips the sandbox server block
set NODE_ENV=production

echo [1/4] Installing dependencies...
npm install
if %errorlevel% neq 0 ( echo FAILED: npm install & exit /b 1 )

echo [2/4] Building web bundle...
npm run build
if %errorlevel% neq 0 ( echo FAILED: npm run build & exit /b 1 )

:: Add android platform if not already present
if not exist android (
  echo [3/4] Adding Android platform...
  npx cap add android
) else (
  echo [3/4] Android platform already present, skipping add.
)

echo [4/4] Syncing web bundle into Android project...
npx cap sync android
if %errorlevel% neq 0 ( echo FAILED: npx cap sync android & exit /b 1 )

echo.
echo === Done! ===
echo Next: open Android Studio with  npx cap open android
echo Then: Build ^> Generate Signed Bundle ^> Android App Bundle (.aab)
echo.
echo REMINDER: swap VITE_PAYMENTS_CLIENT_TOKEN to your live Stripe pk_live_ key before release.
