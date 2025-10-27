import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: __dirname,
  server: {
    port: 5174,
    open: true,
    proxy: {
      // Proxy API requests to FastAPI backend (make sure backend is running on port 8000)
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        // No custom proxy logging; use standard proxy settings only
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});