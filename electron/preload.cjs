const { contextBridge, ipcRenderer } = require("electron");

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electron", {
  // Add any IPC methods you need to expose here
  // For example:
  // send: (channel, data) => {
  //   // whitelist channels
  //   let validChannels = ['toMain'];
  //   if (validChannels.includes(channel)) {
  //     ipcRenderer.send(channel, data);
  //   }
  // },
  // receive: (channel, func) => {
  //   let validChannels = ['fromMain'];
  //   if (validChannels.includes(channel)) {
  //     // Deliberately strip event as it includes `sender`
  //     ipcRenderer.on(channel, (event, ...args) => func(...args));
  //   }
  // }
});

// You can also expose Node.js environment information if needed
contextBridge.exposeInMainWorld("process", {
  platform: process.platform,
  env: {
    NODE_ENV: process.env.NODE_ENV,
  },
});

// Expose the server port to the renderer process
contextBridge.exposeInMainWorld("serverConfig", {
  // Get the port from the main process via IPC
  getServerPort: () => ipcRenderer.invoke("get-server-port"),
  // Get the WebSocket port from the main process via IPC
  getWsPort: () => ipcRenderer.invoke("get-ws-port"),
  // Watch a directory for changes
  watchDirectory: (directory) =>
    ipcRenderer.invoke("watch-directory", directory),
});
