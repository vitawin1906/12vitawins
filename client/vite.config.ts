import * as path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const rootDir = process.cwd();
// В Docker используем имя сервиса, локально — localhost
const apiTarget = process.env.VITE_API_PROXY_TARGET || 'http://localhost:8000';

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
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
