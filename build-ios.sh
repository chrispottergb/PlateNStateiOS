
# Inject export compliance key
PLIST="ios/App/App/Info.plist"
if [ -f "$PLIST" ]; then
  echo "Injecting export compliance key into $PLIST"
  plutil -replace ITSAppUsesNonExemptEncryption -bool NO "$PLIST"
fi
