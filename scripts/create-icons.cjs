const Jimp = require("jimp");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Icon sizes for different platforms
const sizes = [16, 32, 64, 128, 256, 512, 1024];

async function createIcons() {
  try {
    console.log("Creating application icons...");

    // Create base icon image (1024x1024)
    const image = new Jimp(1024, 1024, 0x4287f5ff); // Blue background

    // Add a simple design (a white "M" for Maestro)
    const font = await Jimp.loadFont(Jimp.FONT_SANS_128_WHITE);
    image.print(font, 350, 350, "M", 400);

    // Add a border
    for (let x = 0; x < 1024; x++) {
      for (let y = 0; y < 1024; y++) {
        // Create a border effect
        if (x < 10 || x > 1014 || y < 10 || y > 1014) {
          image.setPixelColor(Jimp.rgbaToInt(255, 255, 255, 255), x, y);
        }
      }
    }

    // Save the base PNG
    const baseIconPath = path.resolve(__dirname, "../electron/icons/icon.png");
    await image.writeAsync(baseIconPath);
    console.log(`Base icon created at: ${baseIconPath}`);

    // Create icons of different sizes
    for (const size of sizes) {
      const resized = image.clone().resize(size, size);
      const outputPath = path.resolve(
        __dirname,
        `../electron/icons/icon_${size}x${size}.png`
      );
      await resized.writeAsync(outputPath);
      console.log(`Created icon: ${outputPath}`);
    }

    // For macOS, create .icns file (requires iconutil on macOS)
    if (process.platform === "darwin") {
      try {
        const iconsetDir = path.resolve(
          __dirname,
          "../electron/icons/icon.iconset"
        );

        // Create iconset directory
        if (!fs.existsSync(iconsetDir)) {
          fs.mkdirSync(iconsetDir, { recursive: true });
        }

        // Copy icons to iconset directory with macOS naming convention
        fs.copyFileSync(
          path.resolve(__dirname, "../electron/icons/icon_16x16.png"),
          path.resolve(iconsetDir, "icon_16x16.png")
        );
        fs.copyFileSync(
          path.resolve(__dirname, "../electron/icons/icon_32x32.png"),
          path.resolve(iconsetDir, "icon_32x32.png")
        );
        fs.copyFileSync(
          path.resolve(__dirname, "../electron/icons/icon_128x128.png"),
          path.resolve(iconsetDir, "icon_128x128.png")
        );
        fs.copyFileSync(
          path.resolve(__dirname, "../electron/icons/icon_256x256.png"),
          path.resolve(iconsetDir, "icon_256x256.png")
        );
        fs.copyFileSync(
          path.resolve(__dirname, "../electron/icons/icon_512x512.png"),
          path.resolve(iconsetDir, "icon_512x512.png")
        );
        fs.copyFileSync(
          path.resolve(__dirname, "../electron/icons/icon_32x32.png"),
          path.resolve(iconsetDir, "icon_16x16@2x.png")
        );
        fs.copyFileSync(
          path.resolve(__dirname, "../electron/icons/icon_64x64.png"),
          path.resolve(iconsetDir, "icon_32x32@2x.png")
        );
        fs.copyFileSync(
          path.resolve(__dirname, "../electron/icons/icon_256x256.png"),
          path.resolve(iconsetDir, "icon_128x128@2x.png")
        );
        fs.copyFileSync(
          path.resolve(__dirname, "../electron/icons/icon_512x512.png"),
          path.resolve(iconsetDir, "icon_256x256@2x.png")
        );
        fs.copyFileSync(
          path.resolve(__dirname, "../electron/icons/icon_1024x1024.png"),
          path.resolve(iconsetDir, "icon_512x512@2x.png")
        );

        // Convert iconset to icns
        const icnsPath = path.resolve(__dirname, "../electron/icons/icon.icns");
        execSync(`iconutil -c icns -o "${icnsPath}" "${iconsetDir}"`);
        console.log(`Created macOS icon: ${icnsPath}`);

        // Create a copy named just "icon" for Electron Forge
        fs.copyFileSync(
          icnsPath,
          path.resolve(__dirname, "../electron/icons/icon")
        );
        console.log("Created copy of icon for Electron Forge");
      } catch (error) {
        console.error("Error creating macOS icons:", error);
      }
    }

    console.log("Icon creation complete!");
  } catch (error) {
    console.error("Error creating icons:", error);
  }
}

createIcons();
