import { spawn, execSync, type ChildProcess } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { chromium, type Browser, type Page } from 'playwright-core'
import sharp from 'sharp'

/**
 * Teste de ponta a ponta sobre o build de produção, com banco e arquivos isolados em tmp/.
 * Uso: npm run build && npm run test:e2e
 */

const PORT = 3100
const BASE = `http://localhost:${PORT}`
const EMAIL = 'teste@loja.test'
const PASSWORD = 'senha-apenas-do-teste-e2e'
const TMP = resolve('tmp/e2e')
const env = { ...process.env, DATABASE_URL: `file:${join(TMP, 'e2e.db').replaceAll('\\', '/')}`, STORAGE_LOCAL_DIR: join(TMP, 'storage'), ADMIN_EMAIL: EMAIL, ADMIN_PASSWORD: PASSWORD, NEXT_PUBLIC_SITE_URL: BASE }

let serverLog = ''
const results: { name: string; ok: boolean; detail?: string }[] = []
async function step(name: string, fn: () => Promise<void>) {
  try {
    await fn()
    results.push({ name, ok: true })
    console.log(`  ok   ${name}`)
  } catch (error) {
    const detail = error instanceof Error ? error.message.split('\n').slice(0, 4).join(' | ') : String(error)
    results.push({ name, ok: false, detail })
    console.log(`  FALHOU ${name}: ${detail}`)
  }
}
const assert = (cond: unknown, message: string) => {
  if (!cond) throw new Error(message)
}

function startServer() {
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(PORT)], { env, stdio: 'pipe' })
  child.stderr.on('data', (d) => process.env.E2E_VERBOSE && console.error(String(d)))
  child.stdout.on('data', (d) => (serverLog += String(d)))
  return child
}

async function waitForServer() {
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(BASE)).status < 500) return
    } catch {
      // ainda subindo
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error('servidor não respondeu')
}

const stopServer = (child: ChildProcess) =>
  new Promise<void>((done) => {
    child.once('exit', () => done())
    child.kill()
  })

async function noOverflow(page: Page, url: string) {
  await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(300)
  const extra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  assert(extra <= 0, `${url} tem ${extra}px de rolagem horizontal`)
}

async function listMediaUrl(page: Page, name: string) {
  await page.reload()
  await page.getByText(name).first().click()
  const src = await page.locator('video').getAttribute('src')
  await page.getByRole('button', { name: 'Fechar' }).click()
  return src ?? ''
}

async function login(page: Page) {
  await page.goto(`${BASE}/admin/login`)
  await page.fill('input[name=email]', EMAIL)
  await page.fill('input[name=password]', PASSWORD)
  await page.click('button:has-text("Entrar")')
  await page.waitForURL(`${BASE}/admin`)
}

async function main() {
  rmSync(TMP, { recursive: true, force: true })
  mkdirSync(TMP, { recursive: true })
  rmSync('.next/cache', { recursive: true, force: true })
  execSync('npx tsx scripts/db-migrate.ts', { env, stdio: 'ignore' })
  execSync('npx tsx scripts/seed.ts', { env, stdio: 'ignore' })

  const photo = join(TMP, 'foto.jpg')
  await sharp({ create: { width: 900, height: 1200, channels: 3, background: '#335577' } }).jpeg().toFile(photo)
  const fake = join(TMP, 'falsa.jpg')
  writeFileSync(fake, '<html><script>alert(1)</script></html>')
  const fakeGlb = join(TMP, 'falso.glb')
  writeFileSync(fakeGlb, Buffer.concat([Buffer.from('glTF'), Buffer.from([2, 0, 0, 0]), Buffer.alloc(40)]))

  let server = startServer()
  await waitForServer()
  const browser: Browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  const pageErrors: string[] = []
  page.on('pageerror', (e) => pageErrors.push(e.message))

  console.log('\nVitrine pública')
  await step('página inicial mostra destaque e seções', async () => {
    await page.goto(BASE)
    await page.getByRole('heading', { level: 1 }).waitFor()
    assert((await page.getByText('Escolhidos pela loja').count()) === 1, 'seção de destaques ausente')
  })
  await step('busca por especificação encontra aparelho', async () => {
    await page.goto(`${BASE}/celulares?q=6000 mah`)
    await page.getByText('1 aparelho encontrado').waitFor()
    assert(await page.getByRole('heading', { name: 'Trama One' }).count(), 'Trama One não encontrado')
  })
  await step('pesquisa sem resultado mostra estado vazio', async () => {
    await page.goto(`${BASE}/celulares?q=xyzzy`)
    await page.getByText('Nenhum aparelho com essa combinação.').waitFor()
  })
  await step('filtros reduzem a lista e podem ser limpos', async () => {
    await page.goto(`${BASE}/celulares`)
    await page.getByText('6 aparelhos encontrados').waitFor()
    await page.getByRole('button', { name: /^Seminovo/ }).click()
    await page.getByText('1 aparelho encontrado').waitFor()
    assert(page.url().includes('condicao=seminovo'), 'URL sem filtro')
    await page.getByRole('button', { name: 'Limpar filtros' }).click()
    await page.getByText('6 aparelhos encontrados').waitFor()
  })
  await step('filtro de preço funciona', async () => {
    await page.goto(`${BASE}/celulares?max=3000`)
    const headings = await page.locator('article h3').allTextContents()
    assert(headings.length > 0 && !headings.includes('Aurora X1 Pro'), `resultado incorreto: ${headings}`)
  })
  await step('produto: trocar cor e armazenamento muda preço e WhatsApp', async () => {
    await page.goto(`${BASE}/celulares/aurora-x1-pro`)
    await page.getByRole('radio', { name: '512 GB' }).click()
    await page.getByText('R$ 7.799').first().waitFor()
    const href = decodeURIComponent((await page.getByRole('link', { name: 'Consultar pelo WhatsApp' }).getAttribute('href')) ?? '')
    assert(href.includes('Aurora X1 Pro (Grafite, 512 GB, 12 GB)'), `mensagem sem variante: ${href}`)
    assert(href.includes('/celulares/aurora-x1-pro'), 'mensagem sem link')
  })
  await step('produto com 3D carrega o modelo e não promete nos que não têm', async () => {
    await page.goto(`${BASE}/celulares/trama-one`)
    await page.getByRole('button', { name: 'Voltar à posição inicial' }).waitFor({ timeout: 30000 })
    await page.goto(`${BASE}/celulares/aurora-s`)
    await page.getByRole('heading', { name: 'Aurora S', level: 1 }).waitFor()
    assert((await page.getByRole('tab', { name: 'Girar em 3D' }).count()) === 0, 'prometeu 3D sem modelo')
    assert((await page.getByText('Consulte o preço').count()) > 0, 'preço oculto não respeitado')
  })
  await step('3D responde: arrastar gira, cor muda o material, botões trocam a vista', async () => {
    await page.goto(`${BASE}/celulares/aurora-x1-pro`)
    await page.getByRole('button', { name: 'Voltar à posição inicial' }).waitFor({ timeout: 30000 })
    await page.waitForTimeout(2500)
    const canvas = page.locator('canvas').first()
    const box = (await canvas.boundingBox())!
    const pixels = async () => canvas.screenshot({ timeout: 20000 })
    const a = await pixels()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 180, box.y + box.height / 2, { steps: 6 })
    await page.mouse.up()
    await page.waitForTimeout(1200)
    const b = await pixels()
    assert(!a.equals(b), 'arrastar não girou o modelo')
    await page.getByRole('button', { name: 'Costas', exact: true }).click()
    await page.waitForTimeout(2500)
    const back = await pixels()
    await page.getByRole('radio', { name: 'Prata' }).click()
    await page.waitForTimeout(1000)
    const silver = await pixels()
    assert(!back.equals(silver), 'trocar a cor não mudou o modelo')
    await page.getByRole('button', { name: 'Conjunto de câmeras' }).click()
    await page.getByText('Ponto de exemplo. No painel').waitFor()
  })
  await step('falha ao baixar o modelo 3D cai na alternativa visual sem quebrar a página', async () => {
    const broken = await ctx.newPage()
    await broken.route('**/*.glb', (route) => route.fulfill({ status: 404, body: '' }))
    await broken.goto(BASE)
    await broken.waitForTimeout(2500)
    assert(!(await broken.getByText('Não foi possível carregar esta página').count()), 'a página inicial quebrou')
    assert(await broken.getByText('Escolhidos pela loja').count(), 'home sem conteúdo')
    await broken.goto(`${BASE}/celulares/trama-one`)
    await broken.waitForTimeout(2500)
    assert(!(await broken.getByText('Não foi possível carregar esta página').count()), 'a página do produto quebrou')
    assert((await broken.getByRole('tab', { name: 'Girar em 3D' }).count()) === 0, 'continua oferecendo 3D')
    await broken.getByRole('button', { name: 'Ampliar imagem' }).waitFor()
    await broken.close()
  })
  await step('visualização 360 aparece só quando há sequência', async () => {
    await page.goto(`${BASE}/celulares/vertice-7-seminovo`)
    await page.getByRole('tab', { name: '360°' }).click()
    await page.getByRole('slider').waitFor()
  })
  await step('comparador destaca diferenças sem eleger vencedor geral', async () => {
    await page.goto(`${BASE}/comparar?m=aurora-x1-pro,trama-one`)
    await page.getByText('Lidera em:').first().waitFor()
    const href = decodeURIComponent((await page.getByRole('link', { name: 'Me ajude a escolher' }).getAttribute('href')) ?? '')
    assert(href.includes('Aurora X1 Pro') && href.includes('Trama One'), 'mensagem sem os modelos')
    assert((await page.locator('.text-accent', { hasText: '6000 mAh' }).count()) === 1, 'bateria maior não destacada')
  })
  await step('assistente recomenda com base no cadastro', async () => {
    await page.goto(`${BASE}/encontre`)
    for (const answer of ['Sem limite definido', 'Bateria', '128 GB ou mais', 'Tanto faz', 'Jogos', 'Sim']) await page.getByRole('button', { name: answer, exact: true }).click()
    await page.getByRole('heading', { name: 'Estes combinam com você.' }).waitFor()
    assert((await page.locator('article h3').first().textContent()) === 'Trama One', 'recomendação inesperada')
  })
  await step('favoritos persistem sem cadastro', async () => {
    await page.goto(`${BASE}/celulares`)
    await page.getByRole('button', { name: 'Salvar nos favoritos' }).first().click()
    await page.goto(`${BASE}/favoritos`)
    await page.locator('article').first().waitFor()
  })
  await step('dados estruturados e metadados por produto', async () => {
    await page.goto(`${BASE}/celulares/trama-one`)
    assert((await page.title()).includes('Trama One'), 'título sem o produto')
    assert(await page.locator('meta[property="og:image"]').count(), 'sem imagem de compartilhamento')
  })

  console.log('\nSegurança')
  await step('painel exige login', async () => {
    const anon = await browser.newContext()
    const p = await anon.newPage()
    await p.goto(`${BASE}/admin/produtos`)
    assert(p.url().includes('/admin/login'), 'não redirecionou')
    await p.goto(`${BASE}/preview/inicio`)
    assert(p.url().includes('/admin/login'), 'prévia aberta sem login')
    await anon.close()
  })
  await step('cookie forjado não entra', async () => {
    const res = await fetch(`${BASE}/admin`, { headers: { cookie: 'vitrine_sessao=falso' }, redirect: 'manual' })
    assert(res.status >= 300 && res.status < 400, `status ${res.status}`)
  })
  await step('upload sem sessão é recusado', async () => {
    const form = new FormData()
    form.append('file', new Blob(['x']), 'a.jpg')
    const res = await fetch(`${BASE}/api/admin/media`, { method: 'POST', body: form })
    assert(res.status === 401, `status ${res.status}`)
  })
  await step('tentativas repetidas de senha são bloqueadas', async () => {
    const anon = await browser.newContext()
    const p = await anon.newPage()
    for (let i = 0; i < 6; i++) {
      await p.goto(`${BASE}/admin/login`)
      await p.fill('input[name=email]', 'alguem@loja.test')
      await p.fill('input[name=password]', 'errada')
      await p.click('button:has-text("Entrar")')
      await p.locator('form p[role=alert]').waitFor()
    }
    await p.getByText('Muitas tentativas').waitFor()
    await anon.close()
  })
  await step('evento desconhecido é recusado', async () => {
    const res = await fetch(`${BASE}/api/events`, { method: 'POST', body: JSON.stringify({ type: 'hack' }), headers: { 'content-type': 'application/json' } })
    assert(res.status === 400, `status ${res.status}`)
  })
  await step('travessia de caminho na mídia não funciona', async () => {
    const res = await fetch(`${BASE}/media/..%2F..%2Fpackage.json`)
    assert(res.status === 404, `status ${res.status}`)
  })

  console.log('\nPainel')
  await step('login e resumo com dados reais', async () => {
    await login(page)
    await page.getByText('Produtos cadastrados').waitFor()
    await page.getByText('Aparelhos mais vistos').waitFor()
  })
  await step('recusa arquivo disfarçado e GLB inválido', async () => {
    await page.goto(`${BASE}/admin/midia`)
    await page.locator('input[type=file]').setInputFiles(fake)
    await page.getByText('Formato não aceito').waitFor()
    await page.locator('input[type=file]').setInputFiles(fakeGlb)
    await page.getByText('incompleto ou corrompido').waitFor()
  })
  await step('publicação bloqueada quando falta informação', async () => {
    await page.goto(`${BASE}/admin/produtos/novo`)
    await page.getByLabel('Nome comercial').fill('Aparelho Teste E2E')
    await page.getByRole('button', { name: 'Publicar' }).click()
    await page.getByText('Faltam itens para publicar.').waitFor()
    await page.getByText('Escolha a marca.').waitFor()
  })
  await step('cria aparelho com foto real e publica', async () => {
    await page.getByLabel('Marca').selectOption({ index: 1 })
    await page.getByLabel('Preço de venda (R$)').fill('1.234,50')
    await page.locator('input[type=file][accept^="image"]').first().setInputFiles(photo)
    await page.locator('.badge', { hasText: 'Principal' }).waitFor()
    await page.getByRole('button', { name: 'Publicar' }).click()
    await page.getByText('Publicado na vitrine.').waitFor()
    await page.waitForURL(/\/admin\/produtos\/[0-9a-f-]{36}/)
  })
  await step('aparelho aparece na vitrine com o preço cadastrado', async () => {
    const p = await ctx.newPage()
    await p.goto(`${BASE}/celulares/aparelho-teste-e2e`)
    await p.getByRole('heading', { name: 'Aparelho Teste E2E', level: 1 }).waitFor()
    assert((await p.getByText('R$ 1.234,50').count()) > 0, 'preço incorreto')
    const src = await p.locator('main img').first().getAttribute('src')
    assert((await fetch(`${BASE}${src}`)).ok, 'imagem não servida')
    await p.close()
  })
  await step('rascunho de produto publicado não vaza; prévia mostra; publicar aplica', async () => {
    await page.reload()
    await page.getByLabel('Nome comercial').fill('Aparelho Teste E2E Editado')
    await page.getByRole('button', { name: 'Salvar rascunho' }).click()
    await page.getByText('Rascunho salvo.').waitFor()
    const pub = await ctx.newPage()
    await pub.goto(`${BASE}/celulares/aparelho-teste-e2e`)
    assert((await pub.getByRole('heading', { level: 1 }).textContent()) === 'Aparelho Teste E2E', 'rascunho vazou')
    const id = page.url().split('/').pop()
    await pub.goto(`${BASE}/preview/produto/${id}`)
    await pub.getByRole('heading', { name: 'Aparelho Teste E2E Editado', level: 1 }).waitFor()
    await pub.close()
    await page.getByRole('button', { name: 'Publicar' }).click()
    await page.getByText('Publicado na vitrine.').waitFor()
    const after = await ctx.newPage()
    await after.goto(`${BASE}/celulares/aparelho-teste-e2e`)
    await after.getByRole('heading', { name: 'Aparelho Teste E2E Editado', level: 1 }).waitFor()
    await after.close()
  })
  await step('sequência 360° enviada de uma vez fica na ordem dos nomes', async () => {
    // Fora de ordem de propósito: q1 (vermelho) precisa virar o primeiro quadro.
    const colors: Record<string, string> = { 'q10.jpg': '#0000ff', 'q2.jpg': '#00ff00', 'q1.jpg': '#ff0000' }
    const frames = Object.keys(colors).map((name) => join(TMP, name))
    await Promise.all(Object.entries(colors).map(([name, background]) => sharp({ create: { width: 600, height: 800, channels: 3, background } }).jpeg().toFile(join(TMP, name))))
    await page.locator('input[aria-label="Enviar sequência 360°"]').setInputFiles(frames)
    await page.getByText('3 quadros adicionados').waitFor({ timeout: 60_000 })
    await page.getByRole('button', { name: 'Publicar' }).click()
    await page.getByText('Publicado na vitrine.').waitFor()
    const p = await ctx.newPage()
    await p.goto(`${BASE}/celulares/aparelho-teste-e2e`)
    await p.getByRole('tab', { name: '360°' }).click()
    const src = await p.locator('[role=slider] img').first().getAttribute('src')
    const { dominant } = await sharp(Buffer.from(await (await fetch(`${BASE}${src}`)).arrayBuffer())).stats()
    assert(dominant.r > 200 && dominant.g < 80 && dominant.b < 80, `primeiro quadro não é q1: ${JSON.stringify(dominant)}`)
    await p.close()
  })
  await step('dados continuam salvos depois de reiniciar o servidor', async () => {
    await stopServer(server)
    server = startServer()
    await waitForServer()
    await page.goto(`${BASE}/celulares/aparelho-teste-e2e`)
    await page.getByRole('heading', { name: 'Aparelho Teste E2E Editado', level: 1 }).waitFor()
    await page.goto(`${BASE}/admin/produtos?q=E2E`)
    await page.getByText('Aparelho Teste E2E Editado').waitFor()
  })
  await step('despublicar tira de catálogo, comparador e recomendações', async () => {
    await page.getByRole('button', { name: 'Despublicar Aparelho Teste E2E Editado' }).click()
    await page.getByText('Produto retirado da vitrine.').waitFor()
    const res = await fetch(`${BASE}/celulares/aparelho-teste-e2e`)
    assert(res.status === 404, `status ${res.status}`)
    const compare = await (await fetch(`${BASE}/comparar?m=aparelho-teste-e2e,trama-one`)).text()
    assert(!compare.includes('Aparelho Teste E2E'), 'ainda no comparador')
    const list = await (await fetch(`${BASE}/celulares`)).text()
    assert(!list.includes('Aparelho Teste E2E'), 'ainda no catálogo')
  })
  await step('exclusão pede confirmação e remove', async () => {
    await page.getByRole('button', { name: 'Excluir Aparelho Teste E2E Editado' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Excluir' }).click()
    await page.getByText('Produto excluído.').waitFor()
    await page.reload()
    await page.getByText('Nenhum produto encontrado.').waitFor()
  })
  await step('arquivo em uso não pode ser excluído', async () => {
    await page.goto(`${BASE}/admin/midia`)
    await page.getByRole('button', { name: 'Modelos 3D' }).click()
    await page.locator('ul li button').first().click()
    await page.getByRole('button', { name: 'Excluir' }).click()
    await page.getByText('Arquivo em uso').waitFor()
    await page.getByRole('button', { name: 'Entendi' }).click()
    await page.getByRole('button', { name: 'Fechar' }).click()
  })
  await step('marca nova é criada; marca em uso não pode ser excluída', async () => {
    await page.goto(`${BASE}/admin/catalogo`)
    await page.getByRole('button', { name: 'Nova marca' }).click()
    await page.getByLabel('Nome').fill('Marca Teste')
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar' }).click()
    await page.getByText('Marca salva.').waitFor()
    await page.getByRole('button', { name: 'Excluir Aurora (demo)' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Excluir' }).click()
    await page.getByText(/produtos nesta marca/).waitFor()
  })
  await step('envia GLB real, vídeo e avisa quando o modelo é pesado', async () => {
    await page.goto(`${BASE}/admin/midia`)
    const input = page.locator('input[type=file]')
    await input.setInputFiles('demo-assets/models/demo-trama.glb')
    await page.getByText('demo-trama.glb').first().waitFor()
    const base = readFileSync('demo-assets/models/demo-trama.glb')
    const padding = Buffer.alloc(9 * 1024 * 1024)
    padding.writeUInt32LE(padding.length - 8, 0)
    padding.writeUInt32LE(0x004e4942, 4)
    const heavy = Buffer.concat([base, padding])
    heavy.writeUInt32LE(heavy.length, 8)
    const heavyPath = join(TMP, 'pesado.glb')
    writeFileSync(heavyPath, heavy)
    await input.setInputFiles(heavyPath)
    await page.getByText('Arquivo pesado', { exact: false }).first().waitFor({ timeout: 20000 })
    const video = join(TMP, 'video.mp4')
    writeFileSync(video, Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypisom'), Buffer.alloc(2048)]))
    await input.setInputFiles(video)
    await page.getByText('video.mp4').first().waitFor()
    const res = await listMediaUrl(page, 'video.mp4')
    const ranged = await fetch(`${BASE}${res}`, { headers: { range: 'bytes=0-99' } })
    const part = await ranged.arrayBuffer()
    assert(ranged.status === 206 && part.byteLength === 100 && ranged.headers.get('content-range')?.startsWith('bytes 0-99/'), `streaming falhou: ${ranged.status} ${part.byteLength}`)
  })
  await step('página inicial: rascunho, prévia e publicação', async () => {
    await page.goto(`${BASE}/admin/pagina-inicial`)
    await page.getByLabel('Título', { exact: true }).first().fill('Título alterado pelo painel')
    await page.getByRole('button', { name: 'Salvar rascunho' }).click()
    await page.getByText('Rascunho salvo.').waitFor()
    assert(!(await (await fetch(BASE)).text()).includes('Título alterado pelo painel'), 'rascunho vazou na vitrine')
    await page.getByRole('button', { name: 'Publicar' }).click()
    await page.getByText('Página inicial publicada.').waitFor()
    assert((await (await fetch(BASE)).text()).includes('Título alterado pelo painel'), 'publicação não refletiu')
  })
  await step('desligar seção a retira da vitrine', async () => {
    await page.getByRole('switch', { name: 'Exibir Escolhidos pela loja' }).click()
    await page.getByRole('button', { name: 'Publicar' }).click()
    await page.getByText('Página inicial publicada.').waitFor()
    assert(!(await (await fetch(BASE)).text()).includes('Escolhidos pela loja'), 'seção continua visível')
  })
  await step('configurações: WhatsApp e cor refletem na vitrine', async () => {
    await page.goto(`${BASE}/admin/configuracoes`)
    await page.getByLabel(/^WhatsApp/).fill('55 11 91234-5678')
    await page.getByRole('radio', { name: 'Ciano' }).click()
    await page.getByRole('button', { name: 'Publicar' }).click()
    await page.getByText('Configurações publicadas.').waitFor()
    const html = await (await fetch(`${BASE}/celulares/trama-one`)).text()
    assert(html.includes('wa.me/5511912345678'), 'número não aplicado')
    assert(html.includes('#58DCEB'), 'cor não aplicada')
  })
  await step('remover dados de demonstração limpa a vitrine', async () => {
    await page.goto(`${BASE}/admin`)
    await page.getByRole('button', { name: 'Remover dados de demonstração' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Remover' }).click()
    await page.getByText('Dados de demonstração removidos.').waitFor()
    await page.goto(`${BASE}/celulares`)
    await page.getByText('0 aparelhos encontrados').waitFor()
    assert(!(await (await fetch(BASE)).text()).includes('Ambiente de demonstração'), 'aviso permanece')
  })

  await step('editor não vê funções de proprietário', async () => {
    await page.goto(`${BASE}/admin/usuarios`)
    await page.getByLabel('Nome', { exact: true }).fill('Pessoa Editora')
    await page.getByLabel('E-mail').fill('editor@loja.test')
    await page.getByRole('button', { name: 'Criar usuário' }).click()
    const code = await page.locator('p[role=status] code').textContent()
    const other = await browser.newContext()
    const p = await other.newPage()
    await p.goto(`${BASE}/admin/login`)
    await p.fill('input[name=email]', 'editor@loja.test')
    await p.fill('input[name=password]', code ?? '')
    await p.click('button:has-text("Entrar")')
    await p.waitForURL(`${BASE}/admin`)
    await p.goto(`${BASE}/admin/usuarios`)
    await p.getByText('Minha senha').waitFor()
    assert((await p.getByText('Equipe').count()) === 0, 'editor vê a equipe')
    await other.close()
  })
  await step('recuperação de senha troca a senha e encerra sessões', async () => {
    const other = await browser.newContext()
    const p = await other.newPage()
    await p.goto(`${BASE}/admin/recuperar`)
    await p.fill('input[name=email]', EMAIL)
    await p.click('button:has-text("Enviar link")')
    await p.getByText('Verifique seu e-mail').waitFor()
    await p.waitForTimeout(300)
    const link = serverLog.match(/\/admin\/redefinir\/[\w-]+/)?.[0]
    assert(link, 'link não gerado')
    await p.goto(`${BASE}${link}`)
    await p.fill('input[name=password]', 'nova-senha-do-teste-e2e')
    await p.click('button:has-text("Salvar nova senha")')
    await p.waitForURL(`${BASE}/admin/login`)
    await p.fill('input[name=email]', EMAIL)
    await p.fill('input[name=password]', 'nova-senha-do-teste-e2e')
    await p.click('button:has-text("Entrar")')
    await p.waitForURL(`${BASE}/admin`)
    await p.goto(`${BASE}${link}`)
    await p.fill('input[name=password]', 'outra-senha-qualquer-1')
    await p.click('button:has-text("Salvar nova senha")')
    await p.getByText('Link inválido ou expirado').waitFor()
    await other.close()
    await page.goto(`${BASE}/admin`)
    assert(page.url().includes('/admin/login'), 'sessão antiga continuou válida')
  })

  console.log('\nResponsividade (390 x 844)')
  await browser.close()
  await stopServer(server)
  rmSync(TMP, { recursive: true, force: true })
}

async function responsive() {
  mkdirSync(TMP, { recursive: true })
  rmSync('.next/cache', { recursive: true, force: true })
  execSync('npx tsx scripts/db-migrate.ts', { env, stdio: 'ignore' })
  execSync('npx tsx scripts/seed.ts', { env, stdio: 'ignore' })
  const server = startServer()
  await waitForServer()
  const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  for (const [label, width, height] of [['celular 390', 390, 844], ['celular 320', 320, 640], ['tablet 768', 768, 1024], ['notebook 1280', 1280, 800]] as const) {
    const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: width < 800, isMobile: width < 800 })
    const page = await ctx.newPage()
    for (const url of ['/', '/celulares', '/celulares/aurora-x1-pro', '/celulares/vertice-7-seminovo', '/comparar?m=aurora-x1-pro,trama-one,vertice-8', '/encontre', '/favoritos', '/loja']) {
      await step(`${label}: ${url}`, () => noOverflow(page, url))
    }
    await login(page)
    for (const url of ['/admin', '/admin/produtos', '/admin/produtos/novo', '/admin/midia', '/admin/guia-de-captura', '/admin/catalogo', '/admin/pagina-inicial', '/admin/configuracoes', '/admin/usuarios']) {
      await step(`${label}: ${url}`, () => noOverflow(page, url))
    }
    await ctx.close()
  }
  await step('celular: cadastrar e publicar aparelho sem computador', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
    const page = await ctx.newPage()
    await login(page)
    await page.goto(`${BASE}/admin/produtos/novo`)
    await page.getByLabel('Nome comercial').fill('Cadastro Pelo Celular')
    await page.getByLabel('Marca').selectOption({ index: 1 })
    await page.getByLabel('Preço de venda (R$)').fill('999')
    const photo = join(TMP, 'foto2.jpg')
    await sharp({ create: { width: 3000, height: 4000, channels: 3, background: '#553322' } }).jpeg().toFile(photo)
    await page.locator('input[type=file][accept^="image"]').first().setInputFiles(photo)
    await page.locator('.badge', { hasText: 'Principal' }).waitFor()
    await page.getByRole('button', { name: 'Publicar' }).tap()
    await page.getByText('Publicado na vitrine.').waitFor()
    await page.goto(`${BASE}/celulares/cadastro-pelo-celular`)
    await page.getByRole('heading', { name: 'Cadastro Pelo Celular', level: 1 }).waitFor()
    await ctx.close()
  })
  await step('celular: foto primeiro, 3D sob demanda', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
    const page = await ctx.newPage()
    const models: string[] = []
    page.on('request', (r) => r.url().endsWith('.glb') && models.push(r.url()))
    await page.goto(`${BASE}/`)
    await page.waitForTimeout(1500)
    await page.goto(`${BASE}/celulares/aurora-x1-pro`)
    await page.getByRole('tab', { name: 'Girar em 3D' }).waitFor()
    await page.waitForTimeout(1200)
    assert(models.length === 0, 'baixou modelo sem o cliente pedir')
    await page.getByRole('tab', { name: 'Girar em 3D' }).tap()
    await page.getByRole('button', { name: 'Voltar à posição inicial' }).waitFor({ timeout: 30000 })
    assert(models.length === 1, 'não baixou o modelo')
    await ctx.close()
  })
  await step('celular: filtros em painel de toque', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
    const page = await ctx.newPage()
    await page.goto(`${BASE}/celulares`)
    await page.getByRole('button', { name: /^Filtros/ }).tap()
    await page.getByRole('dialog', { name: 'Filtros' }).getByRole('button', { name: /^Seminovo/ }).tap()
    await page.getByRole('button', { name: /^Ver 1 aparelho/ }).tap()
    await page.locator('article h3').first().waitFor()
    await ctx.close()
  })
  await browser.close()
  await stopServer(server)
}

await main()
await responsive()

rmSync(TMP, { recursive: true, force: true })
rmSync('.next/cache', { recursive: true, force: true })
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length} de ${results.length} verificações passaram.`)
for (const f of failed) console.log(`  FALHOU ${f.name}: ${f.detail}`)
process.exit(failed.length ? 1 : 0)
