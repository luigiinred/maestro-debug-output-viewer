#!/bin/bash

# Path to the app
APP_PATH="release/mac-arm64/Maestro Viewer.app"

# Check if the app exists
if [ ! -d "$APP_PATH" ]; then
  echo "Error: App not found at $APP_PATH"
  echo "Please build the app first with: npm run electron:build"
  exit 1
fi

echo "Removing quarantine attribute from $APP_PATH..."
xattr -cr "$APP_PATH"

echo "Done! You should now be able to run the app without the 'damaged' error."
echo "To open the app, run: open \"$APP_PATH\"" 