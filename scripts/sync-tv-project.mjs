import { cp, mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const distDir = path.join(rootDir, 'dist')
const tvPublicDir = path.join(rootDir, 'android-tv', 'app', 'src', 'main', 'assets', 'public')

await rm(tvPublicDir, { recursive: true, force: true })
await mkdir(tvPublicDir, { recursive: true })
await cp(distDir, tvPublicDir, { recursive: true })

console.log(`Synced TV web assets to ${tvPublicDir}`)