import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  // Base path for production build (served from /demo/lit-orderbook/)
  base: '/demo/lit-orderbook/',
  resolve: {
    alias: {
      '@reatom/lit': path.resolve(__dirname, '../src/index.ts'),
      '@reatom/core': path.resolve(__dirname, '../../core/src/index.ts'),
    },
  },
  build: {
    // Ensure proper chunk splitting
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  server: {
    fs: {
      // Allow serving files from package directories
      allow: [
        path.resolve(__dirname, '..'),
        path.resolve(__dirname, '../../core'),
      ],
    },
  },
})
