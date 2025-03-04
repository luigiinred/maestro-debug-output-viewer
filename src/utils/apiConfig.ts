// API configuration utility to handle dynamic port assignment

// Default port for development
const DEFAULT_PORT = 3001;

// Get the server port from the Electron bridge or use the default
const getServerPort = async (): Promise<number> => {
  if (
    window.serverConfig &&
    typeof window.serverConfig.getServerPort === "function"
  ) {
    try {
      const port = await window.serverConfig.getServerPort();
      return port || DEFAULT_PORT;
    } catch (error) {
      console.error("Error getting server port:", error);
      return DEFAULT_PORT;
    }
  }
  return DEFAULT_PORT;
};

// Get the base API URL with the current port
export const getApiBaseUrl = async (): Promise<string> => {
  const port = await getServerPort();
  return `http://localhost:${port}`;
};

// Helper function to create API URLs
export const createApiUrl = async (
  endpoint: string,
  queryParams?: Record<string, string>
): Promise<string> => {
  const baseUrl = await getApiBaseUrl();
  const url = new URL(`${baseUrl}${endpoint}`);

  if (queryParams) {
    Object.entries(queryParams).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  return url.toString();
};

// Specific API endpoints
export const createFileContentUrl = async (
  filePath: string
): Promise<string> => {
  return createApiUrl("/api/files/content", { path: filePath });
};

export const createDirectoryListUrl = async (
  dirPath?: string
): Promise<string> => {
  if (dirPath) {
    return createApiUrl("/api/files", { dir: dirPath });
  }
  return createApiUrl("/api/files");
};

export const createFlowImagesUrl = async (
  directory: string,
  flowName: string
): Promise<string> => {
  return createApiUrl("/api/flow-images", { directory, flowName });
};

// Add TypeScript interface for the window object
declare global {
  interface Window {
    serverConfig?: {
      getServerPort: () => Promise<number>;
    };
    process?: {
      platform: string;
      env: {
        NODE_ENV: string;
      };
    };
  }
}
