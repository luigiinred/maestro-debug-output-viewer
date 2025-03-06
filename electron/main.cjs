const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const os = require("os");
const url = require("url");
const WebSocket = require("ws");
const chokidar = require("chokidar");

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require("electron-squirrel-startup")) {
  app.quit();
}

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;
// Keep a reference to the WebSocket server
let wss;
// Keep a reference to the file watcher
let watcher;

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

      console.log(`Fetching files from directory: ${dirPath}`);

      // Check if the directory exists
      if (!fs.existsSync(dirPath)) {
        console.log(`Directory not found: ${dirPath}`);
        return res.status(404).json({ error: "Directory not found" });
      }

      // Try to read the directory with more detailed error handling
      let dirEntries;
      try {
        dirEntries = fs.readdirSync(dirPath, { withFileTypes: true });
      } catch (readError) {
        console.error(`Error reading directory ${dirPath}:`, readError);
        return res.status(500).json({
          error: `Failed to read directory: ${readError.message}`,
          code: readError.code,
        });
      }

      const fileInfos = [];

      // Process each file with individual error handling
      for (const file of dirEntries) {
        try {
          const filePath = path.join(dirPath, file.name);
          const stats = fs.statSync(filePath);
          fileInfos.push({
            name: file.name,
            path: filePath,
            type: file.isDirectory() ? "directory" : "file",
            size: stats.size,
            modifiedTime: stats.mtime.toISOString(),
          });
        } catch (fileError) {
          console.error(`Error processing file ${file.name}:`, fileError);
          // Add the file with error information instead of skipping it
          fileInfos.push({
            name: file.name,
            path: path.join(dirPath, file.name),
            type: "unknown",
            error: fileError.message,
            code: fileError.code,
          });
        }
      }

      res.json(fileInfos);
    } catch (error) {
      console.error(`Global error in /api/files endpoint:`, error);
      res.status(500).json({
        error: error.message,
        code: error.code,
        stack: error.stack,
      });
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

  // Add endpoint for watching a directory
  server.post("/api/watch-directory", (req, res) => {
    try {
      const { directory } = req.body;

      if (!directory) {
        return res.status(400).json({ error: "Directory path not specified" });
      }

      // Check if the directory exists
      if (!fs.existsSync(directory)) {
        return res.status(404).json({ error: "Directory not found" });
      }

      // Look for .maestro/tests directory
      let testsDir = directory;
      if (!directory.endsWith(".maestro/tests")) {
        const maestroTestsPath = path.join(directory, ".maestro", "tests");
        if (fs.existsSync(maestroTestsPath)) {
          testsDir = maestroTestsPath;
        } else {
          return res.status(404).json({
            error: "No .maestro/tests directory found in the specified path",
          });
        }
      }

      // Set up a watcher for the .maestro/tests directory
      setupWatcher(testsDir);

      res.json({
        success: true,
        message: "Now watching for changes in " + testsDir,
        watchingDirectory: testsDir,
      });
    } catch (error) {
      console.error("Error setting up directory watch:", error);
      res.status(500).json({
        error: "Failed to set up directory watch: " + error.message,
      });
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

      // Read all image files in the directory
      const allImages = findAllImagesInDirectory(directory);

      // Filter images that match the flow name in parentheses
      const decodedFlowName = decodeURIComponent(flowName);
      console.log(`Looking for images with flow name: "${decodedFlowName}"`);

      const matchingImages = allImages.filter((image) => {
        // Extract the flow name from the filename (assuming format includes flow name in parentheses)
        const flowNameMatch = image.name.match(/\(([^)]+)\)/);
        const imageFlowName = flowNameMatch ? flowNameMatch[1] : "";

        const matches = imageFlowName === decodedFlowName;
        console.log(
          `Image: ${image.name}, Flow name: "${imageFlowName}", Matches: ${matches}`
        );

        return matches;
      });

      console.log(
        `Found ${matchingImages.length} matching images out of ${allImages.length} total images`
      );

      res.json({ images: matchingImages });
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

  // Add endpoint for deleting test runs
  server.delete("/api/test-run", (req, res) => {
    try {
      const testRunPath = req.query.path;

      if (!testRunPath) {
        return res.status(400).json({ error: "Test run path not specified" });
      }

      // Check if the directory exists
      if (!fs.existsSync(testRunPath)) {
        return res.status(404).json({ error: "Test run directory not found" });
      }

      // Recursively delete the directory
      const deleteDirectory = (dirPath) => {
        if (fs.existsSync(dirPath)) {
          fs.readdirSync(dirPath).forEach((file) => {
            const curPath = path.join(dirPath, file);
            if (fs.lstatSync(curPath).isDirectory()) {
              // Recursive call for directories
              deleteDirectory(curPath);
            } else {
              // Delete file
              fs.unlinkSync(curPath);
            }
          });
          // Delete the empty directory
          fs.rmdirSync(dirPath);
        }
      };

      deleteDirectory(testRunPath);
      res.json({ success: true, message: "Test run deleted successfully" });
    } catch (error) {
      console.error("Error deleting test run:", error);
      res
        .status(500)
        .json({ error: "Failed to delete test run: " + error.message });
    }
  });

  // Try to start the server with port fallback
  return new Promise((resolve, reject) => {
    const attemptListen = (currentPort, attemptsLeft) => {
      const serverInstance = server
        .listen(currentPort, () => {
          console.log(`Server running at http://localhost:${currentPort}`);
          serverStarted = true;

          // Set up WebSocket server
          wss = new WebSocket.Server({ server: serverInstance });

          console.log("WebSocket server initialized");

          // Handle WebSocket connections
          wss.on("connection", (ws) => {
            console.log("WebSocket client connected");

            // Send a welcome message
            ws.send(
              JSON.stringify({
                type: "connection",
                message:
                  "Connected to Maestro Debug Output Viewer WebSocket server",
              })
            );

            // Handle WebSocket messages from clients
            ws.on("message", (message) => {
              try {
                const data = JSON.parse(message);
                console.log("Received message:", data);

                // Handle different message types
                if (data.type === "watch" && data.directory) {
                  setupWatcher(data.directory);
                  ws.send(
                    JSON.stringify({
                      type: "watch-response",
                      success: true,
                      message: `Now watching ${data.directory}`,
                    })
                  );
                }
              } catch (error) {
                console.error("Error handling WebSocket message:", error);
                ws.send(
                  JSON.stringify({
                    type: "error",
                    message: "Error processing message",
                  })
                );
              }
            });

            // Handle WebSocket disconnections
            ws.on("close", () => {
              console.log("WebSocket client disconnected");
            });
          });

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

// Function to set up a file watcher for the specified directory
function setupWatcher(directoryPath) {
  try {
    // Close any existing watcher
    if (watcher) {
      try {
        watcher.close();
        console.log("Closed existing watcher");
      } catch (closeError) {
        console.error("Error closing existing watcher:", closeError);
      }
    }

    console.log(`Setting up watcher for ${directoryPath}`);

    // Verify the directory exists and is accessible
    if (!fs.existsSync(directoryPath)) {
      console.error(`Directory does not exist: ${directoryPath}`);
      return null;
    }

    try {
      // Test if we can read the directory
      fs.accessSync(directoryPath, fs.constants.R_OK);
    } catch (accessError) {
      console.error(`Cannot access directory ${directoryPath}:`, accessError);
      return null;
    }

    // Initialize the watcher with appropriate options
    watcher = chokidar.watch(directoryPath, {
      persistent: true,
      ignoreInitial: true,
      depth: 4, // Watch subdirectories up to 4 levels deep
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100,
      },
      disableGlobbing: true, // Disable globbing to prevent pattern matching issues
      usePolling: true, // Use polling for more reliable watching across platforms
    });

    // Log what's being watched
    watcher.on("ready", () => {
      const watchedPaths = watcher.getWatched();
      console.log("Initial scan complete. Watching for changes...");
      console.log("Watched paths:", Object.keys(watchedPaths).length);
    });

    // Handle file/directory events
    watcher.on("all", (event, path) => {
      console.log(`${event} detected on ${path}`);

      // Broadcast the change to all connected WebSocket clients
      if (wss && wss.clients) {
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({
                type: "change",
                event: event,
                path: path,
                timestamp: new Date().toISOString(),
              })
            );
          }
        });
      }
    });

    // Handle watcher errors
    watcher.on("error", (error) => {
      console.error(`Watcher error: ${error}`);

      // Notify clients about the error
      if (wss && wss.clients) {
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({
                type: "error",
                message: `Watcher error: ${error.message}`,
                timestamp: new Date().toISOString(),
              })
            );
          }
        });
      }
    });

    return watcher;
  } catch (error) {
    console.error(`Error setting up watcher for ${directoryPath}:`, error);
    return null;
  }
}

// Helper function to find all images in a directory (including subdirectories)
function findAllImagesInDirectory(directory) {
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

    // Then, look for subdirectories that might contain images
    for (const file of files) {
      if (file.isDirectory()) {
        const subDirPath = path.join(directory, file.name);
        try {
          const subFiles = fs.readdirSync(subDirPath, { withFileTypes: true });
          for (const subFile of subFiles) {
            if (
              subFile.isFile() &&
              /\.(png|jpg|jpeg|gif)$/i.test(subFile.name)
            ) {
              const imagePath = path.join(subDirPath, subFile.name);
              images.push({
                name: subFile.name,
                path: imagePath,
                url: `/api/files/content?path=${encodeURIComponent(imagePath)}`,
              });
            }
          }
        } catch (error) {
          console.error(`Error reading subdirectory ${subDirPath}:`, error);
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
    global.wsPort = port; // WebSocket uses the same port as the HTTP server

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
    const isDev =
      process.env.NODE_ENV === "development" ||
      process.env.ELECTRON_IS_DEV === "1";
    console.log(`Running in ${isDev ? "development" : "production"} mode`);

    if (isDev) {
      // In development, load from the dev server
      console.log("Loading from dev server at http://localhost:5173");
      mainWindow.loadURL("http://localhost:5173");
      // Open DevTools
      mainWindow.webContents.openDevTools();
    } else {
      // In production, try to load from the dist directory first
      try {
        const indexPath = path.resolve(__dirname, "../dist/index.html");
        console.log(`Trying to load from dist directory: ${indexPath}`);

        if (fs.existsSync(indexPath)) {
          console.log(`Loading file: ${indexPath}`);
          mainWindow.loadFile(indexPath);
        } else {
          // Fallback to the app.asar file
          const asarPath = path.join(
            process.resourcesPath,
            "app.asar",
            "dist",
            "index.html"
          );
          console.log(`Falling back to app.asar: ${asarPath}`);

          if (fs.existsSync(asarPath)) {
            // Use file:// protocol with the correct format
            console.log(`Loading from app.asar: ${asarPath}`);
            mainWindow.loadFile(asarPath);
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

  // Set up IPC handler for getting the WebSocket port
  ipcMain.handle("get-ws-port", () => {
    return global.wsPort || global.serverPort || 3001;
  });

  // Set up IPC handler for watching a directory
  ipcMain.handle("watch-directory", (event, directory) => {
    try {
      console.log(`Received watch-directory request for: ${directory}`);

      if (!directory) {
        console.log("No directory specified");
        return { success: false, error: "Directory path not specified" };
      }

      // Normalize the path to handle any potential issues
      const normalizedPath = path.normalize(directory);
      console.log(`Normalized path: ${normalizedPath}`);

      // Check if the directory exists
      if (!fs.existsSync(normalizedPath)) {
        console.log(`Directory not found: ${normalizedPath}`);
        return { success: false, error: "Directory not found" };
      }

      // Look for .maestro/tests directory
      let testsDir = normalizedPath;
      if (!normalizedPath.endsWith(".maestro/tests")) {
        const maestroTestsPath = path.join(normalizedPath, ".maestro", "tests");
        console.log(`Checking for .maestro/tests at: ${maestroTestsPath}`);

        if (fs.existsSync(maestroTestsPath)) {
          testsDir = maestroTestsPath;
          console.log(`Found .maestro/tests directory at: ${testsDir}`);
        } else {
          console.log(
            `No .maestro/tests directory found at: ${maestroTestsPath}`
          );
          return {
            success: false,
            error: "No .maestro/tests directory found in the specified path",
          };
        }
      }

      // Verify we can access the directory
      try {
        fs.accessSync(testsDir, fs.constants.R_OK);
      } catch (accessError) {
        console.error(`Cannot access directory ${testsDir}:`, accessError);
        return {
          success: false,
          error: `Cannot access directory: ${accessError.message}`,
          code: accessError.code,
        };
      }

      // Set up the watcher
      const watcherResult = setupWatcher(testsDir);

      if (!watcherResult) {
        return {
          success: false,
          error: "Failed to set up watcher for the directory",
        };
      }

      return {
        success: true,
        message: "Now watching for changes in " + testsDir,
        watchingDirectory: testsDir,
      };
    } catch (error) {
      console.error("Error setting up directory watch:", error);
      return {
        success: false,
        error: "Failed to set up directory watch: " + error.message,
        code: error.code,
        stack: error.stack,
      };
    }
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
