import { generateSW } from 'workbox-build'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync, writeFileSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const version = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8')).version

async function buildServiceWorker() {
  try {
    console.log('🔨 Building service worker...')

    const { count, size, warnings } = await generateSW({
      swDest: join(rootDir, 'dist/sw.js'),
      globDirectory: join(rootDir, 'dist'),
      globPatterns: ['**/*.js', '**/*.css', '**/*.{png,jpg,jpeg,gif,svg,ico,webp}', 'manifest.json'],
      globIgnores: ['**/sw.js', '**/workbox-*.js', '**/*.map', '**/*.local', '**/screenshots/**', '**/og-images/**'],
      maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
      runtimeCaching: [
        {
          urlPattern: ({ request, url }) => {
            if (request.mode === 'navigate' && url.pathname.endsWith('.html')) return true
            if (url.pathname.endsWith('.html') && request.destination !== 'script') return true
            return false
          },
          handler: 'NetworkFirst',
          options: {
            cacheName: 'html-pages',
            networkTimeoutSeconds: 5,
            expiration: { maxEntries: 10, maxAgeSeconds: 86400 },
          },
        },
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'google-fonts-stylesheets',
            expiration: { maxEntries: 20, maxAgeSeconds: 31536000 },
          },
        },
        {
          urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts-webfonts',
            expiration: { maxEntries: 30, maxAgeSeconds: 31536000 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        {
          urlPattern: /^https:\/\/.*\.googleapis\.com\/.*/,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'google-apis',
            expiration: { maxEntries: 50, maxAgeSeconds: 86400 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        {
          urlPattern: /^https:\/\/.*\.firebaseio\.com\/.*/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'firebase-api',
            networkTimeoutSeconds: 10,
            expiration: { maxEntries: 50, maxAgeSeconds: 300 },
          },
        },
        {
          urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'images',
            expiration: { maxEntries: 100, maxAgeSeconds: 2592000 },
          },
        },
      ],
      cacheId: `neurafit-v${version}-${Date.now()}`,
      skipWaiting: true,
      clientsClaim: true,
      navigationPreload: false,
      additionalManifestEntries: [],
      inlineWorkboxRuntime: true,
    })

    const swPath = join(rootDir, 'dist/sw.js')
    let swContent = readFileSync(swPath, 'utf-8')

    const mimeTypeErrorPrevention = `self.addEventListener('fetch',(event)=>{const{request}=event;if(request.method!=='GET')return;const isModuleRequest=request.destination==='script'||request.destination==='worker'||request.destination==='sharedworker';if(isModuleRequest){const originalRespond=event.respondWith.bind(event);event.respondWith=async function(responsePromise){try{const response=await Promise.resolve(responsePromise);if(response&&response.headers){const contentType=response.headers.get('content-type')||'';if(contentType.includes('text/html')){try{const freshResponse=await fetch(request.clone());const freshContentType=freshResponse.headers.get('content-type')||'';if(!freshContentType.includes('text/html')){return freshResponse;}}catch(e){}return new Response('Module loading error: Invalid MIME type',{status:400,statusText:'Bad Request',headers:{'Content-Type':'text/plain'}})}}return response;}catch(error){throw error}}}})`

    if (swContent.includes('//# sourceMappingURL')) {
      swContent = swContent.replace('//# sourceMappingURL', mimeTypeErrorPrevention + '\n//# sourceMappingURL')
    } else {
      swContent += '\n' + mimeTypeErrorPrevention
    }

    writeFileSync(swPath, swContent, 'utf-8')
    console.log(`✅ Service worker built: ${count} files precached, ${(size / 1024 / 1024).toFixed(2)}MB`)
    if (warnings.length > 0) {
      console.warn('⚠️  Warnings:', warnings)
    }
  } catch (error) {
    console.error('❌ Failed to build service worker:', error.message)
    process.exit(1)
  }
}

buildServiceWorker();

