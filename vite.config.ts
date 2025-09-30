import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react({
      // Optimize JSX runtime
      jsxRuntime: 'automatic'
    }),
    tailwind()
  ],
  server: {
    port: 5173,
    // Handle port conflicts gracefully
    strictPort: false,
    // Enable CORS for development
    cors: true,
    // Fix WebSocket connection issues
    hmr: {
      port: 5173,
      clientPort: 5173
    },
    // Aggressive cache busting headers
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  },
  build: {
    // Target modern browsers for better optimization
    target: 'es2020',
    // Generate unique filenames for cache-busting
    rollupOptions: {
      output: {
        // Optimize chunk splitting
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'router-vendor': ['react-router-dom'],
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/functions'],
          'ui-vendor': ['lucide-react', 'class-variance-authority', 'clsx', 'tailwind-merge'],

          // Feature chunks
          'store': ['zustand', 'immer'],
          'utils': ['idb']
        },
        // Aggressive cache-busting with timestamp + hash
        entryFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        chunkFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        assetFileNames: `assets/[name]-[hash]-${Date.now()}.[ext]`
      },
      // External dependencies that should not be bundled
      external: (id) => {
        // Don't bundle development-only modules in production
        if (process.env.NODE_ENV === 'production' && id.includes('test')) {
          return true
        }
        return false
      }
    },
    // Generate source maps for better debugging (only in development)
    sourcemap: process.env.NODE_ENV === 'development',
    // Optimize chunk splitting for better caching
    chunkSizeWarningLimit: 500,
    // Enable minification
    minify: 'terser',
    // Optimize CSS
    cssCodeSplit: true,
    // Report compressed file sizes
    reportCompressedSize: true,
    // Optimize assets
    assetsInlineLimit: 4096 // 4kb
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'firebase/functions',
      'firebase/analytics',
      'zustand',
      'immer',
      'idb',
      'lucide-react'
    ],
    exclude: [
      // Exclude test utilities from optimization
      '@testing-library/react',
      '@testing-library/jest-dom'
    ]
  },
  // Define app version for runtime checks
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    // Remove debug code in production
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development')
  },
  // Enable esbuild optimizations
  esbuild: {
    // Remove debug code in production
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    // Optimize for modern browsers
    target: 'es2020'
  }
})