// vite.config.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    proxy: {
  '/api': 'http://localhost:8000',
  '/media': 'http://localhost:8000',
  '/ai': 'http://localhost:8000',
    },
  },
  build: {
    rollupOptions: {
      external: ['axios'], // Ensure axios is excluded from the bundle
    },
  },
  optimizeDeps: {
    include: ['axios'],
  },
});