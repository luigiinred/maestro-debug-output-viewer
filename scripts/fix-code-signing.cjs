#!/usr/bin/env node

/**
 * This script helps fix code signing issues by ensuring all resources
 * are properly included in the app bundle.
 *
 * Specifically addresses the error:
 * "code has no resources but signature indicates they must be present"
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

// Create Resources directory if it doesn't exist
const resourcesPath = path.join(appPath, "Contents/Resources");
if (!fs.existsSync(resourcesPath)) {
  console.log(`Creating Resources directory: ${resourcesPath}`);
  fs.mkdirSync(resourcesPath, { recursive: true });
}

// Create multiple resource files to ensure resources are present
const dummyResourcePath = path.join(resourcesPath, "dummy.txt");
console.log(`Creating dummy resource file: ${dummyResourcePath}`);
fs.writeFileSync(
  dummyResourcePath,
  "This file ensures resources are present for code signing."
);

// Create an empty .icns file if needed
const icnsPath = path.join(resourcesPath, "empty.icns");
if (!fs.existsSync(icnsPath)) {
  console.log(`Creating empty .icns file: ${icnsPath}`);
  // Create a minimal .icns file (16 bytes header)
  const header = Buffer.from("icns\0\0\0\x10\0\0\0\0\0\0\0\0", "binary");
  fs.writeFileSync(icnsPath, header);
}

// Copy the icon file if it exists
const iconSource = path.resolve(__dirname, "../electron/icons/icon.icns");
const iconDest = path.join(resourcesPath, "electron.icns");

if (fs.existsSync(iconSource)) {
  console.log(`Copying icon file to: ${iconDest}`);
  fs.copyFileSync(iconSource, iconDest);
}

// Create a minimal Info.plist if it doesn't exist
const infoPlistPath = path.join(appPath, "Contents/Info.plist");
if (!fs.existsSync(infoPlistPath)) {
  console.log(`Creating minimal Info.plist: ${infoPlistPath}`);
  const minimalPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleIdentifier</key>
  <string>com.maestro.viewer</string>
  <key>CFBundleName</key>
  <string>Maestro Viewer</string>
  <key>CFBundleDisplayName</key>
  <string>Maestro Viewer</string>
  <key>CFBundleIconFile</key>
  <string>electron.icns</string>
</dict>
</plist>`;
  fs.writeFileSync(infoPlistPath, minimalPlist);
} else {
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
      `/usr/libexec/PlistBuddy -c "Set :CFBundleIconFile electron.icns" "${infoPlistPath}"`,
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

// Create a PkgInfo file if it doesn't exist
const pkgInfoPath = path.join(appPath, "Contents/PkgInfo");
if (!fs.existsSync(pkgInfoPath)) {
  console.log(`Creating PkgInfo file: ${pkgInfoPath}`);
  fs.writeFileSync(pkgInfoPath, "APPL????");
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
