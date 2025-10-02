import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'
import { resolve } from 'path'

/**
 * Simplified Vite Configuration for NeuraFit
 * React/TypeScript application with Firebase, Tailwind CSS, and Stripe
 */
export default defineConfig({
  // Path resolution
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },

  // Plugins
  plugins: [
    react(),
    tailwind(),
  ],

  // Development server
  server: {
    port: 5173,
    host: 'localhost',
  },

  // Build configuration
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/functions'],
          ui: ['lucide-react', 'class-variance-authority', 'clsx', 'tailwind-merge'],
          state: ['zustand', 'immer'],
          stripe: ['@stripe/stripe-js', '@stripe/react-stripe-js'],
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

})