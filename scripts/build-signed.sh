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

echo "Building and signing app with Apple Developer ID: $APPLE_ID"
echo "Team ID: $APPLE_TEAM_ID"

# Run the build
npm run build && npm run electron:prepare && npx electron-builder

# Check if build was successful
if [ $? -eq 0 ]; then
  echo "Build completed successfully!"
  echo "Your signed and notarized app should be available in the release directory."
else
  echo "Build failed. Check the error messages above."
fi 