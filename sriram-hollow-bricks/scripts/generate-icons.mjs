import { readFileSync } from 'node:fs'
import { mkdirSync } from 'node:fs'
import sharp from 'sharp'

const OUT = './public'
mkdirSync(`${OUT}/icons`, { recursive: true })

const iconSvg = readFileSync('./assets/icon.svg')
const maskSvg = readFileSync('./assets/maskable.svg')

const tasks = [
  { svg: iconSvg, size: 192, out: `${OUT}/icons/192.png` },
  { svg: iconSvg, size: 512, out: `${OUT}/icons/512.png` },
  { svg: iconSvg, size: 180, out: `${OUT}/apple-touch-icon.png` },
  { svg: iconSvg, size: 32,  out: `${OUT}/favicon-32.png` },
  { svg: iconSvg, size: 16,  out: `${OUT}/favicon-16.png` },
  { svg: maskSvg, size: 512, out: `${OUT}/icons/maskable-512.png` },
]

for (const { svg, size, out } of tasks) {
  await sharp(svg).resize(size, size).png().toFile(out)
  console.log(`✓ ${out}`)
}
