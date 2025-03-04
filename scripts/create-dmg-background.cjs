const Jimp = require("jimp");
const path = require("path");
const fs = require("fs");

// DMG background dimensions (standard size)
const width = 600;
const height = 400;

async function createDmgBackground() {
  try {
    console.log("Creating DMG background image...");

    // Create a new image with a gradient background
    const image = new Jimp(width, height, 0xffffffff); // White background

    // Add a gradient effect
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Create a subtle gradient
        const r = Math.floor(220 + (x / width) * 35);
        const g = Math.floor(220 + (y / height) * 35);
        const b = 255;
        const hex = Jimp.rgbaToInt(r, g, b, 255);
        image.setPixelColor(hex, x, y);
      }
    }

    // Add text
    const font = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);
    image.print(font, 150, 350, "Drag to Applications folder");

    // Save the image
    const outputPath = path.resolve(__dirname, "../assets/dmg-background.png");
    await image.writeAsync(outputPath);

    console.log(`DMG background created at: ${outputPath}`);
  } catch (error) {
    console.error("Error creating DMG background:", error);
  }
}

createDmgBackground();
