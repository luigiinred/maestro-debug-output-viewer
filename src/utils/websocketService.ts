// WebSocket service for real-time updates

// Event types for WebSocket messages
export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

// WebSocket connection status
export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

// WebSocket event callbacks
export interface WebSocketCallbacks {
  onOpen?: () => void;
  onMessage?: (message: WebSocketMessage) => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
}

class WebSocketService {
  private socket: WebSocket | null = null;
  private callbacks: WebSocketCallbacks = {};
  private status: ConnectionStatus = "disconnected";
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private url: string = "";

  // Initialize the WebSocket connection
  async connect(callbacks?: WebSocketCallbacks): Promise<void> {
    // Set callbacks if provided
    if (callbacks) {
      this.callbacks = callbacks;
    }

    // Update status
    this.setStatus("connecting");

    try {
      // Get the WebSocket port from the Electron bridge
      const port = await this.getWebSocketPort();
      this.url = `ws://localhost:${port}`;

      // Create a new WebSocket connection
      this.socket = new WebSocket(this.url);

      // Set up event handlers
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error("Failed to connect to WebSocket server:", error);
      this.setStatus("error");
      this.scheduleReconnect();
    }
  }

  // Get the WebSocket port from the Electron bridge
  private async getWebSocketPort(): Promise<number> {
    if (window.serverConfig) {
      try {
        // Check if getWsPort method exists
        if (typeof (window.serverConfig as any).getWsPort === "function") {
          const port = await (window.serverConfig as any).getWsPort();
          return port || 3001;
        }
        // Fall back to the server port if WebSocket port is not available
        if (typeof window.serverConfig.getServerPort === "function") {
          const port = await window.serverConfig.getServerPort();
          return port || 3001;
        }
      } catch (error) {
        console.error("Error getting WebSocket port:", error);
      }
    }
    return 3001;
  }

  // Handle WebSocket open event
  private handleOpen(): void {
    console.log("WebSocket connection established");
    this.setStatus("connected");
    this.reconnectAttempts = 0;

    if (this.callbacks.onOpen) {
      this.callbacks.onOpen();
    }
  }

  // Handle WebSocket message event
  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data) as WebSocketMessage;
      console.log("WebSocket message received:", message);

      if (this.callbacks.onMessage) {
        this.callbacks.onMessage(message);
      }
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  }

  // Handle WebSocket close event
  private handleClose(): void {
    console.log("WebSocket connection closed");
    this.setStatus("disconnected");
    this.socket = null;

    if (this.callbacks.onClose) {
      this.callbacks.onClose();
    }

    this.scheduleReconnect();
  }

  // Handle WebSocket error event
  private handleError(event: Event): void {
    console.error("WebSocket error:", event);
    this.setStatus("error");

    if (this.callbacks.onError) {
      this.callbacks.onError(event);
    }
  }

  // Set the connection status and trigger callback
  private setStatus(status: ConnectionStatus): void {
    this.status = status;

    if (this.callbacks.onStatusChange) {
      this.callbacks.onStatusChange(status);
    }
  }

  // Schedule a reconnection attempt
  private scheduleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(
        1000 * Math.pow(2, this.reconnectAttempts - 1),
        30000
      );

      console.log(
        `Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`
      );

      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
      }

      this.reconnectTimeout = setTimeout(() => {
        console.log(
          `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
        );
        this.connect();
      }, delay);
    } else {
      console.error(
        `Maximum reconnect attempts (${this.maxReconnectAttempts}) reached`
      );
    }
  }

  // Send a message to the WebSocket server
  send(message: WebSocketMessage): boolean {
    if (this.socket && this.status === "connected") {
      this.socket.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  // Watch a directory for changes
  async watchDirectory(directory: string): Promise<boolean> {
    console.log(`Attempting to watch directory: ${directory}`);

    // Try to use the Electron IPC method first
    if (window.serverConfig) {
      try {
        if (typeof (window.serverConfig as any).watchDirectory === "function") {
          console.log("Using IPC method to watch directory");
          const result = await (window.serverConfig as any).watchDirectory(
            directory
          );

          if (!result.success) {
            console.error("Error watching directory via IPC:", result.error);
            // If there's a specific error, show it
            if (result.error) {
              this.notifyError(`Failed to watch directory: ${result.error}`);
            }
            return false;
          }

          console.log(
            "Successfully set up directory watch via IPC:",
            result.message
          );
          return true;
        }
      } catch (error) {
        console.error("Error watching directory via IPC:", error);
      }
    }

    // Fall back to WebSocket method
    console.log("Falling back to WebSocket method to watch directory");
    return this.send({
      type: "watch",
      directory,
    });
  }

  // Notify about an error
  private notifyError(message: string): void {
    if (this.callbacks.onError) {
      this.callbacks.onError(new ErrorEvent("error", { message }));
    }
  }

  // Disconnect the WebSocket
  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.setStatus("disconnected");
  }

  // Get the current connection status
  getStatus(): ConnectionStatus {
    return this.status;
  }
}

// Create a singleton instance
const websocketService = new WebSocketService();

export default websocketService;
