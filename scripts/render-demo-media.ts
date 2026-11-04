import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { build } from 'esbuild'
import { chromium } from 'playwright-core'
import sharp from 'sharp'

const OUT = join('demo-assets', 'images')
mkdirSync(OUT, { recursive: true })

const bundle = await build({ entryPoints: ['scripts/render-page.ts'], bundle: true, format: 'iife', write: false, platform: 'browser', target: 'es2022' })
const script = bundle.outputFiles[0].text

const browser = await chromium.launch({
  channel: 'msedge',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage()
page.on('pageerror', (e) => console.error('erro na página:', e.message))
await page.setContent('<!doctype html><html><body></body></html>')
await page.addScriptTag({ content: script })
await page.waitForFunction('window.ready === true')

async function shot(id: string, name: string, opts: { tint?: string; width: number; height: number; shots: object[]; distance?: number }) {
  const glb = readFileSync(join('demo-assets', 'models', `demo-${id}.glb`)).toString('base64')
  const data = await page.evaluate((req) => (window as any).renderShot(req), { glb, ...opts })
  const png = Buffer.from(String(data).split(',')[1], 'base64')
  await sharp(png).trim({ threshold: 2 }).webp({ quality: 90, alphaQuality: 95 }).toFile(join(OUT, `${id}-${name}.webp`))
  console.log(`${id}-${name}.webp`)
}

const PORTRAIT = { width: 1200, height: 1600 }
const COLORS: Record<string, Record<string, string>> = {
  aurora: { prata: '#c9ccd1', bronze: '#6d5238' },
  vertice: { gelo: '#b9d3df', grafite: '#26282b' },
  trama: { musgo: '#4d5a3e', areia: '#b9ad97' },
}

const only = process.argv[2]
for (const id of ['aurora', 'vertice', 'trama']) {
  if (only && only !== id) continue
  await shot(id, 'frente', { ...PORTRAIT, shots: [{ x: 4, y: 14, z: -2 }] })
  await shot(id, 'costas', { ...PORTRAIT, shots: [{ x: 4, y: 168, z: 2 }] })
  await shot(id, 'angulo', { ...PORTRAIT, shots: [{ x: 8, y: 214, z: 4 }] })
  await shot(id, 'lateral', { ...PORTRAIT, shots: [{ x: 2, y: 74, z: -1 }] })
  await shot(id, 'par', {
    width: 1500,
    height: 1500,
    distance: 4.2,
    shots: [
      { x: 2, y: 196, z: 0, px: -0.2, py: 0.05 },
      { x: 2, y: -16, z: 0, px: 0.28, py: -0.05, pz: 0.3, s: 0.9 },
    ],
  })
  for (const [name, tint] of Object.entries(COLORS[id])) {
    await shot(id, `angulo-${name}`, { ...PORTRAIT, tint, shots: [{ x: 8, y: 214, z: 4 }] })
    await shot(id, `frente-${name}`, { ...PORTRAIT, tint, shots: [{ x: 4, y: 14, z: -2 }] })
  }
}

if (!only || only === 'spin') {
  for (let i = 0; i < 24; i++) {
    const name = `spin-${String(i).padStart(2, '0')}`
    const glb = readFileSync(join('demo-assets', 'models', 'demo-vertice.glb')).toString('base64')
    const data = await page.evaluate((req) => (window as any).renderShot(req), { glb, width: 750, height: 1000, shots: [{ x: 6, y: i * 15, z: 0 }] })
    await sharp(Buffer.from(String(data).split(',')[1], 'base64')).webp({ quality: 80, alphaQuality: 90 }).toFile(join(OUT, `vertice-${name}.webp`))
  }
  console.log('sequência 360 gerada')
}

await browser.close()
writeFileSync(join(OUT, '.gerado'), new Date().toISOString())
