import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright-core'

/**
 * Testa a versão estática em celulares emulados.
 * Uso: PAGES_URL=https://.../ SHOTS=pasta tsx scripts/e2e-pages.ts
 * Sem PAGES_URL, testa http://localhost:4100/vitrine-celulares/ (npm run serve:pages).
 */

const BASE = (process.env.PAGES_URL || 'http://localhost:4100/vitrine-celulares').replace(/\/$/, '')
const SHOTS = process.env.SHOTS
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'

const DEVICES = [
  { name: 'iphone', width: 390, height: 844, scale: 3, ua: IPHONE },
  { name: 'android-pequeno', width: 360, height: 740, scale: 2.625, ua: ANDROID },
  { name: 'tablet', width: 768, height: 1024, scale: 2, ua: IPHONE },
]
const PAGES = ['', 'celulares', 'celulares/aurora-x1-pro', 'celulares/vertice-7-seminovo', 'comparar?m=aurora-x1-pro,trama-one', 'encontre', 'favoritos', 'loja', 'marca/aurora', 'colecao/para-quem-joga']

const results: { name: string; ok: boolean; detail?: string }[] = []
async function step(name: string, fn: () => Promise<void>) {
  try {
    await fn()
    results.push({ name, ok: true })
    console.log(`  ok   ${name}`)
  } catch (error) {
    const detail = error instanceof Error ? error.message.split('\n').slice(0, 3).join(' | ') : String(error)
    results.push({ name, ok: false, detail })
    console.log(`  FALHOU ${name}: ${detail}`)
  }
}
const assert = (cond: unknown, message: string) => {
  if (!cond) throw new Error(message)
}

function watch(page: Page, problems: string[]) {
  page.on('pageerror', (e) => problems.push(`erro: ${e.message.slice(0, 160)}`))
  page.on('response', (r) => {
    if (r.status() >= 400 && r.url().startsWith(BASE)) problems.push(`${r.status()} ${r.url().slice(BASE.length)}`)
  })
  page.on('requestfailed', (r) => {
    const failure = r.failure()?.errorText ?? ''
    if (!failure.includes('ABORTED') && r.url().startsWith(BASE)) problems.push(`falha ${r.url().slice(BASE.length)} ${failure}`)
  })
}

async function reachEnd(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 70))
    }
    window.scrollTo(0, 0)
  })
  await page.waitForTimeout(250)
}

async function context(browser: Browser, d: (typeof DEVICES)[number]): Promise<BrowserContext> {
  return browser.newContext({ viewport: { width: d.width, height: d.height }, deviceScaleFactor: d.scale, hasTouch: true, isMobile: true, userAgent: d.ua, locale: 'pt-BR' })
}

if (SHOTS) mkdirSync(SHOTS, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })

for (const d of DEVICES) {
  console.log(`\n${d.name} (${d.width} x ${d.height})`)
  const ctx = await context(browser, d)
  const page = await ctx.newPage()
  const problems: string[] = []
  watch(page, problems)
  for (const url of PAGES) {
    await step(url || 'início', async () => {
      problems.length = 0
      const res = await page.goto(`${BASE}/${url}`, { waitUntil: 'load' })
      assert(res?.ok(), `status ${res?.status()}`)
      await page.waitForTimeout(500)
      await reachEnd(page)
      const metrics = await page.evaluate(() => {
        const width = document.documentElement.clientWidth
        const cut = [...document.querySelectorAll('main h1, main h2, main h3, main button, main a')].filter((el) => {
          const r = el.getBoundingClientRect()
          return r.width > 0 && !el.closest('.no-scrollbar') && (r.right > width + 1 || r.left < -1)
        })
        const small = [...document.querySelectorAll('header button, main button, nav a, nav button')].filter((el) => {
          const r = el.getBoundingClientRect()
          return r.width > 0 && (r.height < 32 || r.width < 32)
        })
        const broken = [...document.images].filter((img) => img.complete && img.naturalWidth === 0).length
        return { overflow: document.documentElement.scrollWidth - width, cut: cut.map((c) => c.textContent?.slice(0, 30)), small: small.length, broken }
      })
      assert(metrics.overflow <= 0, `${metrics.overflow}px de rolagem horizontal`)
      assert(!metrics.cut.length, `elementos cortados: ${metrics.cut.join(', ')}`)
      assert(!metrics.broken, `${metrics.broken} imagens quebradas`)
      assert(!problems.length, problems.slice(0, 3).join('; '))
      if (SHOTS) await page.screenshot({ path: join(SHOTS, `${d.name}-${(url || 'inicio').replace(/[/?=,]/g, '_')}.png`), fullPage: url === '' || url === 'celulares/aurora-x1-pro', timeout: 60000 })
    })
  }
  await ctx.close()
}

console.log('\nFluxos no celular')
const ctx = await context(browser, DEVICES[0])
const page = await ctx.newPage()
const problems: string[] = []
watch(page, problems)

await step('busca encontra por especificação', async () => {
  await page.goto(`${BASE}/`)
  await page.getByRole('button', { name: 'Buscar' }).last().tap()
  await page.getByPlaceholder('Modelo, marca ou especificação').fill('6000')
  await page.getByRole('dialog').getByRole('link', { name: /Trama One/ }).waitFor()
})
await step('filtros no painel de toque, sem servidor', async () => {
  await page.goto(`${BASE}/celulares/`)
  await page.getByText('6 aparelhos encontrados').waitFor()
  await page.getByRole('button', { name: /^Filtros/ }).tap()
  await page.getByRole('dialog', { name: 'Filtros' }).getByRole('button', { name: /^Seminovo/ }).tap()
  await page.getByRole('button', { name: /^Ver 1 aparelho/ }).tap()
  await page.getByRole('heading', { name: 'Vértice 7 Seminovo' }).waitFor()
  assert(page.url().includes('condicao=seminovo'), 'filtro fora do endereço')
  await page.reload()
  await page.getByText('1 aparelho encontrado').waitFor()
})
await step('endereço com busca funciona ao abrir direto', async () => {
  await page.goto(`${BASE}/celulares/?q=6000%20mah`)
  await page.getByRole('heading', { name: 'Trama One' }).waitFor()
  await page.getByText('1 aparelho encontrado').waitFor()
})
await step('foto primeiro, 3D sob demanda e giro com o dedo', async () => {
  const models: string[] = []
  page.on('request', (r) => r.url().endsWith('.glb') && models.push(r.url()))
  await page.goto(`${BASE}/celulares/aurora-x1-pro/`)
  await page.getByRole('tab', { name: 'Girar em 3D' }).waitFor()
  await page.waitForTimeout(800)
  assert(!models.length, 'baixou o modelo sem pedir')
  await page.getByRole('tab', { name: 'Girar em 3D' }).tap()
  await page.getByRole('button', { name: 'Voltar à posição inicial' }).waitFor({ timeout: 40000 })
  await page.waitForTimeout(2500)
  const canvas = page.locator('canvas').first()
  const before = await canvas.screenshot({ timeout: 30000 })
  const box = (await canvas.boundingBox())!
  const client = await ctx.newCDPSession(page)
  const point = (x: number) => [{ x, y: box.y + box.height / 2 }]
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(box.x + 90) })
  for (let x = 110; x <= 290; x += 30) await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(box.x + x) })
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.waitForTimeout(1500)
  assert(!before.equals(await canvas.screenshot({ timeout: 30000 })), 'o dedo não girou o modelo')
  if (SHOTS) await page.screenshot({ path: join(SHOTS, 'iphone-3d.png'), timeout: 60000 })
})
await step('WhatsApp leva nome, variante e link público', async () => {
  await page.goto(`${BASE}/celulares/aurora-x1-pro/`)
  await page.getByRole('radio', { name: '512 GB' }).tap()
  const href = decodeURIComponent((await page.getByRole('link', { name: 'Consultar', exact: false }).first().getAttribute('href')) ?? '')
  assert(href.includes('Aurora X1 Pro (Grafite, 512 GB, 12 GB)'), `mensagem: ${href}`)
  assert(href.includes('github.io/vitrine-celulares/celulares/aurora-x1-pro'), `link: ${href}`)
})
await step('comparar: adicionar, remover e endereço compartilhável', async () => {
  await page.goto(`${BASE}/celulares/`)
  await page.getByRole('button', { name: 'Adicionar à comparação' }).nth(0).tap()
  await page.getByRole('button', { name: 'Adicionar à comparação' }).nth(0).tap()
  await page.getByRole('link', { name: /^Comparar 2/ }).tap()
  await page.getByText('Lidera em:').first().waitFor()
  await page.reload()
  await page.getByText('Lidera em:').first().waitFor()
})
await step('assistente e favoritos', async () => {
  await page.goto(`${BASE}/encontre/`)
  for (const answer of ['Sem limite definido', 'Bateria', '128 GB ou mais', 'Tanto faz', 'Jogos', 'Sim']) await page.getByRole('button', { name: answer, exact: true }).tap()
  await page.getByRole('heading', { name: 'Estes combinam com você.' }).waitFor()
  await page.getByRole('button', { name: 'Salvar nos favoritos' }).first().tap()
  await page.goto(`${BASE}/favoritos/`)
  await page.locator('article').first().waitFor()
})
await step('navegação interna não dá erro', async () => {
  await page.goto(`${BASE}/`)
  await page.getByRole('link', { name: 'Explorar celulares' }).tap()
  await page.waitForURL(/\/celulares\/?$/)
  await page.getByRole('link', { name: 'Ver aparelho' }).first().tap()
  await page.waitForURL(/\/celulares\/[a-z0-9-]+\/?$/)
  await page.getByRole('heading', { level: 1 }).waitFor()
  await page.goBack()
  await page.getByText('6 aparelhos encontrados').waitFor()
})
await step('página inexistente mostra aviso próprio', async () => {
  const res = await page.goto(`${BASE}/nao-existe/`)
  assert(res?.status() === 404, `status ${res?.status()}`)
  await page.getByText('Nada neste endereço.').waitFor()
  problems.length = 0
})
await step('nenhum erro acumulado nos fluxos', async () => assert(!problems.length, problems.slice(0, 4).join('; ')))

await browser.close()
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length} de ${results.length} verificações passaram.`)
for (const f of failed) console.log(`  FALHOU ${f.name}: ${f.detail}`)
process.exit(failed.length ? 1 : 0)
