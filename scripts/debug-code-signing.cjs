#!/usr/bin/env node

/**
 * This script helps debug code signing issues by checking the signature
 * of the app bundle and providing detailed information.
 *
 * Usage: node debug-code-signing.cjs [path/to/app.app]
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const chalk = require("chalk") || {
  green: (s) => s,
  red: (s) => s,
  yellow: (s) => s,
  blue: (s) => s,
  gray: (s) => s,
};

// Get the app path from the command line arguments or use a default
const appPath =
  process.argv[2] ||
  path.resolve(
    __dirname,
    "../out/make/maestro-viewer-darwin-arm64/maestro-viewer.app"
  );

console.log(chalk.blue("Code Signing Debug Tool"));
console.log(chalk.blue("====================="));
console.log("");

// Check if the app exists
if (!fs.existsSync(appPath)) {
  console.error(chalk.red(`Error: App not found at ${appPath}`));
  console.log(
    chalk.yellow("Usage: node debug-code-signing.cjs [path/to/app.app]")
  );
  process.exit(1);
}

console.log(chalk.yellow(`Checking app bundle: ${appPath}`));
console.log("");

// Function to run a command and return its output
function runCommand(command, errorMessage) {
  try {
    const output = execSync(command, { encoding: "utf8" });
    return output.trim();
  } catch (error) {
    console.error(chalk.red(`${errorMessage}: ${error.message}`));
    return null;
  }
}

// Check if the app bundle exists and is valid
console.log(chalk.blue("1. Basic App Bundle Structure:"));
const infoPlistPath = path.join(appPath, "Contents/Info.plist");
const macOSPath = path.join(appPath, "Contents/MacOS");
const resourcesPath = path.join(appPath, "Contents/Resources");

if (fs.existsSync(infoPlistPath)) {
  console.log(chalk.green("✓ Info.plist exists"));
} else {
  console.log(chalk.red("✗ Info.plist is missing"));
}

if (fs.existsSync(macOSPath)) {
  console.log(chalk.green("✓ MacOS directory exists"));
} else {
  console.log(chalk.red("✗ MacOS directory is missing"));
}

if (fs.existsSync(resourcesPath)) {
  console.log(chalk.green("✓ Resources directory exists"));

  // Check if Resources directory has content
  const resourceFiles = fs.readdirSync(resourcesPath);
  if (resourceFiles.length > 0) {
    console.log(
      chalk.green(`  Found ${resourceFiles.length} files in Resources`)
    );
  } else {
    console.log(chalk.red("  Resources directory is empty"));
  }
} else {
  console.log(chalk.red("✗ Resources directory is missing"));
}

console.log("");

// Check code signature
console.log(chalk.blue("2. Code Signature Check:"));
const codesignOutput = runCommand(
  `codesign -dvv "${appPath}" 2>&1`,
  "Failed to check code signature"
);

if (codesignOutput) {
  // Parse and display important signature information
  const signatureInfo = {};

  const infoLines = codesignOutput.split("\n");
  infoLines.forEach((line) => {
    if (line.includes("=")) {
      const [key, value] = line.split("=").map((part) => part.trim());
      signatureInfo[key] = value;
    } else if (line.includes(":")) {
      const [key, value] = line.split(":").map((part) => part.trim());
      signatureInfo[key] = value;
    }
  });

  // Display signature type
  if (codesignOutput.includes("Signature=adhoc")) {
    console.log(
      chalk.red("✗ App has an ad-hoc signature (not suitable for distribution)")
    );
  } else if (codesignOutput.includes("Developer ID Application")) {
    console.log(
      chalk.green(
        "✓ App is signed with Developer ID Application certificate (suitable for distribution)"
      )
    );
  } else if (codesignOutput.includes("Apple Development")) {
    console.log(
      chalk.yellow(
        "⚠ App is signed with development certificate (not suitable for distribution)"
      )
    );
  } else {
    console.log(chalk.yellow("⚠ Unknown signature type"));
  }

  // Display Team ID
  if (
    signatureInfo["TeamIdentifier"] &&
    signatureInfo["TeamIdentifier"] !== "not set"
  ) {
    console.log(
      chalk.green(`✓ Team Identifier: ${signatureInfo["TeamIdentifier"]}`)
    );
  } else {
    console.log(chalk.red("✗ Team Identifier is not set"));
  }

  // Display Authority
  if (codesignOutput.includes("Authority=")) {
    const authorityLines = infoLines.filter((line) =>
      line.includes("Authority=")
    );
    console.log(chalk.green("✓ Signing authorities:"));
    authorityLines.forEach((line) => {
      console.log(`  ${line.trim()}`);
    });
  } else {
    console.log(chalk.red("✗ No signing authority information found"));
  }

  console.log("");
  console.log(chalk.gray("Full codesign output:"));
  console.log(chalk.gray(codesignOutput));
} else {
  console.log(chalk.red("Failed to get code signature information"));
}

console.log("");

// Check notarization status
console.log(chalk.blue("3. Notarization Check:"));
const spctlOutput = runCommand(
  `spctl -a -vv "${appPath}" 2>&1`,
  "Failed to check notarization"
);

if (spctlOutput) {
  if (spctlOutput.includes("accepted")) {
    console.log(chalk.green("✓ App is accepted by Gatekeeper"));
    if (spctlOutput.includes("notarized")) {
      console.log(chalk.green("✓ App is notarized"));
    } else {
      console.log(chalk.yellow("⚠ App is accepted but may not be notarized"));
    }
  } else {
    console.log(chalk.red("✗ App is not accepted by Gatekeeper"));
  }

  console.log("");
  console.log(chalk.gray("Full spctl output:"));
  console.log(chalk.gray(spctlOutput));
} else {
  console.log(chalk.red("Failed to check notarization status"));
}

console.log("");
console.log(chalk.blue("4. Recommendations:"));

if (codesignOutput && codesignOutput.includes("Signature=adhoc")) {
  console.log(
    chalk.yellow(
      "1. Your app has an ad-hoc signature, which is not suitable for distribution."
    )
  );
  console.log(
    chalk.yellow("   Make sure you have set up the following GitHub secrets:")
  );
  console.log("   - APPLE_ID");
  console.log("   - APPLE_ID_PASSWORD");
  console.log("   - APPLE_TEAM_ID");
  console.log("   - APPLE_TEAM_NAME");
  console.log(
    "   - CSC_LINK (base64-encoded Developer ID Application certificate)"
  );
  console.log("   - CSC_KEY_PASSWORD");

  console.log("");
  console.log(
    chalk.yellow(
      "2. Run the check-github-secrets.cjs script for more information on setting up these secrets."
    )
  );
}

if (
  !fs.existsSync(resourcesPath) ||
  fs.readdirSync(resourcesPath).length === 0
) {
  console.log("");
  console.log(
    chalk.yellow(
      "3. Your app bundle has no resources or the Resources directory is missing."
    )
  );
  console.log(
    "   This can cause code signing issues. Run the fix-code-signing.cjs script to fix this issue:"
  );
  console.log("   node scripts/fix-code-signing.cjs path/to/your/app.app");
}

console.log("");
console.log(
  chalk.blue("For more information on code signing and notarization, see:")
);
console.log(
  "https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution"
);
console.log(
  "https://developer.apple.com/documentation/xcode/notarizing_macos_software_before_distribution/resolving_common_notarization_issues"
);
