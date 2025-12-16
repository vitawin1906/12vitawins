import * as path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const rootDir = process.cwd();

export default defineConfig({
  plugins: [react()],
  root: rootDir,
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src'),
      '@shared': path.resolve(rootDir, '../shared'),
      '@assets': path.resolve(rootDir, '../attached_assets'),
    },
  },
  build: {
    outDir: path.resolve(rootDir, '../dist/public'),
    emptyOutDir: true,
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
