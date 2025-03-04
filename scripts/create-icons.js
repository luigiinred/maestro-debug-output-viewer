const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Check if imagemagick is installed
try {
  execSync("which convert", { stdio: "ignore" });
} catch (error) {
  console.error(
    "Error: ImageMagick is not installed. Please install it using:"
  );
  console.error("  brew install imagemagick");
  process.exit(1);
}

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, "../public/icons");
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Convert SVG to PNG in various sizes
const sizes = [16, 32, 64, 128, 256, 512, 1024];
const svgPath = path.join(__dirname, "../public/icon.svg");

console.log("Converting SVG to PNG in various sizes...");
sizes.forEach((size) => {
  const pngPath = path.join(iconsDir, `icon_${size}x${size}.png`);
  execSync(
    `convert -background none -size ${size}x${size} ${svgPath} ${pngPath}`
  );
  console.log(`Created ${pngPath}`);
});

// Create iconset directory for macOS
const iconsetDir = path.join(iconsDir, "icon.iconset");
if (!fs.existsSync(iconsetDir)) {
  fs.mkdirSync(iconsetDir, { recursive: true });
}

// Copy PNGs to iconset directory with macOS naming convention
console.log("Creating macOS iconset...");
[16, 32, 128, 256, 512].forEach((size) => {
  const pngPath = path.join(iconsDir, `icon_${size}x${size}.png`);
  const iconsetPath = path.join(iconsetDir, `icon_${size}x${size}.png`);
  fs.copyFileSync(pngPath, iconsetPath);

  // Also create the @2x versions
  if (size < 512) {
    const doubleSize = size * 2;
    const doublePngPath = path.join(
      iconsDir,
      `icon_${doubleSize}x${doubleSize}.png`
    );
    const doubleIconsetPath = path.join(
      iconsetDir,
      `icon_${size}x${size}@2x.png`
    );
    fs.copyFileSync(doublePngPath, doubleIconsetPath);
  }
});

// Convert iconset to icns
console.log("Converting iconset to ICNS...");
const icnsPath = path.join(__dirname, "../public/icon.icns");
try {
  execSync(`iconutil -c icns -o ${icnsPath} ${iconsetDir}`);
  console.log(`Created ${icnsPath}`);
} catch (error) {
  console.error("Error creating ICNS file:", error.message);
  console.error("You may need to manually create the ICNS file using:");
  console.error(`  iconutil -c icns -o ${icnsPath} ${iconsetDir}`);
}

console.log("Icon creation completed.");
