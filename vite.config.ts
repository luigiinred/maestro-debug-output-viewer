import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// Get the API server port from environment variable or use default
const apiPort = process.env.API_PORT || 3001;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "./", // This ensures that the built assets use relative paths
  server: {
    proxy: {
      "/api": {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
      },
    },
  },
  resolve: {
    alias: {
      path: "path-browserify",
    },
  },
});
