#!/usr/bin/env node

/**
 * Simple version update script for NeuraFit
 * Updates version and build time in index.html
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const indexPath = path.join(__dirname, '..', 'index.html')

try {
  if (fs.existsSync(indexPath)) {
    let content = fs.readFileSync(indexPath, 'utf8')

    // Update build time
    const buildTime = new Date().toISOString()
    content = content.replace(
      /data-build-time="[^"]*"/,
      `data-build-time="${buildTime}"`
    )

    // Update version
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'))
    const version = packageJson.version
    content = content.replace(
      /data-version="[^"]*"/,
      `data-version="${version}"`
    )

    fs.writeFileSync(indexPath, content)
    console.log(`Updated version to ${version} and build time to ${buildTime}`)
  }
} catch (error) {
  console.log('Version update skipped:', error.message)
}
