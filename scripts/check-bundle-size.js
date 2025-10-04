#!/usr/bin/env node

/**
 * Bundle Size Checker
 * 
 * Analyzes the production build and reports bundle sizes.
 * Warns if bundles exceed recommended thresholds.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { gzipSync } from 'zlib';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Size thresholds (in KB)
const THRESHOLDS = {
  initial: {
    warning: 250,  // 250KB gzipped
    error: 350,    // 350KB gzipped
  },
  chunk: {
    warning: 200,  // 200KB gzipped
    error: 300,    // 300KB gzipped
  },
  total: {
    warning: 1500, // 1.5MB gzipped
    error: 2000,   // 2MB gzipped
  },
};

/**
 * Format bytes to human-readable size
 */
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/**
 * Get color based on size and threshold
 */
function getSizeColor(sizeKB, threshold) {
  if (sizeKB >= threshold.error) return colors.red;
  if (sizeKB >= threshold.warning) return colors.yellow;
  return colors.green;
}

/**
 * Get all files recursively
 */
function getAllFiles(dir, fileList = []) {
  const files = readdirSync(dir);

  files.forEach((file) => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Analyze a file
 */
function analyzeFile(filePath) {
  const content = readFileSync(filePath);
  const gzipped = gzipSync(content);

  return {
    path: filePath,
    size: content.length,
    gzipSize: gzipped.length,
    ext: extname(filePath),
  };
}

/**
 * Categorize chunks
 */
function categorizeChunk(filename) {
  // Entry point
  if (filename.includes('index-')) return 'entry';
  
  // Vendor chunks
  if (filename.includes('vendor-react')) return 'vendor-react';
  if (filename.includes('vendor-router')) return 'vendor-router';
  if (filename.includes('firebase-')) return 'firebase';
  if (filename.includes('vendor-')) return 'vendor';
  
  // Page chunks
  if (filename.includes('page-')) return 'page';
  if (filename.includes('workout-')) return 'workout';
  
  // Other
  return 'other';
}

/**
 * Main analysis function
 */
function analyzeBuild() {
  const distDir = join(process.cwd(), 'dist');
  const assetsDir = join(distDir, 'assets');

  console.log(`${colors.bright}${colors.cyan}📦 Bundle Size Analysis${colors.reset}\n`);

  try {
    // Get all files
    const allFiles = getAllFiles(assetsDir);
    
    // Filter JavaScript files
    const jsFiles = allFiles.filter((f) => f.endsWith('.js'));
    const cssFiles = allFiles.filter((f) => f.endsWith('.css'));

    // Analyze files
    const jsAnalysis = jsFiles.map(analyzeFile);
    const cssAnalysis = cssFiles.map(analyzeFile);

    // Calculate totals
    const totalJS = jsAnalysis.reduce((sum, f) => sum + f.size, 0);
    const totalJSGzip = jsAnalysis.reduce((sum, f) => sum + f.gzipSize, 0);
    const totalCSS = cssAnalysis.reduce((sum, f) => sum + f.size, 0);
    const totalCSSGzip = cssAnalysis.reduce((sum, f) => sum + f.gzipSize, 0);

    // Categorize chunks
    const categories = {
      entry: [],
      'vendor-react': [],
      'vendor-router': [],
      firebase: [],
      vendor: [],
      page: [],
      workout: [],
      other: [],
    };

    jsAnalysis.forEach((file) => {
      const filename = file.path.split('/').pop();
      const category = categorizeChunk(filename);
      categories[category].push(file);
    });

    // Print results
    console.log(`${colors.bright}JavaScript Bundles:${colors.reset}`);
    console.log('─'.repeat(80));

    // Entry point
    if (categories.entry.length > 0) {
      console.log(`\n${colors.bright}Entry Point:${colors.reset}`);
      categories.entry.forEach((file) => {
        const filename = file.path.split('/').pop();
        const sizeKB = file.gzipSize / 1024;
        const color = getSizeColor(sizeKB, THRESHOLDS.initial);
        console.log(
          `  ${color}${filename}${colors.reset}`,
          `\n    Raw: ${formatSize(file.size)} | Gzip: ${formatSize(file.gzipSize)}`
        );
      });
    }

    // Vendor chunks
    const vendorCategories = ['vendor-react', 'vendor-router', 'firebase', 'vendor'];
    vendorCategories.forEach((cat) => {
      if (categories[cat].length > 0) {
        console.log(`\n${colors.bright}${cat.charAt(0).toUpperCase() + cat.slice(1)}:${colors.reset}`);
        categories[cat].forEach((file) => {
          const filename = file.path.split('/').pop();
          const sizeKB = file.gzipSize / 1024;
          const color = getSizeColor(sizeKB, THRESHOLDS.chunk);
          console.log(
            `  ${color}${filename}${colors.reset}`,
            `\n    Raw: ${formatSize(file.size)} | Gzip: ${formatSize(file.gzipSize)}`
          );
        });
      }
    });

    // Page chunks
    const pageCategories = ['page', 'workout', 'other'];
    pageCategories.forEach((cat) => {
      if (categories[cat].length > 0) {
        console.log(`\n${colors.bright}${cat.charAt(0).toUpperCase() + cat.slice(1)} Chunks:${colors.reset}`);
        categories[cat].forEach((file) => {
          const filename = file.path.split('/').pop();
          const sizeKB = file.gzipSize / 1024;
          const color = getSizeColor(sizeKB, THRESHOLDS.chunk);
          console.log(
            `  ${color}${filename}${colors.reset}`,
            `\n    Raw: ${formatSize(file.size)} | Gzip: ${formatSize(file.gzipSize)}`
          );
        });
      }
    });

    // CSS
    if (cssAnalysis.length > 0) {
      console.log(`\n${colors.bright}CSS Files:${colors.reset}`);
      cssAnalysis.forEach((file) => {
        const filename = file.path.split('/').pop();
        console.log(
          `  ${colors.green}${filename}${colors.reset}`,
          `\n    Raw: ${formatSize(file.size)} | Gzip: ${formatSize(file.gzipSize)}`
        );
      });
    }

    // Summary
    console.log('\n' + '─'.repeat(80));
    console.log(`${colors.bright}Summary:${colors.reset}`);
    console.log(`  JavaScript: ${formatSize(totalJS)} (${formatSize(totalJSGzip)} gzipped)`);
    console.log(`  CSS: ${formatSize(totalCSS)} (${formatSize(totalCSSGzip)} gzipped)`);
    console.log(`  Total: ${formatSize(totalJS + totalCSS)} (${formatSize(totalJSGzip + totalCSSGzip)} gzipped)`);

    // Warnings
    const totalGzipKB = (totalJSGzip + totalCSSGzip) / 1024;
    console.log('\n' + '─'.repeat(80));
    
    if (totalGzipKB >= THRESHOLDS.total.error) {
      console.log(`${colors.red}❌ ERROR: Total bundle size exceeds ${THRESHOLDS.total.error}KB!${colors.reset}`);
      process.exit(1);
    } else if (totalGzipKB >= THRESHOLDS.total.warning) {
      console.log(`${colors.yellow}⚠️  WARNING: Total bundle size exceeds ${THRESHOLDS.total.warning}KB${colors.reset}`);
    } else {
      console.log(`${colors.green}✅ Bundle size is within acceptable limits${colors.reset}`);
    }

    // Recommendations
    console.log(`\n${colors.bright}Recommendations:${colors.reset}`);
    
    const largeChunks = jsAnalysis.filter((f) => f.gzipSize / 1024 > THRESHOLDS.chunk.warning);
    if (largeChunks.length > 0) {
      console.log(`  ${colors.yellow}• ${largeChunks.length} chunk(s) exceed ${THRESHOLDS.chunk.warning}KB${colors.reset}`);
      console.log(`    Consider splitting these chunks further`);
    }

    const entrySize = categories.entry.reduce((sum, f) => sum + f.gzipSize, 0) / 1024;
    if (entrySize > THRESHOLDS.initial.warning) {
      console.log(`  ${colors.yellow}• Entry point is ${entrySize.toFixed(2)}KB (target: <${THRESHOLDS.initial.warning}KB)${colors.reset}`);
      console.log(`    Consider lazy loading more components`);
    }

    console.log(`\n${colors.cyan}💡 Run 'npm run build:analyze' for detailed visualization${colors.reset}\n`);

  } catch (error) {
    console.error(`${colors.red}Error analyzing build:${colors.reset}`, error.message);
    process.exit(1);
  }
}

// Run analysis
analyzeBuild();

