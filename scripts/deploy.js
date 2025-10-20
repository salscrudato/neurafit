#!/usr/bin/env node
import { execSync } from 'child_process'
import { existsSync, rmSync } from 'fs'
import { resolve } from 'path'

const ROOT_DIR = resolve(process.cwd())

const exec = (command) => {
  try {
    execSync(command, { stdio: 'inherit', cwd: ROOT_DIR })
    return true
  } catch {
    console.error(`❌ Command failed: ${command}`)
    return false
  }
}

const clearCaches = () => {
  console.log('\n🧹 Clearing caches...')
  const cacheDirs = ['dist', 'node_modules/.vite', '.vite', 'node_modules/.cache']
  cacheDirs.forEach(dir => {
    const fullPath = resolve(ROOT_DIR, dir)
    if (existsSync(fullPath)) {
      rmSync(fullPath, { recursive: true, force: true })
    }
  })
  console.log('✅ Caches cleared\n')
}

const main = () => {
  const deployTarget = process.argv[2] || 'hosting'
  console.log('🚀 NeuraFit Deployment\n')

  clearCaches()

  if (!exec('npm run build')) {
    console.error('\n❌ Build failed.\n')
    process.exit(1)
  }

  if (!exec(`firebase deploy --only ${deployTarget}`)) {
    console.error('\n❌ Deployment failed.\n')
    process.exit(1)
  }

  console.log('\n✅ Deployment complete!')
  console.log('🌐 Live at: https://neurastack.ai\n')
}

main()
