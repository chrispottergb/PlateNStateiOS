@echo off
echo === Plate N' State — Android Build ===

set NODE_ENV=production
set VITE_SUPABASE_PROJECT_ID=qcnhusvxygyczbnmbyvd
set VITE_SUPABASE_URL=https://qcnhusvxygyczbnmbyvd.supabase.co
set VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjbmh1c3Z4eWd5Y3pibm1ieXZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNzg0NTAsImV4cCI6MjA5Nzc1NDQ1MH0.sQJL5eJkI706OwjtUcmr3R1yaT_VaOyEkV7b-Ljrqyk

echo [1/4] Installing dependencies...
call npm install
if %errorlevel% neq 0 ( echo FAILED: npm install & exit /b 1 )

echo [2/4] Building web bundle...
call npm run build
if %errorlevel% neq 0 ( echo FAILED: npm run build & exit /b 1 )

if not exist android (
  echo [3/4] Adding Android platform...
  call npx cap add android
) else (
  echo [3/4] Android platform already present, skipping add.
)

echo [4/4] Syncing web bundle into Android project...
call npx cap sync android
if %errorlevel% neq 0 ( echo FAILED: npx cap sync android & exit /b 1 )

echo.
echo === Done! ===
echo Next: open Android Studio with  npx cap open android
echo Then: Build ^> Generate Signed Bundle ^> Android App Bundle (.aab)
