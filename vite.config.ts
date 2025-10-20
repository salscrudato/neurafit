import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'
import { resolve } from 'path'
import { visualizer } from 'rollup-plugin-visualizer'
import { readFileSync, copyFileSync, rmSync } from 'fs'

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'
  const packageJson = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8')) as { version: string }
  const appVersion = packageJson.version
  const buildTime = new Date().toISOString()
  const buildDate = buildTime.split('T')[0] || ''

  return {
    base: '/',

    resolve: {
      alias: { '@': resolve(__dirname, 'src') },
      extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
      mainFields: ['module', 'jsnext:main', 'jsnext', 'main'],
      dedupe: ['react', 'react-dom', 'react-is', 'scheduler'],
    },

    plugins: [
      react(),
      tailwind(),
      {
        name: 'clear-vite-cache',
        apply: 'build',
        enforce: 'pre' as const,
        async configResolved() {
          try {
            rmSync(resolve(__dirname, 'node_modules/.vite'), { recursive: true, force: true })
          } catch {
            // Silently fail if cache doesn't exist
          }
        },
      } as Plugin,
      process.env.ANALYZE === 'true' &&
        visualizer({
          open: true,
          filename: 'dist/stats.html',
          gzipSize: true,
          brotliSize: true,
          template: 'treemap',
        }),
      {
        name: 'html-transform',
        transformIndexHtml(html: string) {
          return html
            .replaceAll('__APP_VERSION__', appVersion)
            .replaceAll('__BUILD_TIME__', buildTime)
            .replaceAll('__BUILD_DATE__', buildDate)
        },
      } as Plugin,
      {
        name: 'copy-service-worker',
        writeBundle() {
          try {
            copyFileSync(
              resolve(__dirname, 'public/sw.js'),
              resolve(__dirname, 'dist/sw.js')
            )
          } catch {
            // Silently fail if sw.js doesn't exist
          }
        },
      } as Plugin,
    ].filter(Boolean),

    server: {
      port: 5173,
      host: 'localhost',
      cors: true,
      headers: {
        'Cross-Origin-Opener-Policy': 'unsafe-none',
        'Cross-Origin-Embedder-Policy': 'unsafe-none',
      },
    },

    build: {
      target: 'es2022',
      outDir: 'dist',
      sourcemap: isProduction ? 'hidden' : true,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: isProduction,
          drop_debugger: isProduction,
          pure_funcs: isProduction ? ['console.log', 'console.info', 'console.debug', 'console.trace'] : [],
          passes: 2,
          unsafe_arrows: true,
          unsafe_methods: true,
        },
        mangle: { safari10: true },
        format: { comments: false },
      },
      chunkSizeWarningLimit: 500,
      rollupOptions: {
        output: {
          manualChunks: (id: string) => {
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') ||
                id.includes('node_modules/scheduler/') || id.includes('node_modules/react-is/')) {
              return 'vendor-react'
            }
            if (id.includes('node_modules/react-router')) return 'vendor-router'
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
            if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
              return 'firebase-core'
            }
            if (id.includes('node_modules/lucide-react/')) return 'vendor-icons'
            if (id.includes('node_modules/class-variance-authority/') || id.includes('node_modules/clsx/') ||
                id.includes('node_modules/tailwind-merge/')) {
              return 'vendor-ui-utils'
            }
            if (id.includes('node_modules/zustand/') || id.includes('node_modules/immer/')) {
              return 'vendor-state'
            }
            if (id.includes('node_modules/@tanstack/react-query/')) return 'vendor-query'
            if (id.includes('node_modules/@sentry/')) return 'vendor-monitoring'
            if (id.includes('node_modules/zod/')) return 'vendor-validation'
            if (id.includes('node_modules/idb-keyval/')) return 'vendor-storage'
            if (id.includes('node_modules/')) return 'vendor-misc'
            return undefined
          },
          chunkFileNames: (chunkInfo) => `assets/${chunkInfo.name || 'chunk'}-[hash].js`,
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const name = assetInfo.name || ''
            if (name.endsWith('.css')) return 'assets/css/[name]-[hash][extname]'
            if (/\.(png|jpe?g|svg|gif|webp|avif)$/.test(name)) return 'assets/images/[name]-[hash][extname]'
            if (/\.(woff2?|eot|ttf|otf)$/.test(name)) return 'assets/fonts/[name]-[hash][extname]'
            return 'assets/[name]-[hash][extname]'
          },
        },
        treeshake: {
          moduleSideEffects: 'no-external',
          propertyReadSideEffects: false,
          tryCatchDeoptimization: false,
        },
      },
      cssCodeSplit: true,
      reportCompressedSize: !process.env.CI,
      assetsInlineLimit: 4096,
    },

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
        '@sentry/react',
        'hoist-non-react-statics',
      ],
      esbuildOptions: { mainFields: ['module', 'main'] },
      noDiscovery: true,
      force: true,
    },

    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
      __BUILD_TIME__: JSON.stringify(buildTime),
      global: 'globalThis',
    },

    esbuild: {
      drop: isProduction ? ['console', 'debugger'] : [],
      legalComments: 'none',
    },
  }
})