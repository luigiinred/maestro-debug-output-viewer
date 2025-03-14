const { notarize } = require("@electron/notarize");
const path = require("path");

// This is a dummy notarize.js file that does nothing
// It's used to skip the notarization process
exports.default = async function notarizing(context) {
  // Only notarize the app on Mac OS
  if (context.electronPlatformName !== "darwin") {
    console.log("Skipping notarization: not macOS");
    return;
  }

  // Skip notarization if environment variables are not set
  if (
    !process.env.APPLE_ID ||
    !process.env.APPLE_ID_PASSWORD ||
    !process.env.APPLE_TEAM_ID
  ) {
    console.log(
      "Skipping notarization: required environment variables not set"
    );
    console.log("Required: APPLE_ID, APPLE_ID_PASSWORD, APPLE_TEAM_ID");
    return;
  }

  console.log("Notarizing macOS app...");

  const appBundleId =
    context.packager.appInfo.info._configuration.appId || "com.maestro.viewer";
  const appName =
    context.packager.appInfo.info._configuration.productName ||
    context.packager.appInfo.name;
  const appPath = path.join(context.appOutDir, `${appName}.app`);

  console.log(`App path: ${appPath}`);
  console.log(`Bundle ID: ${appBundleId}`);
  console.log(`Team ID: ${process.env.APPLE_TEAM_ID}`);

  try {
    // Notarize the app using notarytool (recommended by Apple)
    await notarize({
      tool: "notarytool",
      appBundleId,
      appPath,
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_ID_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID,
    });

    console.log(`Successfully notarized ${appName}`);

    // Staple the notarization ticket to the app
    const { execSync } = require("child_process");
    console.log(`Stapling notarization ticket to ${appPath}`);
    execSync(`xcrun stapler staple "${appPath}"`);
    console.log(`Successfully stapled notarization ticket to ${appName}`);
  } catch (error) {
    console.error("Notarization failed:", error);

    // In CI environments, we want to fail the build if notarization fails
    if (process.env.CI) {
      throw error;
    } else {
      console.warn(
        "Continuing despite notarization failure (not in CI environment)"
      );
    }
  }
};
