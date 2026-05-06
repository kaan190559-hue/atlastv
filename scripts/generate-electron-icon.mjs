import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'
import pngToIco from 'png-to-ico'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const svgPath = path.join(rootDir, 'public', 'favicon.svg')
const buildDir = path.join(rootDir, 'build')
const pngPath = path.join(buildDir, 'icon.png')
const icoPath = path.join(buildDir, 'icon.ico')
const rawSvgSource = await readFile(svgPath, 'utf8')
const svgSource = rawSvgSource.replace(
  /^<svg[^>]*>/,
  '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 48 48">',
)
const sizes = [16, 32, 48, 64, 128, 256]

await mkdir(buildDir, { recursive: true })

const pngBuffers = sizes.map((size) => {
  const resvg = new Resvg(svgSource, {
    fitTo: {
      mode: 'width',
      value: size,
    },
  })

  return resvg.render().asPng()
})

await writeFile(pngPath, pngBuffers[pngBuffers.length - 1])
await writeFile(icoPath, await pngToIco(pngBuffers))

console.log(`Generated Electron icon: ${icoPath}`)