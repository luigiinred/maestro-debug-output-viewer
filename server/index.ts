import express, { Request, Response } from "express";
import cors from "cors";
import { promises as fs } from "fs";
import path from "path";
import { Dirent } from "fs";
import os from "os";

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Types
interface FileInfo {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  modifiedTime?: string;
}

// Routes
app.get("/api/files", async (req: Request, res: Response) => {
  try {
    const dirPath = (req.query.dir as string) || os.homedir();

    if (!dirPath) {
      return res.status(400).json({ error: "Directory path not specified" });
    }

    const files = await fs.readdir(dirPath, { withFileTypes: true });
    const fileInfos: FileInfo[] = await Promise.all(
      files.map(async (file: Dirent) => {
        const fullPath = path.join(dirPath, file.name);
        let size: number | undefined;
        let modifiedTime: string | undefined;

        try {
          const stats = await fs.stat(fullPath);
          size = stats.size;
          modifiedTime = stats.mtime.toISOString();
        } catch (error) {
          console.error(`Error getting stats for ${fullPath}:`, error);
        }

        return {
          name: file.name,
          path: fullPath,
          type: file.isDirectory() ? "directory" : "file",
          size,
          modifiedTime,
        };
      })
    );

    res.json(fileInfos);
  } catch (error) {
    console.error("Error reading directory:", error);
    res.status(500).json({ error: "Failed to read directory" });
  }
});

app.get("/api/files/content", async (req: Request, res: Response) => {
  try {
    const filePath = req.query.path as string;

    if (!filePath) {
      return res.status(400).json({ error: "File path not specified" });
    }

    // Check if the file is an image based on extension
    const isImage = /\.(png|jpg|jpeg|gif)$/i.test(filePath);

    if (isImage) {
      // For images, send the file directly
      return res.sendFile(filePath);
    } else {
      // For JSON files, parse and send as JSON
      const content = await fs.readFile(filePath, "utf-8");
      res.json(JSON.parse(content));
    }
  } catch (error) {
    console.error("Error reading file:", error);
    res.status(500).json({ error: "Failed to read file" });
  }
});

app.get("/api/test/:testId", async (req: Request, res: Response) => {
  try {
    const debugDir = req.query.dir as string;
    const testId = req.params.testId;

    if (!debugDir || !testId) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const testPath = path.join(debugDir, testId);
    const files = await fs.readdir(testPath);

    // Read test metadata and steps
    const metadata = await fs
      .readFile(path.join(testPath, "metadata.json"), "utf-8")
      .catch(() => "{}");

    res.json({
      id: testId,
      metadata: JSON.parse(metadata),
      files,
    });
  } catch (error) {
    console.error("Error reading test details:", error);
    res.status(500).json({ error: "Failed to read test details" });
  }
});

app.get("/api/test/:testId/steps", async (req: Request, res: Response) => {
  try {
    const debugDir = req.query.dir as string;
    const testId = req.params.testId;

    if (!debugDir || !testId) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const testPath = path.join(debugDir, testId);
    const stepsFile = await fs
      .readFile(path.join(testPath, "steps.json"), "utf-8")
      .catch(() => "[]");

    res.json(JSON.parse(stepsFile));
  } catch (error) {
    console.error("Error reading test steps:", error);
    res.status(500).json({ error: "Failed to read test steps" });
  }
});

// New endpoint to serve screenshot images
app.get("/api/screenshot", async (req: Request, res: Response) => {
  try {
    const { directory, timestamp, commandName } = req.query;

    if (!directory) {
      return res.status(400).json({ error: "Directory path not specified" });
    }

    // Read all files in the directory
    const files = await fs.readdir(directory as string);

    // Find screenshot files that match the pattern
    const screenshotPattern = timestamp
      ? `screenshot-❌-${timestamp}-`
      : "screenshot-❌-";

    const commandPattern = commandName ? `(${commandName})` : "";

    // Find matching screenshot
    const matchingScreenshot = files.find(
      (file) =>
        file.includes(screenshotPattern) &&
        (commandName ? file.includes(commandPattern) : true) &&
        (file.endsWith(".png") || file.endsWith(".jpg"))
    );

    if (!matchingScreenshot) {
      return res.status(404).json({ error: "Screenshot not found" });
    }

    const screenshotPath = path.join(directory as string, matchingScreenshot);

    // Send the image file
    res.sendFile(screenshotPath);
  } catch (error) {
    console.error("Error serving screenshot:", error);
    res.status(500).json({ error: "Failed to serve screenshot" });
  }
});

app.get(
  "/api/command-images/:commandName",
  async (req: Request, res: Response) => {
    try {
      const debugDir = req.query.dir as string;
      const commandName = req.params.commandName;
      const timestamp = req.query.timestamp as string;

      if (!debugDir || !commandName || !timestamp) {
        return res.status(400).json({ error: "Missing required parameters" });
      }

      // Get all files in the directory
      const files = await fs.readdir(debugDir);

      // Filter for image files that match the command name and timestamp
      const matchingImages = files.filter((file) => {
        return (
          file.includes(commandName) &&
          file.includes(timestamp) &&
          (file.endsWith(".png") ||
            file.endsWith(".jpg") ||
            file.endsWith(".jpeg"))
        );
      });

      // Sort images by timestamp if present in filename
      const sortedImages = matchingImages.sort((a, b) => {
        const timestampA = a.match(/\d+/)?.[0] || "";
        const timestampB = b.match(/\d+/)?.[0] || "";
        return timestampA.localeCompare(timestampB);
      });

      // Return the list of matching image paths
      res.json({
        images: sortedImages.map((image) => ({
          path: path.join(debugDir, image),
          url: `/api/files/content?path=${encodeURIComponent(
            path.join(debugDir, image)
          )}`,
        })),
      });
    } catch (error) {
      console.error("Error fetching command images:", error);
      res.status(500).json({ error: "Failed to fetch command images" });
    }
  }
);

app.get("/api/flow-images", async (req: Request, res: Response) => {
  try {
    const { directory, flowName } = req.query;

    if (!directory || !flowName) {
      return res
        .status(400)
        .json({ error: "Directory and flow name are required" });
    }

    // Properly decode the flowName parameter
    const decodedFlowName = decodeURIComponent(flowName as string);
    console.log("Requested flow name:", JSON.stringify(decodedFlowName));
    console.log("Requested flow name length:", decodedFlowName.length);
    console.log(
      "Requested flow name chars:",
      [...decodedFlowName].map((c) => c.charCodeAt(0))
    );

    // Read all files in the directory
    const files = await fs.readdir(directory as string);

    // Process image files only
    const imageFiles = files.filter(
      (file) =>
        file.endsWith(".png") || file.endsWith(".jpg") || file.endsWith(".jpeg")
    );

    console.log(`Found ${imageFiles.length} image files in directory`);

    // For each file, extract the flow name from parentheses and compare directly
    const matchingImages = [];

    for (const file of imageFiles) {
      // Extract the flow name from the filename using a regex
      const match = file.match(/\(([^)]+)\)/);
      if (match) {
        const extractedFlowName = match[1];
        console.log("File:", file);
        console.log(
          "  Extracted flow name:",
          JSON.stringify(extractedFlowName)
        );
        console.log("  Extracted flow name length:", extractedFlowName.length);
        console.log(
          "  Extracted flow name chars:",
          [...extractedFlowName].map((c) => c.charCodeAt(0))
        );
        console.log(
          "  Matches requested:",
          extractedFlowName === decodedFlowName
        );

        if (extractedFlowName === decodedFlowName) {
          matchingImages.push({
            name: file,
            path: path.join(directory as string, file),
            url: `/api/files/content?path=${encodeURIComponent(
              path.join(directory as string, file)
            )}`,
          });
        }
      }
    }

    console.log(
      `Found ${matchingImages.length} matching images out of ${imageFiles.length} total image files`
    );

    res.json({ images: matchingImages });
  } catch (error) {
    console.error("Error fetching flow images:", error);
    res.status(500).json({ error: "Failed to fetch flow images" });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
