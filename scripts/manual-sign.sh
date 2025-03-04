#!/bin/bash

# Load environment variables from .env file
if [ -f .env ]; then
  echo "Loading environment variables from .env file"
  export $(grep -v '^#' .env | xargs)
else
  echo "No .env file found. Make sure to set APPLE_ID, APPLE_ID_PASSWORD, and APPLE_TEAM_ID environment variables."
  exit 1
fi

# Check if required environment variables are set
if [ -z "$APPLE_ID" ] || [ -z "$APPLE_ID_PASSWORD" ] || [ -z "$APPLE_TEAM_ID" ]; then
  echo "Error: Required environment variables not set."
  echo "Make sure APPLE_ID, APPLE_ID_PASSWORD, and APPLE_TEAM_ID are set in your .env file."
  exit 1
fi

# First, build the app without signing
echo "Building app without signing..."
npm run build && npm run electron:prepare && npx electron-builder

# Check if build was successful
if [ $? -ne 0 ]; then
  echo "Build failed. Check the error messages above."
  exit 1
fi

echo "Build completed. Now signing the app manually..."

# Path to the app
APP_PATH="release/mac-arm64/Maestro Viewer.app"

# Check if the app exists
if [ ! -d "$APP_PATH" ]; then
  echo "Error: App not found at $APP_PATH"
  exit 1
fi

# Sign the app manually
echo "Signing app with Team ID: $APPLE_TEAM_ID"

# Remove any existing signatures
echo "Removing any existing signatures..."
codesign --remove-signature "$APP_PATH"

# Sign the app with hardened runtime and entitlements
echo "Signing the app..."
# Find the Developer ID Application certificate
CERT_NAME=$(security find-identity -v -p codesigning | grep "Developer ID Application" | head -1 | sed -E 's/.*"Developer ID Application: ([^"]+).*/\1/')

if [ -z "$CERT_NAME" ]; then
  echo "Error: No Developer ID Application certificate found."
  echo "Make sure you have a valid Developer ID Application certificate in your keychain."
  exit 1
fi

echo "Using certificate: $CERT_NAME"

codesign --sign "Developer ID Application: $CERT_NAME" \
  --force --options runtime \
  --entitlements "electron/build/entitlements.mac.plist" \
  --deep "$APP_PATH"

# Verify the signature
echo "Verifying signature..."
codesign --verify --deep --strict --verbose=2 "$APP_PATH"

# Check if signing was successful
if [ $? -eq 0 ]; then
  echo "App signed successfully!"
  
  # Notarize the app if needed
  read -p "Do you want to notarize the app? (y/n) " NOTARIZE
  if [[ $NOTARIZE == "y" || $NOTARIZE == "Y" ]]; then
    echo "Notarizing app..."
    # Create a zip file for notarization
    ZIP_PATH="release/MaestroViewer.zip"
    ditto -c -k --keepParent "$APP_PATH" "$ZIP_PATH"
    
    # Submit for notarization
    xcrun notarytool submit "$ZIP_PATH" \
      --apple-id "$APPLE_ID" \
      --password "$APPLE_ID_PASSWORD" \
      --team-id "$APPLE_TEAM_ID" \
      --wait
    
    # Staple the notarization ticket
    xcrun stapler staple "$APP_PATH"
    
    echo "Notarization complete!"
  fi
  
  echo "Your signed app is available at: $APP_PATH"
else
  echo "Signing failed. Check the error messages above."
fi 