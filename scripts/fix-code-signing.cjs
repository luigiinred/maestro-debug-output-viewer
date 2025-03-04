#!/usr/bin/env node

/**
 * This script helps fix code signing issues by ensuring all resources
 * are properly included in the app bundle.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Check if we're running in GitHub Actions
const isGitHubActions = process.env.GITHUB_ACTIONS === "true";

// Get the app path from the command line arguments or use a default
const appPath =
  process.argv[2] ||
  path.resolve(
    __dirname,
    "../out/make/maestro-viewer-darwin-arm64/maestro-viewer.app"
  );

console.log(`Fixing code signing for: ${appPath}`);

// Check if the app exists
if (!fs.existsSync(appPath)) {
  console.error(`Error: App not found at ${appPath}`);
  process.exit(1);
}

// Create a dummy resource file if needed
const resourcesPath = path.join(appPath, "Contents/Resources");
const dummyResourcePath = path.join(resourcesPath, "dummy.txt");

if (!fs.existsSync(resourcesPath)) {
  console.log(`Creating Resources directory: ${resourcesPath}`);
  fs.mkdirSync(resourcesPath, { recursive: true });
}

console.log(`Creating dummy resource file: ${dummyResourcePath}`);
fs.writeFileSync(
  dummyResourcePath,
  "This file ensures resources are present for code signing."
);

// Copy the icon file if it exists
const iconSource = path.resolve(__dirname, "../electron/icons/icon.icns");
const iconDest = path.join(resourcesPath, "electron.icns");

if (fs.existsSync(iconSource)) {
  console.log(`Copying icon file to: ${iconDest}`);
  fs.copyFileSync(iconSource, iconDest);
}

// Fix Info.plist if needed
const infoPlistPath = path.join(appPath, "Contents/Info.plist");
if (fs.existsSync(infoPlistPath)) {
  console.log(`Checking Info.plist: ${infoPlistPath}`);

  try {
    // Make sure the Info.plist has the correct bundle identifier
    const bundleId = "com.maestro.viewer";
    const appName = "Maestro Viewer";

    // Use PlistBuddy to update the Info.plist
    const commands = [
      `/usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier ${bundleId}" "${infoPlistPath}"`,
      `/usr/libexec/PlistBuddy -c "Set :CFBundleName ${appName}" "${infoPlistPath}"`,
      `/usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName ${appName}" "${infoPlistPath}"`,
    ];

    commands.forEach((cmd) => {
      try {
        execSync(cmd, { stdio: "inherit" });
      } catch (error) {
        console.warn(`Warning: ${cmd} failed, but continuing...`);
      }
    });
  } catch (error) {
    console.error(`Error updating Info.plist: ${error.message}`);
  }
}

// Sign the app if we're not in GitHub Actions (GitHub Actions will handle signing separately)
if (
  !isGitHubActions &&
  process.env.APPLE_TEAM_ID &&
  process.env.APPLE_TEAM_NAME
) {
  try {
    const identity = `Developer ID Application: ${process.env.APPLE_TEAM_NAME} (${process.env.APPLE_TEAM_ID})`;
    const entitlements = path.resolve(
      __dirname,
      "../electron/build/entitlements.mac.plist"
    );

    console.log(`Signing app with identity: ${identity}`);

    // Remove existing signature if any
    execSync(`codesign --remove-signature "${appPath}"`, { stdio: "inherit" });

    // Sign the app with the correct identity and entitlements
    execSync(
      `codesign --force --deep --options runtime --entitlements "${entitlements}" --sign "${identity}" "${appPath}"`,
      { stdio: "inherit" }
    );

    console.log("App signed successfully!");

    // Verify the signature
    execSync(`codesign -vvv --deep --strict "${appPath}"`, {
      stdio: "inherit",
    });

    console.log("Signature verified successfully!");
  } catch (error) {
    console.error(`Error signing app: ${error.message}`);
    process.exit(1);
  }
}

console.log("Code signing preparation completed successfully!");
