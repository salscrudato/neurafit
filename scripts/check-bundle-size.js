#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, extname } from 'path'
import { gzipSync } from 'zlib'

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
}

const THRESHOLDS = {
  initial: { warning: 250, error: 350 },
  chunk: { warning: 200, error: 300 },
  total: { warning: 1500, error: 2000 },
}

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

const getSizeColor = (sizeKB, threshold) => {
  if (sizeKB >= threshold.error) return colors.red
  if (sizeKB >= threshold.warning) return colors.yellow
  return colors.green
}

const getAllFiles = (dir, fileList = []) => {
  readdirSync(dir).forEach((file) => {
    const filePath = join(dir, file)
    const stat = statSync(filePath)
    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList)
    } else {
      fileList.push(filePath)
    }
  })
  return fileList
}

const analyzeFile = (filePath) => ({
  path: filePath,
  size: readFileSync(filePath).length,
  gzipSize: gzipSync(readFileSync(filePath)).length,
  ext: extname(filePath),
})

const categorizeChunk = (filename) => {
  if (filename.includes('index-')) return 'entry'
  if (filename.includes('vendor-react')) return 'vendor-react'
  if (filename.includes('vendor-router')) return 'vendor-router'
  if (filename.includes('firebase-')) return 'firebase'
  if (filename.includes('vendor-')) return 'vendor'
  if (filename.includes('page-')) return 'page'
  if (filename.includes('workout-')) return 'workout'
  return 'other'
}

const analyzeBuild = () => {
  const assetsDir = join(process.cwd(), 'dist', 'assets')
  console.log(`${colors.bright}${colors.cyan}📦 Bundle Size Analysis${colors.reset}\n`)

  try {
    const allFiles = getAllFiles(assetsDir)
    const jsFiles = allFiles.filter((f) => f.endsWith('.js'))
    const cssFiles = allFiles.filter((f) => f.endsWith('.css'))

    const jsAnalysis = jsFiles.map(analyzeFile)
    const cssAnalysis = cssFiles.map(analyzeFile)

    const totalJS = jsAnalysis.reduce((sum, f) => sum + f.size, 0)
    const totalJSGzip = jsAnalysis.reduce((sum, f) => sum + f.gzipSize, 0)
    const totalCSS = cssAnalysis.reduce((sum, f) => sum + f.size, 0)
    const totalCSSGzip = cssAnalysis.reduce((sum, f) => sum + f.gzipSize, 0)

    const categories = {
      entry: [], 'vendor-react': [], 'vendor-router': [], firebase: [],
      vendor: [], page: [], workout: [], other: [],
    }

    jsAnalysis.forEach((file) => {
      const filename = file.path.split('/').pop()
      categories[categorizeChunk(filename)].push(file)
    })

    console.log(`${colors.bright}JavaScript Bundles:${colors.reset}`)
    console.log('─'.repeat(80))

    Object.entries(categories).forEach(([cat, files]) => {
      if (files.length > 0) {
        console.log(`\n${colors.bright}${cat}:${colors.reset}`)
        files.forEach((file) => {
          const filename = file.path.split('/').pop()
          const sizeKB = file.gzipSize / 1024
          const color = getSizeColor(sizeKB, THRESHOLDS[cat === 'entry' ? 'initial' : 'chunk'])
          console.log(`  ${color}${filename}${colors.reset} | Raw: ${formatSize(file.size)} | Gzip: ${formatSize(file.gzipSize)}`)
        })
      }
    })

    if (cssAnalysis.length > 0) {
      console.log(`\n${colors.bright}CSS Files:${colors.reset}`)
      cssAnalysis.forEach((file) => {
        const filename = file.path.split('/').pop()
        console.log(`  ${colors.green}${filename}${colors.reset} | Raw: ${formatSize(file.size)} | Gzip: ${formatSize(file.gzipSize)}`)
      })
    }

    console.log('\n' + '─'.repeat(80))
    console.log(`${colors.bright}Summary:${colors.reset}`)
    console.log(`  JavaScript: ${formatSize(totalJS)} (${formatSize(totalJSGzip)} gzipped)`)
    console.log(`  CSS: ${formatSize(totalCSS)} (${formatSize(totalCSSGzip)} gzipped)`)
    console.log(`  Total: ${formatSize(totalJS + totalCSS)} (${formatSize(totalJSGzip + totalCSSGzip)} gzipped)`)

    const totalGzipKB = (totalJSGzip + totalCSSGzip) / 1024
    console.log('\n' + '─'.repeat(80))

    if (totalGzipKB >= THRESHOLDS.total.error) {
      console.log(`${colors.red}❌ ERROR: Total bundle exceeds ${THRESHOLDS.total.error}KB!${colors.reset}`)
      process.exit(1)
    } else if (totalGzipKB >= THRESHOLDS.total.warning) {
      console.log(`${colors.yellow}⚠️  WARNING: Total bundle exceeds ${THRESHOLDS.total.warning}KB${colors.reset}`)
    } else {
      console.log(`${colors.green}✅ Bundle size is within acceptable limits${colors.reset}`)
    }

    const largeChunks = jsAnalysis.filter((f) => f.gzipSize / 1024 > THRESHOLDS.chunk.warning)
    if (largeChunks.length > 0) {
      console.log(`\n${colors.yellow}• ${largeChunks.length} chunk(s) exceed ${THRESHOLDS.chunk.warning}KB${colors.reset}`)
    }

    console.log(`\n${colors.cyan}💡 Run 'npm run build:analyze' for visualization${colors.reset}\n`)
  } catch (error) {
    console.error(`${colors.red}Error analyzing build:${colors.reset}`, error.message)
    process.exit(1)
  }
}

analyzeBuild()
