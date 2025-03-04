#!/usr/bin/env node

/**
 * This script helps with local testing of the code signing process for Electron Forge.
 * It checks if all required environment variables are set and provides guidance.
 */

const chalk = require("chalk") || {
  green: (s) => s,
  red: (s) => s,
  yellow: (s) => s,
  blue: (s) => s,
};
const fs = require("fs");
const path = require("path");

// Required environment variables for code signing and notarization
const requiredVars = [
  "APPLE_ID",
  "APPLE_ID_PASSWORD",
  "APPLE_TEAM_ID",
  "APPLE_TEAM_NAME",
  "CSC_LINK",
  "CSC_KEY_PASSWORD",
];

// Check if .env file exists
const envPath = path.join(process.cwd(), ".env");
if (!fs.existsSync(envPath)) {
  console.log(
    chalk.red("❌ .env file not found. Please create one based on .env.example")
  );
  process.exit(1);
}

// Load .env file
require("dotenv").config();

// Check if all required variables are set
const missingVars = requiredVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.log(chalk.red("❌ Missing required environment variables:"));
  missingVars.forEach((varName) => {
    console.log(chalk.yellow(`   - ${varName}`));
  });
  console.log("\nPlease add these variables to your .env file.");
  console.log("For CSC_LINK, you need to base64 encode your certificate:");
  console.log(chalk.blue("   base64 -i path/to/certificate.p12 | pbcopy"));
  process.exit(1);
}

console.log(chalk.green("✅ All required environment variables are set."));
console.log(chalk.green("✅ You can now run: npm run make"));

// Print some helpful information
console.log("\nEnvironment variables found:");
requiredVars.forEach((varName) => {
  const value = process.env[varName];
  const displayValue =
    varName.includes("PASSWORD") || varName.includes("CSC_")
      ? "********"
      : value;
  console.log(`   - ${varName}: ${displayValue}`);
});

console.log(
  "\nElectron Forge will use these variables for code signing and notarization."
);
console.log("The signed app will be available in the out/make directory.");
