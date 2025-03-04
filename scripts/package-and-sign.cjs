#!/usr/bin/env node

/**
 * This script handles the packaging and signing process in a more controlled way.
 * It first packages the app, then fixes any code signing issues, and finally creates the distributables.
 *
 * Specifically addresses the error:
 * "code has no resources but signature indicates they must be present"
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Check if we're running in GitHub Actions
const isGitHubActions = process.env.GITHUB_ACTIONS === "true";

console.log("Starting packaging and signing process...");

try {
  // Step 1: Package the app
  console.log("\n=== Step 1: Packaging the app ===");

  // Create necessary directories first
  const resourcesDir = path.resolve(__dirname, "../electron/build/resources");
  if (!fs.existsSync(resourcesDir)) {
    fs.mkdirSync(resourcesDir, { recursive: true });
    fs.writeFileSync(
      path.join(resourcesDir, "dummy.txt"),
      "This file ensures resources are present for code signing."
    );
  }

  // Run the packaging command
  execSync("npm run package", { stdio: "inherit" });

  // Step 2: Find the app and fix code signing issues
  console.log("\n=== Step 2: Fixing code signing issues ===");
  const outDir = path.resolve(__dirname, "../out");

  // Find all .app directories
  const findAppCmd = `find ${outDir} -name "*.app" -type d`;
  const appPaths = execSync(findAppCmd).toString().trim().split("\n");

  if (appPaths.length === 0 || (appPaths.length === 1 && appPaths[0] === "")) {
    console.error("No .app directories found!");
    process.exit(1);
  }

  // Fix code signing for each app
  for (const appPath of appPaths) {
    if (appPath) {
      console.log(`Fixing code signing for: ${appPath}`);

      // Ensure the Resources directory exists
      const resourcesPath = path.join(appPath, "Contents/Resources");
      if (!fs.existsSync(resourcesPath)) {
        fs.mkdirSync(resourcesPath, { recursive: true });
      }

      // Create a dummy resource file
      fs.writeFileSync(
        path.join(resourcesPath, "dummy.txt"),
        "This file ensures resources are present for code signing."
      );

      // Run the fix-code-signing script
      execSync(
        `node ${path.resolve(__dirname, "fix-code-signing.cjs")} "${appPath}"`,
        { stdio: "inherit" }
      );

      // Verify the app structure
      console.log(`Verifying app structure for: ${appPath}`);
      execSync(`find "${appPath}" -type f | grep -v "node_modules" | sort`, {
        stdio: "inherit",
      });
    }
  }

  // Step 3: Create the distributables
  console.log("\n=== Step 3: Creating distributables ===");
  execSync("npm run make", { stdio: "inherit" });

  // Step 4: Verify the output
  console.log("\n=== Step 4: Verifying output ===");
  execSync(`find ${outDir}/make -type f -name "*.dmg" -o -name "*.zip"`, {
    stdio: "inherit",
  });

  console.log("\n=== Packaging and signing completed successfully! ===");
} catch (error) {
  console.error(`Error during packaging and signing: ${error.message}`);
  process.exit(1);
}
