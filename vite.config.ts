import { defineConfig, loadEnv } from 'vite'
import type { UserConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'
import { resolve } from 'path'

/**
 * Vite Configuration for NeuraFit
 *
 * A React/TypeScript application with Firebase backend, Tailwind CSS,
 * and Stripe integration. Optimized for modern browsers with PWA support.
 */
export default defineConfig(({ command, mode }): UserConfig => {
  // Load environment variables based on the current mode
  const env = loadEnv(mode, process.cwd(), '')
  const isDev = mode === 'development'
  const isProd = mode === 'production'
  const isPreview = command === 'serve'

  return {
    // Path resolution for cleaner imports
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
        '@/components': resolve(__dirname, './src/components'),
        '@/lib': resolve(__dirname, './src/lib'),
        '@/utils': resolve(__dirname, './src/utils'),
        '@/types': resolve(__dirname, './src/types'),
        '@/hooks': resolve(__dirname, './src/hooks'),
        '@/store': resolve(__dirname, './src/store'),
        '@/pages': resolve(__dirname, './src/pages'),
        '@/assets': resolve(__dirname, './src/assets'),
        '@/config': resolve(__dirname, './src/config'),
      },
      // Handle problematic package entry points
      dedupe: ['react', 'react-dom'],
      conditions: ['import', 'module', 'browser', 'default'],
    },

    // Plugin configuration
    plugins: [
      react({
        // Use automatic JSX runtime for better performance
        jsxRuntime: 'automatic',
        // Optimize JSX in production
        ...(isDev ? {} : { jsxImportSource: 'react' }),
      }),
      tailwind(),
    ],

    // Development server configuration
    server: {
      port: parseInt(env.VITE_PORT || '5173'),
      host: env.VITE_HOST || 'localhost',
      // Handle port conflicts gracefully
      strictPort: false,
      // Enable CORS for development
      cors: true,
      // Optimize HMR for better development experience
      hmr: {
        port: parseInt(env.VITE_HMR_PORT || '5173'),
        overlay: true,
      },
      // Development-only headers for cache busting
      ...(isDev ? {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      } : {}),
    },

    // Preview server configuration
    preview: {
      port: parseInt(env.VITE_PREVIEW_PORT || '4173'),
      host: env.VITE_HOST || 'localhost',
      strictPort: false,
      cors: true,
    },

    // Build configuration
    build: {
      // Target modern browsers for optimal performance
      target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],

      // Output directory
      outDir: 'dist',

      // Generate source maps only in development
      sourcemap: isDev || isPreview,

      // Minification strategy
      minify: isProd ? 'terser' : false,

      // Terser options for production builds
      ...(isProd ? {
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info', 'console.debug'],
          },
          mangle: {
            safari10: true,
          },
          format: {
            safari10: true,
          },
        }
      } : {}),

      // CSS optimization
      cssCodeSplit: true,
      cssMinify: isProd,

      // Asset handling
      assetsInlineLimit: 4096, // 4KB threshold for inlining assets

      // Chunk size warning threshold
      chunkSizeWarningLimit: 1000, // 1MB warning threshold

      // Report compressed file sizes
      reportCompressedSize: isProd,

      // Rollup-specific options
      rollupOptions: {
        // Input configuration
        input: {
          main: resolve(__dirname, 'index.html'),
        },

        // Output configuration
        output: {
          // Deterministic file naming for better caching
          entryFileNames: isProd
            ? 'assets/[name]-[hash].js'
            : 'assets/[name].js',
          chunkFileNames: isProd
            ? 'assets/[name]-[hash].js'
            : 'assets/[name].js',
          assetFileNames: isProd
            ? 'assets/[name]-[hash].[ext]'
            : 'assets/[name].[ext]',

          // Optimized chunk splitting strategy
          manualChunks: (id) => {
            // Core React libraries
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-core'
            }

            // Routing
            if (id.includes('react-router-dom')) {
              return 'react-router'
            }

            // Firebase services
            if (id.includes('firebase/app')) {
              return 'firebase-core'
            }
            if (id.includes('firebase/auth')) {
              return 'firebase-auth'
            }
            if (id.includes('firebase/firestore')) {
              return 'firebase-firestore'
            }
            if (id.includes('firebase/functions')) {
              return 'firebase-functions'
            }
            if (id.includes('firebase/analytics')) {
              return 'firebase-analytics'
            }

            // State management
            if (id.includes('zustand') || id.includes('immer')) {
              return 'state-management'
            }

            // UI utilities
            if (id.includes('class-variance-authority') || id.includes('clsx') || id.includes('tailwind-merge')) {
              return 'ui-utils'
            }

            // Icons and UI components
            if (id.includes('lucide-react')) {
              return 'ui-icons'
            }

            // Payment processing
            if (id.includes('@stripe/')) {
              return 'stripe'
            }

            // Utilities
            if (id.includes('idb')) {
              return 'utils'
            }

            // Default vendor chunk for other node_modules
            if (id.includes('node_modules')) {
              return 'vendor'
            }
          },
        },

        // External dependencies (not bundled)
        external: (id: string) => {
          // Exclude test utilities in production
          if (isProd && (
            id.includes('@testing-library') ||
            id.includes('vitest') ||
            id.includes('jest')
          )) {
            return true
          }



          return false
        },
      },
    },

    // Dependency optimization
    optimizeDeps: {
      // Force include these dependencies for faster cold starts
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
        'lucide-react',
        'class-variance-authority',
        'clsx',
        'tailwind-merge',
        '@stripe/stripe-js',
        '@stripe/react-stripe-js',
      ],

      // Exclude from pre-bundling
      exclude: [
        // Test utilities
        '@testing-library/react',
        '@testing-library/jest-dom',
        'vitest',
        // Large libraries that should be code-split
        '@stripe/stripe-js',
      ],

      // ESBuild options for dependency optimization
      esbuildOptions: {
        target: 'es2020',
        supported: {
          'top-level-await': true,
        },
      },
    },

    // Global constants definition
    define: {
      // App metadata
      __APP_VERSION__: JSON.stringify(env.npm_package_version || '1.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __BUILD_MODE__: JSON.stringify(mode),

      // Environment flags
      __DEV__: JSON.stringify(isDev),
      __PROD__: JSON.stringify(isProd),
      __PREVIEW__: JSON.stringify(isPreview),

      // Feature flags (can be controlled via environment variables)
      __ENABLE_ANALYTICS__: JSON.stringify(env.VITE_ENABLE_ANALYTICS !== 'false'),
      __ENABLE_PWA__: JSON.stringify(env.VITE_ENABLE_PWA !== 'false'),

      // Polyfill Node.js globals for browser compatibility
      global: 'globalThis',
    },

    // ESBuild configuration
    esbuild: {
      // Target modern browsers
      target: 'es2020',

      // Remove debug code in production
      drop: isProd ? ['console', 'debugger'] : [],

      // Optimize for production
      minifyIdentifiers: isProd,
      minifySyntax: isProd,
      minifyWhitespace: isProd,

      // Legal comments handling
      legalComments: isProd ? 'none' : 'inline',
    },

    // CSS configuration
    css: {
      // PostCSS configuration is handled by Tailwind plugin
      devSourcemap: isDev,

      // CSS modules configuration (if needed)
      modules: {
        localsConvention: 'camelCaseOnly',
        generateScopedName: isDev
          ? '[name]__[local]___[hash:base64:5]'
          : '[hash:base64:8]',
      },
    },

    // Worker configuration
    worker: {
      format: 'es',
      plugins: () => [
        // Apply same plugins to workers
        react(),
      ],
    },

    // Environment variables prefix
    envPrefix: ['VITE_', 'REACT_APP_'],

    // Clear screen on rebuild
    clearScreen: false,

    // Log level
    logLevel: isDev ? 'info' : 'warn',
  }
})