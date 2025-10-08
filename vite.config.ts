import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'
import { resolve } from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

/**
 * Production-Ready Vite Configuration for NeuraFit
 * React/TypeScript application with Firebase, Tailwind CSS, and Stripe
 *
 * Optimizations:
 * - Firebase SDK properly chunked by service (auth, firestore, functions, analytics)
 * - React/React-DOM in separate vendor chunk
 * - Lazy-loaded routes automatically code-split
 * - Terser minification with console removal in production
 * - Aggressive code splitting for optimal caching
 */
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'

  return {
    // Path resolution - matches tsconfig paths
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
      // Resolve extensions in order
      extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
      // Prefer ESM over CJS
      mainFields: ['module', 'jsnext:main', 'jsnext', 'main'],
      // Dedupe React to prevent multiple instances
      dedupe: ['react', 'react-dom', 'react-is', 'scheduler'],
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
          template: 'treemap', // 'sunburst', 'treemap', 'network'
        }),
    ].filter(Boolean),

    // Development server
    server: {
      port: 5173,
      host: 'localhost',
      // Enable CORS for development
      cors: true,
      // Disable COOP in development to allow Firebase Auth popups
      headers: {
        'Cross-Origin-Opener-Policy': 'unsafe-none',
        'Cross-Origin-Embedder-Policy': 'unsafe-none',
      },
    },

    // Build configuration
    build: {
      target: 'es2020',
      outDir: 'dist',
      // Enable sourcemaps for production debugging (hidden from browser by default)
      sourcemap: isProduction ? 'hidden' : true,

      // Minification with Terser
      minify: 'terser',
      terserOptions: {
        compress: {
          // Remove console statements in production
          drop_console: isProduction,
          drop_debugger: isProduction,
          // Remove unused code
          pure_funcs: isProduction ? ['console.log', 'console.info', 'console.debug', 'console.trace'] : [],
          // Additional optimizations
          passes: 2,
          unsafe_arrows: true,
          unsafe_methods: true,
        },
        mangle: {
          // Mangle property names for smaller bundle
          safari10: true,
        },
        format: {
          // Remove comments
          comments: false,
        },
      },

      // Chunk size warnings
      chunkSizeWarningLimit: 1000, // 1MB warning threshold

      // Rollup options for advanced chunking
      rollupOptions: {
        output: {
          // Optimized manual chunks for better caching
          manualChunks: (id: string) => {
            // Core React libraries - must be loaded first
            // Include all React-related packages to prevent duplication
            if (
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/') ||
              id.includes('node_modules/react-is/')
            ) {
              return 'vendor-react'
            }

            // React Router - changes with route updates
            if (id.includes('node_modules/react-router-dom/') || id.includes('node_modules/react-router/')) {
              return 'vendor-router'
            }

            // Firebase - split by service for better caching and smaller initial bundles
            if (id.includes('node_modules/firebase/auth') || id.includes('node_modules/@firebase/auth')) {
              return 'firebase-auth'
            }
            if (id.includes('node_modules/firebase/firestore') || id.includes('node_modules/@firebase/firestore')) {
              return 'firebase-firestore'
            }
            if (id.includes('node_modules/firebase/functions') || id.includes('node_modules/@firebase/functions')) {
              return 'firebase-functions'
            }
            if (id.includes('node_modules/firebase/analytics') || id.includes('node_modules/@firebase/analytics')) {
              return 'firebase-analytics'
            }
            // Remaining Firebase core
            if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
              return 'firebase-core'
            }

            // Stripe - payment processing
            if (id.includes('node_modules/@stripe/')) {
              return 'vendor-stripe'
            }

            // UI libraries - icons and styling utilities
            if (id.includes('node_modules/lucide-react/')) {
              return 'vendor-icons'
            }
            if (
              id.includes('node_modules/class-variance-authority/') ||
              id.includes('node_modules/clsx/') ||
              id.includes('node_modules/tailwind-merge/')
            ) {
              return 'vendor-ui-utils'
            }

            // State management - Zustand and Immer
            if (id.includes('node_modules/zustand/') || id.includes('node_modules/immer/')) {
              return 'vendor-state'
            }

            // React Query - data fetching
            if (id.includes('node_modules/@tanstack/react-query/')) {
              return 'vendor-query'
            }

            // Sentry - error monitoring
            if (id.includes('node_modules/@sentry/')) {
              return 'vendor-monitoring'
            }

            // Zod - validation
            if (id.includes('node_modules/zod/')) {
              return 'vendor-validation'
            }

            // IndexedDB - offline storage
            if (id.includes('node_modules/idb-keyval/')) {
              return 'vendor-storage'
            }

            // Other node_modules - group remaining dependencies
            if (id.includes('node_modules/')) {
              return 'vendor-misc'
            }

            // Application code - let Vite handle automatic splitting
            // This allows for route-based code splitting via lazy loading
            return undefined
          },

          // Naming patterns for chunks
          chunkFileNames: (chunkInfo) => {
            // Use content hash for long-term caching
            const name = chunkInfo.name || 'chunk'
            return `assets/${name}-[hash].js`
          },
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            // Organize assets by type
            const name = assetInfo.name || ''
            if (name.endsWith('.css')) {
              return 'assets/css/[name]-[hash][extname]'
            }
            if (/\.(png|jpe?g|svg|gif|webp|avif)$/.test(name)) {
              return 'assets/images/[name]-[hash][extname]'
            }
            if (/\.(woff2?|eot|ttf|otf)$/.test(name)) {
              return 'assets/fonts/[name]-[hash][extname]'
            }
            return 'assets/[name]-[hash][extname]'
          },
        },

        // Tree-shaking optimizations
        treeshake: {
          moduleSideEffects: 'no-external',
          propertyReadSideEffects: false,
          tryCatchDeoptimization: false,
        },
      },

      // CSS code splitting
      cssCodeSplit: true,

      // Report compressed size (disable in CI for faster builds)
      reportCompressedSize: !process.env.CI,

      // Increase chunk size limit for better optimization
      assetsInlineLimit: 4096, // 4KB - inline small assets as base64
    },

    // Optimize dependencies
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-router-dom',
        'zustand',
        'immer',
        // Include Sentry to fix module resolution issues
        '@sentry/react',
        'hoist-non-react-statics',
        // Include React-dependent packages
        '@stripe/react-stripe-js',
        '@tanstack/react-query',
      ],
      exclude: [],
      // Force CommonJS dependencies to be pre-bundled as ESM
      esbuildOptions: {
        // Resolve .cjs files as CommonJS
        mainFields: ['module', 'main'],
      },
    },

    // Global constants
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      global: 'globalThis',
    },

    // Enable esbuild for faster builds
    esbuild: {
      // Drop console in production via esbuild (backup to terser)
      drop: isProduction ? ['console', 'debugger'] : [],
      // Legal comments handling
      legalComments: 'none',
    },
  }
})