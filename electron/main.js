const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const express = require("express");
const cors = require("cors");
const fs = require("fs").promises;
const os = require("os");

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;

// Start the Express server
function startServer() {
  const server = express();
  const port = 3001;

  server.use(cors());
  server.use(express.json());

  // Import server routes from the compiled server file
  try {
    // Try to load the compiled server code
    const serverPath = path.join(__dirname, "server", "index.js");
    if (fs.existsSync) {
      const serverModule = require(serverPath);
      // If the server module exports a function, call it with our Express app
      if (typeof serverModule === "function") {
        serverModule(server);
      }
    }
  } catch (error) {
    console.error("Error loading server module:", error);

    // Fallback to basic routes if server module can't be loaded
    // Routes (simplified version - fallback if server code can't be loaded)
    server.get("/api/files", async (req, res) => {
      try {
        const dirPath = req.query.dir || os.homedir();

        if (!dirPath) {
          return res
            .status(400)
            .json({ error: "Directory path not specified" });
        }

        const files = await fs.readdir(dirPath, { withFileTypes: true });
        const fileInfoPromises = files.map(async (file) => {
          const filePath = path.join(dirPath, file.name);
          try {
            const stats = await fs.stat(filePath);
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

        const fileInfos = await Promise.all(fileInfoPromises);
        res.json(fileInfos);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });

  return server;
}

function createWindow() {
  // Start the server
  const server = startServer();

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Load the app
  const isDev = process.env.NODE_ENV === "development";

  if (isDev) {
    // In development, load from the dev server
    mainWindow.loadURL("http://localhost:5173");
    // Open DevTools
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from the built files
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  // Emitted when the window is closed
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  // Set up IPC handlers
  ipcMain.handle("reveal-in-finder", async (event, folderPath) => {
    try {
      await shell.showItemInFolder(folderPath);
      return { success: true };
    } catch (error) {
      console.error("Error revealing folder in finder:", error);
      return { success: false, error: error.message };
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
