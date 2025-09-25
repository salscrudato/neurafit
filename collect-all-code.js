#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// File extensions to include
const CODE_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx', '.json', '.html', '.css', '.scss', '.sass', '.less',
  '.vue', '.svelte', '.md', '.yml', '.yaml', '.toml', '.xml', '.svg', '.txt',
  '.gitignore', '.env', '.env.example', '.env.local', '.env.production',
  '.eslintrc', '.prettierrc', '.babelrc', '.editorconfig'
];

// Directories to exclude
const EXCLUDE_DIRS = [
  'node_modules', 'dist', 'build', '.git', '.vscode', '.idea',
  'coverage', '.nyc_output', 'lib', '.next', '.nuxt', 'out'
];

// Files to exclude
const EXCLUDE_FILES = [
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
  '.DS_Store', 'Thumbs.db'
];

function shouldIncludeFile(filePath, fileName) {
  // Exclude specific files
  if (EXCLUDE_FILES.includes(fileName)) {
    return false;
  }
  
  // Include files with code extensions
  const ext = path.extname(fileName).toLowerCase();
  if (CODE_EXTENSIONS.includes(ext)) {
    return true;
  }
  
  // Include files without extensions that are likely config files
  if (!ext && (
    fileName.startsWith('.') ||
    fileName === 'Dockerfile' ||
    fileName === 'Makefile' ||
    fileName === 'LICENSE' ||
    fileName === 'README'
  )) {
    return true;
  }
  
  return false;
}

function shouldIncludeDirectory(dirName) {
  return !EXCLUDE_DIRS.includes(dirName) && !dirName.startsWith('.');
}

function collectFiles(dir, baseDir = dir) {
  const files = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath);
      
      if (entry.isDirectory()) {
        if (shouldIncludeDirectory(entry.name)) {
          files.push(...collectFiles(fullPath, baseDir));
        }
      } else if (entry.isFile()) {
        if (shouldIncludeFile(fullPath, entry.name)) {
          files.push({
            path: relativePath,
            fullPath: fullPath
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
  }
  
  return files;
}

function generateCodeCollection() {
  const projectRoot = process.cwd();
  console.log(`Collecting code files from: ${projectRoot}`);
  
  const files = collectFiles(projectRoot);
  console.log(`Found ${files.length} code files`);
  
  let output = `# NeuraFit Complete Codebase\n`;
  output += `Generated on: ${new Date().toISOString()}\n`;
  output += `Project root: ${projectRoot}\n`;
  output += `Total files: ${files.length}\n\n`;
  output += `${'='.repeat(80)}\n\n`;
  
  // Sort files by path for better organization
  files.sort((a, b) => a.path.localeCompare(b.path));
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(file.fullPath, 'utf8');
      const fileExtension = path.extname(file.path).toLowerCase();
      
      output += `## File: ${file.path}\n`;
      output += `Path: ${file.fullPath}\n`;
      output += `Size: ${content.length} characters\n`;
      output += `${'─'.repeat(60)}\n\n`;
      
      // Determine syntax highlighting based on file extension
      let language = '';
      switch (fileExtension) {
        case '.js': case '.jsx': language = 'javascript'; break;
        case '.ts': case '.tsx': language = 'typescript'; break;
        case '.json': language = 'json'; break;
        case '.html': language = 'html'; break;
        case '.css': case '.scss': case '.sass': case '.less': language = 'css'; break;
        case '.md': language = 'markdown'; break;
        case '.yml': case '.yaml': language = 'yaml'; break;
        case '.xml': language = 'xml'; break;
        case '.svg': language = 'xml'; break;
        default: language = 'text';
      }
      
      output += `\`\`\`${language}\n`;
      output += content;
      if (!content.endsWith('\n')) {
        output += '\n';
      }
      output += '```\n\n';
      output += `${'='.repeat(80)}\n\n`;
      
    } catch (error) {
      console.error(`Error reading file ${file.path}:`, error.message);
      output += `Error reading file: ${error.message}\n\n`;
      output += `${'='.repeat(80)}\n\n`;
    }
  }
  
  return output;
}

// Generate the collection
const codeCollection = generateCodeCollection();

// Write to file
const outputFile = 'neurafit-complete-codebase.txt';
fs.writeFileSync(outputFile, codeCollection, 'utf8');

console.log(`\nCode collection complete!`);
console.log(`Output written to: ${outputFile}`);
console.log(`File size: ${Math.round(codeCollection.length / 1024)} KB`);
