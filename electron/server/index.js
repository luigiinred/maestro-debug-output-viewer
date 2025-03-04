
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');

function createServer() {
  const app = express();
  const port = 3001;

  app.use(cors());
  app.use(express.json());

  // Routes
  app.get('/api/files', (req, res) => {
    try {
      const dirPath = req.query.dir || os.homedir();
      
      if (!dirPath) {
        return res.status(400).json({ error: 'Directory path not specified' });
      }
      
      const files = fs.readdirSync(dirPath, { withFileTypes: true });
      const fileInfos = files.map((file) => {
        const filePath = path.join(dirPath, file.name);
        try {
          const stats = fs.statSync(filePath);
          return {
            name: file.name,
            path: filePath,
            type: file.isDirectory() ? 'directory' : 'file',
            size: stats.size,
            modifiedTime: stats.mtime.toISOString()
          };
        } catch (error) {
          return {
            name: file.name,
            path: filePath,
            type: 'unknown',
            error: error.message
          };
        }
      });
      
      res.json(fileInfos);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/files/content', (req, res) => {
    try {
      const filePath = req.query.path;
      
      if (!filePath) {
        return res.status(400).json({ error: 'File path not specified' });
      }

      // Check if the file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Check if the file is an image based on extension
      const isImage = /\.(png|jpg|jpeg|gif)$/i.test(filePath);

      if (isImage) {
        // For images, send the file directly
        return res.sendFile(filePath);
      } else {
        // For JSON files, parse and send as JSON
        const content = fs.readFileSync(filePath, 'utf-8');
        try {
          res.json(JSON.parse(content));
        } catch (parseError) {
          // If it's not valid JSON, send as text
          res.send(content);
        }
      }
    } catch (error) {
      console.error('Error reading file:', error);
      res.status(500).json({ error: 'Failed to read file: ' + error.message });
    }
  });

  app.get('/api/flow-images', (req, res) => {
    try {
      const directory = req.query.directory;
      const flowName = req.query.flowName;
      
      if (!directory || !flowName) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }

      // Check if the directory exists
      if (!fs.existsSync(directory)) {
        return res.status(404).json({ error: 'Directory not found' });
      }

      // Find the flow directory - it might be in a subdirectory
      const flowDir = findFlowDirectory(directory, flowName);
      
      if (!flowDir) {
        return res.status(404).json({ error: 'Flow directory not found' });
      }

      // Look for images in the flow directory
      const images = findImagesInDirectory(flowDir);
      
      res.json({ images });
    } catch (error) {
      console.error('Error fetching flow images:', error);
      res.status(500).json({ error: 'Failed to fetch flow images: ' + error.message });
    }
  });

  app.get('/api/test/:testId', (req, res) => {
    try {
      const debugDir = req.query.dir;
      const testId = req.params.testId;
      
      if (!debugDir || !testId) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }

      const testPath = path.join(debugDir, testId);
      
      if (!fs.existsSync(testPath)) {
        return res.status(404).json({ error: 'Test directory not found' });
      }
      
      const files = fs.readdirSync(testPath);
      
      // Process and return test data
      res.json({
        testId,
        files
      });
    } catch (error) {
      console.error('Error processing test data:', error);
      res.status(500).json({ error: 'Failed to process test data: ' + error.message });
    }
  });

  return app;
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
            if (subFile.name.includes(flowName) || subDirPath.includes(flowName)) {
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
          url: `/api/files/content?path=${encodeURIComponent(imagePath)}`
        });
      }
    }
    
    // Then, look for subdirectories that might contain images (like "screenshots")
    for (const file of files) {
      if (file.isDirectory()) {
        const subDirPath = path.join(directory, file.name);
        
        // Check if this is a screenshots directory
        if (file.name.toLowerCase().includes('screenshot') || file.name.toLowerCase().includes('image')) {
          try {
            const subFiles = fs.readdirSync(subDirPath, { withFileTypes: true });
            for (const subFile of subFiles) {
              if (subFile.isFile() && /\.(png|jpg|jpeg|gif)$/i.test(subFile.name)) {
                const imagePath = path.join(subDirPath, subFile.name);
                images.push({
                  name: subFile.name,
                  path: imagePath,
                  url: `/api/files/content?path=${encodeURIComponent(imagePath)}`
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

module.exports = createServer;
  