import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'
import { resolve } from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

/**
 * Production-Ready Vite Configuration for NeuraFit
 * React/TypeScript application with Firebase, Tailwind CSS, and Stripe
 * Includes sourcemaps, bundle analysis, and optimized chunking
 */
export default defineConfig(({ mode }) => ({
  // Path resolution - matches tsconfig paths
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },

  // Plugins
  plugins: [
    react(),
    tailwind(),
    // Bundle analyzer (only when ANALYZE=true)
    process.env.ANALYZE === 'true' &&
      visualizer({
        open: true,
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
      }),
  ].filter(Boolean),

  // Development server
  server: {
    port: 5173,
    host: 'localhost',
  },

  // Build configuration
  build: {
    target: 'es2020',
    outDir: 'dist',
    // Enable sourcemaps for production debugging (hidden from browser by default)
    sourcemap: 'hidden',
    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/functions'],
          ui: ['lucide-react', 'class-variance-authority', 'clsx', 'tailwind-merge'],
          state: ['zustand', 'immer'],
          stripe: ['@stripe/stripe-js', '@stripe/react-stripe-js'],
          query: ['@tanstack/react-query'],
          monitoring: ['@sentry/react'],
        },
      },
    },
  },

  // Global constants
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    global: 'globalThis',
  },
}))