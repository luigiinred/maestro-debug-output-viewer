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

/**
 * Fetch with retry mechanism for handling transient errors
 * @param url URL to fetch
 * @param options Fetch options
 * @param retries Number of retries (default: 3)
 * @param delay Delay between retries in ms (default: 500)
 * @returns Promise with the fetch response
 */
export const fetchWithRetry = async (
  url: string,
  options?: RequestInit,
  retries = 3,
  delay = 500
): Promise<Response> => {
  try {
    const response = await fetch(url, options);

    // If the request was successful, return the response
    if (response.ok) {
      return response;
    }

    // If we have no more retries, throw an error
    if (retries <= 0) {
      throw new Error(
        `Failed to fetch ${url}: ${response.status} ${response.statusText}`
      );
    }

    // If the error is a server error (5xx), retry
    if (response.status >= 500) {
      console.warn(
        `Server error (${response.status}) when fetching ${url}, retrying... (${retries} retries left)`
      );

      // Wait for the specified delay
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Retry with one less retry
      return fetchWithRetry(url, options, retries - 1, delay * 1.5);
    }

    // For other errors, don't retry
    throw new Error(
      `Failed to fetch ${url}: ${response.status} ${response.statusText}`
    );
  } catch (error) {
    // If we have no more retries, rethrow the error
    if (retries <= 0) {
      throw error;
    }

    console.warn(
      `Error when fetching ${url}, retrying... (${retries} retries left):`,
      error
    );

    // Wait for the specified delay
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Retry with one less retry
    return fetchWithRetry(url, options, retries - 1, delay * 1.5);
  }
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

export const createDeleteTestRunUrl = async (
  testRunPath: string
): Promise<string> => {
  return createApiUrl("/api/test-run", { path: testRunPath });
};

export const createRunMaestroTestUrl = async (): Promise<string> => {
  return createApiUrl("/api/run-maestro-test");
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
