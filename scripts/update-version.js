#!/usr/bin/env node

// Script to update version metadata in index.html during build
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

// Read package.json to get version
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'))
const version = packageJson.version
const buildTime = new Date().toISOString()

console.log(`Updating version metadata: v${version} (${buildTime})`)

// Update index.html
const indexPath = join(projectRoot, 'index.html')
let indexContent = readFileSync(indexPath, 'utf8')

// Update version and build time in the root div
indexContent = indexContent.replace(
  /data-version="[^"]*"/,
  `data-version="${version}"`
)

indexContent = indexContent.replace(
  /data-build-time="[^"]*"/,
  `data-build-time="${buildTime}"`
)

writeFileSync(indexPath, indexContent)

console.log('✅ Version metadata updated successfully!')

// Also update the built index.html if it exists
const distIndexPath = join(projectRoot, 'dist', 'index.html')
try {
  let distIndexContent = readFileSync(distIndexPath, 'utf8')
  
  distIndexContent = distIndexContent.replace(
    /data-version="[^"]*"/,
    `data-version="${version}"`
  )
  
  distIndexContent = distIndexContent.replace(
    /data-build-time="[^"]*"/,
    `data-build-time="${buildTime}"`
  )
  
  writeFileSync(distIndexPath, distIndexContent)
  console.log('✅ Dist version metadata updated successfully!')
} catch (error) {
  // Dist doesn't exist yet, that's fine
  console.log('ℹ️  Dist index.html not found (will be updated during build)')
}
