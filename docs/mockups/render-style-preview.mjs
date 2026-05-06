import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const svgPath = path.join(__dirname, 'atlas-style-preview.svg')
const pngPath = path.join(__dirname, 'atlas-style-preview.png')
const svg = await readFile(svgPath, 'utf8')
const resvg = new Resvg(svg, {
  fitTo: {
    mode: 'width',
    value: 1600,
  },
})
await writeFile(pngPath, resvg.render().asPng())
console.log(`Rendered ${pngPath}`)
