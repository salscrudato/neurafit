import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')

const updateManifestVersion = () => {
  try {
    console.log('📝 Updating manifest.json version...')
    const appVersion = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8')).version
    const manifest = JSON.parse(readFileSync(join(rootDir, 'public', 'manifest.json'), 'utf-8'))
    const now = new Date()
    const timestamp = now.getTime()
    const isoTime = now.toISOString()

    manifest.version = appVersion
    manifest.build_time = isoTime
    manifest.cache_version = `v${appVersion}-${timestamp}`

    writeFileSync(join(rootDir, 'public', 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
    console.log(`✅ Manifest updated: v${appVersion}`)
  } catch (error) {
    console.error('❌ Error updating manifest:', error.message)
    process.exit(1)
  }
}

updateManifestVersion()
