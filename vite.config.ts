import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwind()],
  server: {
    // Simplified WebSocket configuration
    hmr: {
      port: 5174
    },
    // Handle port conflicts gracefully
    strictPort: false,
    // Enable CORS for development
    cors: true,
    port: 5173
  },
  build: {
    // Generate unique filenames for cache-busting
    rollupOptions: {
      output: {
        // Add hash to filenames for cache-busting
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Generate source maps for better debugging
    sourcemap: true,
    // Optimize chunk splitting for better caching
    chunkSizeWarningLimit: 1000
  },
  // Define app version for runtime checks
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
})