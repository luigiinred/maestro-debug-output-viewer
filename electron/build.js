const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Create a directory for the compiled server code
const electronServerDir = path.join(__dirname, "server");
if (!fs.existsSync(electronServerDir)) {
  fs.mkdirSync(electronServerDir, { recursive: true });
}

// Compile the server code to JavaScript
console.log("Compiling server code...");
try {
  // Use tsc to compile the server code to JavaScript
  execSync(
    "npx tsc --project tsconfig.node.json --outDir electron/server server/index.ts",
    {
      stdio: "inherit",
    }
  );

  console.log("Server code compiled successfully.");

  // Modify the compiled server code to use CommonJS require instead of ES module imports
  const serverFilePath = path.join(electronServerDir, "index.js");
  if (fs.existsSync(serverFilePath)) {
    let serverCode = fs.readFileSync(serverFilePath, "utf8");

    // Replace ES module imports with CommonJS requires
    serverCode = serverCode.replace(
      /import\s+(\w+)\s+from\s+['"](.+)['"]/g,
      'const $1 = require("$2")'
    );
    serverCode = serverCode.replace(
      /import\s+\{\s*(.+)\s*\}\s+from\s+['"](.+)['"]/g,
      'const { $1 } = require("$2")'
    );

    // Replace export statements
    serverCode = serverCode.replace(
      /export\s+default\s+(\w+)/g,
      "module.exports = $1"
    );

    fs.writeFileSync(serverFilePath, serverCode);
    console.log("Server code modified for CommonJS compatibility.");
  } else {
    console.error("Compiled server file not found.");
  }
} catch (error) {
  console.error("Error compiling server code:", error);
  process.exit(1);
}

console.log("Build completed successfully.");
