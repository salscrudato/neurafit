#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const cachePaths = [
  '.vite',
  'node_modules/.vite',
  'node_modules/.cache',
  'node_modules/.tmp',
  'node_modules/.tsbuildinfo',
  'node_modules/.esbuild',
  'dist',
].map(p => path.join(projectRoot, p))

const clearCache = (cachePath) => {
  try {
    if (fs.existsSync(cachePath)) {
      fs.rmSync(cachePath, { recursive: true, force: true })
      console.log(`✅ Cleared: ${path.relative(projectRoot, cachePath)}`)
      return true
    }
  } catch (error) {
    console.warn(`⚠️  Failed to clear ${path.relative(projectRoot, cachePath)}: ${error.message}`)
  }
  return false
}

console.log('🧹 Clearing all caches...\n')
const clearedCount = cachePaths.filter(clearCache).length
console.log(`\n✅ Cache clearing complete! Cleared ${clearedCount} directories.`)
