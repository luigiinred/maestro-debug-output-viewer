const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const os = require("os");
const url = require("url");

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require("electron-squirrel-startup")) {
  app.quit();
}

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;

// Start the Express server
function startServer() {
  const server = express();
  let port = process.env.PORT || 3001;
  let maxPortAttempts = 10;
  let serverStarted = false;

  server.use(cors());
  server.use(express.json());

  // Basic routes for the server
  server.get("/api/files", async (req, res) => {
    try {
      const dirPath = req.query.dir || os.homedir();

      if (!dirPath) {
        return res.status(400).json({ error: "Directory path not specified" });
      }

      const files = fs.readdirSync(dirPath, { withFileTypes: true });
      const fileInfos = files.map((file) => {
        const filePath = path.join(dirPath, file.name);
        try {
          const stats = fs.statSync(filePath);
          return {
            name: file.name,
            path: filePath,
            type: file.isDirectory() ? "directory" : "file",
            size: stats.size,
            modifiedTime: stats.mtime.toISOString(),
          };
        } catch (error) {
          return {
            name: file.name,
            path: filePath,
            type: "unknown",
            error: error.message,
          };
        }
      });

      res.json(fileInfos);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Add the missing endpoint for file content
  server.get("/api/files/content", (req, res) => {
    try {
      const filePath = req.query.path;

      if (!filePath) {
        return res.status(400).json({ error: "File path not specified" });
      }

      // Check if the file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
      }

      // Check if the file is an image based on extension
      const isImage = /\.(png|jpg|jpeg|gif)$/i.test(filePath);

      if (isImage) {
        // For images, send the file directly
        return res.sendFile(filePath);
      } else {
        // For JSON files, parse and send as JSON
        const content = fs.readFileSync(filePath, "utf-8");
        try {
          res.json(JSON.parse(content));
        } catch (parseError) {
          // If it's not valid JSON, send as text
          res.send(content);
        }
      }
    } catch (error) {
      console.error("Error reading file:", error);
      res.status(500).json({ error: "Failed to read file: " + error.message });
    }
  });

  // Add endpoint for flow images
  server.get("/api/flow-images", (req, res) => {
    try {
      const directory = req.query.directory;
      const flowName = req.query.flowName;

      if (!directory || !flowName) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      // Check if the directory exists
      if (!fs.existsSync(directory)) {
        return res.status(404).json({ error: "Directory not found" });
      }

      // Find the flow directory - it might be in a subdirectory
      const flowDir = findFlowDirectory(directory, flowName);

      if (!flowDir) {
        return res.status(404).json({ error: "Flow directory not found" });
      }

      // Look for images in the flow directory
      const images = findImagesInDirectory(flowDir);

      res.json({ images });
    } catch (error) {
      console.error("Error fetching flow images:", error);
      res
        .status(500)
        .json({ error: "Failed to fetch flow images: " + error.message });
    }
  });

  // Add endpoint for test data
  server.get("/api/test/:testId", (req, res) => {
    try {
      const debugDir = req.query.dir;
      const testId = req.params.testId;

      if (!debugDir || !testId) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      const testPath = path.join(debugDir, testId);

      if (!fs.existsSync(testPath)) {
        return res.status(404).json({ error: "Test directory not found" });
      }

      const files = fs.readdirSync(testPath);

      // Process and return test data
      // This is a simplified implementation - you may need to adapt it based on your specific needs
      res.json({
        testId,
        files,
      });
    } catch (error) {
      console.error("Error processing test data:", error);
      res
        .status(500)
        .json({ error: "Failed to process test data: " + error.message });
    }
  });

  // Try to start the server with port fallback
  return new Promise((resolve, reject) => {
    const attemptListen = (currentPort, attemptsLeft) => {
      const serverInstance = server
        .listen(currentPort, () => {
          console.log(`Server running at http://localhost:${currentPort}`);
          serverStarted = true;
          resolve({ server: serverInstance, port: currentPort });
        })
        .on("error", (err) => {
          if (err.code === "EADDRINUSE" && attemptsLeft > 0) {
            console.log(
              `Port ${currentPort} is in use, trying ${currentPort + 1}...`
            );
            attemptListen(currentPort + 1, attemptsLeft - 1);
          } else {
            console.error(`Failed to start server: ${err.message}`);
            // Resolve with null server but don't reject - app can still function
            resolve({ server: null, port: null });
          }
        });
    };

    attemptListen(port, maxPortAttempts);
  });
}

// Helper function to find a flow directory
function findFlowDirectory(baseDir, flowName) {
  // First, check if there's a direct match in the base directory
  const files = fs.readdirSync(baseDir, { withFileTypes: true });

  // Look for directories that might contain the flow name
  for (const file of files) {
    if (file.isDirectory()) {
      const dirPath = path.join(baseDir, file.name);

      // Check if this directory contains the flow name
      if (file.name.includes(flowName) || dirPath.includes(flowName)) {
        return dirPath;
      }

      // Check subdirectories (one level deep)
      try {
        const subFiles = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const subFile of subFiles) {
          if (subFile.isDirectory()) {
            const subDirPath = path.join(dirPath, subFile.name);
            if (
              subFile.name.includes(flowName) ||
              subDirPath.includes(flowName)
            ) {
              return subDirPath;
            }
          }
        }
      } catch (error) {
        console.error(`Error reading subdirectory ${dirPath}:`, error);
      }
    }
  }

  // If no specific flow directory is found, return the base directory
  return baseDir;
}

// Helper function to find images in a directory
function findImagesInDirectory(directory) {
  const images = [];

  try {
    const files = fs.readdirSync(directory, { withFileTypes: true });

    // First, look for image files directly in the directory
    for (const file of files) {
      if (file.isFile() && /\.(png|jpg|jpeg|gif)$/i.test(file.name)) {
        const imagePath = path.join(directory, file.name);
        images.push({
          name: file.name,
          path: imagePath,
          url: `/api/files/content?path=${encodeURIComponent(imagePath)}`,
        });
      }
    }

    // Then, look for subdirectories that might contain images (like "screenshots")
    for (const file of files) {
      if (file.isDirectory()) {
        const subDirPath = path.join(directory, file.name);

        // Check if this is a screenshots directory
        if (
          file.name.toLowerCase().includes("screenshot") ||
          file.name.toLowerCase().includes("image")
        ) {
          try {
            const subFiles = fs.readdirSync(subDirPath, {
              withFileTypes: true,
            });
            for (const subFile of subFiles) {
              if (
                subFile.isFile() &&
                /\.(png|jpg|jpeg|gif)$/i.test(subFile.name)
              ) {
                const imagePath = path.join(subDirPath, subFile.name);
                images.push({
                  name: subFile.name,
                  path: imagePath,
                  url: `/api/files/content?path=${encodeURIComponent(
                    imagePath
                  )}`,
                });
              }
            }
          } catch (error) {
            console.error(`Error reading subdirectory ${subDirPath}:`, error);
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error finding images in directory ${directory}:`, error);
  }

  return images;
}

function createWindow() {
  // Start the server
  startServer().then(({ server, port }) => {
    // Store the server and port in global variables if needed
    global.expressServer = server;
    global.serverPort = port;

    // Set the port in the environment for the renderer process
    if (port) {
      process.env.API_PORT = port.toString();
    }

    // Create the browser window
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, "preload.cjs"),
      },
    });

    // Pass the port to the renderer process
    if (port) {
      mainWindow.serverPort = port;
    }

    // Load the app
    const isDev = process.env.NODE_ENV === "development";

    if (isDev) {
      // In development, load from the dev server
      mainWindow.loadURL("http://localhost:5173");
      // Open DevTools
      mainWindow.webContents.openDevTools();
    } else {
      // In production, try to load from the app.asar file
      try {
        // First, try to load from the app.asar file
        const asarPath = path.join(
          process.resourcesPath,
          "app.asar",
          "dist",
          "index.html"
        );
        console.log(`Trying to load from app.asar: ${asarPath}`);
        console.log(`File exists: ${fs.existsSync(asarPath)}`);

        if (fs.existsSync(asarPath)) {
          // Use file:// protocol with the correct format
          const fileUrl = url.format({
            pathname: asarPath,
            protocol: "file:",
            slashes: true,
          });
          console.log(`Loading URL: ${fileUrl}`);
          mainWindow.loadFile(asarPath);
        } else {
          // Fallback to the dist directory
          const indexPath = path.resolve(__dirname, "../dist/index.html");
          console.log(`Falling back to: ${indexPath}`);
          console.log(`File exists: ${fs.existsSync(indexPath)}`);

          if (fs.existsSync(indexPath)) {
            console.log(`Loading file: ${indexPath}`);
            mainWindow.loadFile(indexPath);
          } else {
            console.error("Could not find index.html in any location");
            mainWindow.loadURL(
              `data:text/html,<html><body><h1>Error</h1><p>Could not find index.html</p></body></html>`
            );
          }
        }

        // Open DevTools in production for debugging
        mainWindow.webContents.openDevTools();
      } catch (error) {
        console.error("Error loading app:", error);
        mainWindow.loadURL(
          `data:text/html,<html><body><h1>Error</h1><p>${error.message}</p></body></html>`
        );
      }
    }

    // Emitted when the window is closed
    mainWindow.on("closed", () => {
      mainWindow = null;
    });
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  // Set up IPC handler for getting the server port
  ipcMain.handle("get-server-port", () => {
    return global.serverPort || 3001;
  });

  app.on("activate", () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open
    if (mainWindow === null) createWindow();
  });
});

// Quit when all windows are closed, except on macOS
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process code
// You can also put them in separate files and require them here
