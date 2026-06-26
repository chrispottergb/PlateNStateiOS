@echo off
echo === Plate N' State — Android Build ===

set NODE_ENV=production
set VITE_SUPABASE_PROJECT_ID=qcnhusvxygyczbnmbyvd
set VITE_SUPABASE_URL=https://qcnhusvxygyczbnmbyvd.supabase.co
set VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjbmh1c3Z4eWd5Y3pibm1ieXZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNzg0NTAsImV4cCI6MjA5Nzc1NDQ1MH0.sQJL5eJkI706OwjtUcmr3R1yaT_VaOyEkV7b-Ljrqyk

echo [1/6] Installing dependencies...
call npm install
if %errorlevel% neq 0 ( echo FAILED: npm install & exit /b 1 )

echo [2/6] Building web bundle...
call npm run build
if %errorlevel% neq 0 ( echo FAILED: npm run build & exit /b 1 )

if not exist android (
  echo [3/6] Adding Android platform...
  call npx cap add android
) else (
  echo [3/6] Android platform already present, skipping add.
)

echo [4/6] Syncing web bundle into Android project...
call npx cap sync android
if %errorlevel% neq 0 ( echo FAILED: npx cap sync android & exit /b 1 )

echo [5/6] Injecting permissions and URL scheme into AndroidManifest...
set MANIFEST=android\app\src\main\AndroidManifest.xml
powershell -Command "$m = Get-Content '%MANIFEST%' -Raw; $utf8 = New-Object System.Text.UTF8Encoding $false; if ($m -notmatch 'ACCESS_FINE_LOCATION') { $p = '    <uses-permission android:name=\"android.permission.ACCESS_FINE_LOCATION\" />`n    <uses-permission android:name=\"android.permission.ACCESS_COARSE_LOCATION\" />`n    <uses-permission android:name=\"android.permission.CAMERA\" />`n    <uses-permission android:name=\"android.permission.READ_MEDIA_IMAGES\" />`n`n'; $m = $m -replace '(<application)', ($p + '$1'); }; if ($m -notmatch 'com.plateandstate.platenstate') { $m = $m -replace '</activity>', '            <intent-filter>`n                <action android:name=\"android.intent.action.VIEW\" />`n                <category android:name=\"android.intent.category.DEFAULT\" />`n                <category android:name=\"android.intent.category.BROWSABLE\" />`n                <data android:scheme=\"com.plateandstate.platenstate\" />`n            </intent-filter>`n        </activity>'; }; [System.IO.File]::WriteAllText('%MANIFEST%', $m, $utf8); Write-Host 'Manifest patched'"
echo Permissions + URL scheme injected

echo [6/6] Setting SDK path...
echo sdk.dir=C:\Users\PC\AppData\Local\Android\Sdk> android\local.properties

echo.
echo === Done! ===
echo Next: open Android Studio with  npx cap open android
echo Then: Build ^> Generate Signed Bundle ^> Android App Bundle (.aab)
