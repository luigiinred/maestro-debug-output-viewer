#!/usr/bin/env node

/**
 * This script checks if all required GitHub Actions secrets are set up
 * for code signing and notarization of macOS applications.
 *
 * Run this script locally to verify your GitHub repository has all needed secrets.
 */

const chalk = require("chalk") || {
  green: (s) => s,
  red: (s) => s,
  yellow: (s) => s,
  blue: (s) => s,
};

console.log(chalk.blue("GitHub Actions Code Signing Secrets Checker"));
console.log(chalk.blue("==========================================="));
console.log("");
console.log(
  "This script will help you verify that you have set up all required"
);
console.log("GitHub Actions secrets for code signing and notarization.");
console.log("");

// Required secrets for code signing and notarization
const requiredSecrets = [
  {
    name: "APPLE_ID",
    description: "Your Apple ID email used for notarization",
    example: "developer@example.com",
  },
  {
    name: "APPLE_ID_PASSWORD",
    description: "App-specific password for your Apple ID",
    example: "xxxx-xxxx-xxxx-xxxx",
  },
  {
    name: "APPLE_TEAM_ID",
    description: "Your Apple Developer Team ID (10-character code)",
    example: "A1B2C3D4E5",
  },
  {
    name: "APPLE_TEAM_NAME",
    description: "Your Apple Developer Team name",
    example: "Your Company, Inc.",
  },
  {
    name: "CSC_LINK",
    description: "Base64-encoded Developer ID Application certificate (.p12)",
    example: "base64-encoded string",
  },
  {
    name: "CSC_KEY_PASSWORD",
    description: "Password for your Developer ID Application certificate",
    example: "certificate-password",
  },
];

console.log(chalk.yellow("Required GitHub Secrets:"));
console.log("");

requiredSecrets.forEach((secret) => {
  console.log(`${chalk.yellow(secret.name)}`);
  console.log(`  Description: ${secret.description}`);
  console.log(`  Example: ${secret.example}`);
  console.log("");
});

console.log(chalk.blue("How to set up these secrets:"));
console.log("");
console.log("1. Go to your GitHub repository");
console.log('2. Click on "Settings" tab');
console.log('3. Click on "Secrets and variables" in the left sidebar');
console.log('4. Click on "Actions"');
console.log('5. Click on "New repository secret" button');
console.log("6. Add each of the secrets listed above");
console.log("");

console.log(chalk.yellow("For the CSC_LINK secret:"));
console.log("");
console.log(
  "1. Export your Developer ID Application certificate from Keychain Access"
);
console.log("2. Save it as a .p12 file with a password");
console.log("3. Base64 encode the .p12 file:");
console.log("   base64 -i path/to/certificate.p12 | pbcopy");
console.log("4. Paste the encoded string as the CSC_LINK secret value");
console.log("");

console.log(
  chalk.green("Once all secrets are set up, your GitHub Actions workflow")
);
console.log(
  chalk.green(
    "will be able to properly sign and notarize your macOS application."
  )
);
