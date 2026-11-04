import { execSync } from 'node:child_process'
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import './env'

/**
 * Gera a versão estática da vitrine em out/, para o GitHub Pages.
 * Rotas que dependem de servidor saem do caminho durante o build e voltam no final, mesmo em caso de erro.
 * Os dados são os do banco local: rode "npm run setup" antes.
 */

const HOLD = '.pages-hold'
const SERVER_ONLY = ['src/app/admin', 'src/app/api', 'src/app/media', 'src/app/(site)/preview', 'src/app/sitemap.ts', 'src/app/robots.ts', 'src/proxy.ts']
const DYNAMIC_ROUTES = ['celulares', 'marca', 'categoria', 'colecao'].map((r) => `src/app/(site)/${r}/[slug]/page.tsx`)
const MEDIA = 'public/media'
const storage = process.env.STORAGE_LOCAL_DIR || './storage'

const repo = process.env.PAGES_REPO || 'vitrine-celulares'
const owner = (process.env.PAGES_OWNER || 'arthu2005').toLowerCase()
const basePath = `/${repo}`

if (!existsSync(storage)) throw new Error('Pasta de arquivos não encontrada. Rode "npm run setup" antes.')
if (existsSync(HOLD)) throw new Error(`${HOLD} já existe: um build anterior foi interrompido. Devolva os arquivos antes de continuar.`)

/** O export grava __next.X/a/b.txt, mas o navegador pede __next.X.a.b.txt ao pré-carregar páginas. */
function flattenSegments(dir: string) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (!statSync(path).isDirectory()) continue
    if (entry === '_next') continue
    if (!entry.startsWith('__next.')) {
      flattenSegments(path)
      continue
    }
    const walk = (current: string, prefix: string) => {
      for (const item of readdirSync(current)) {
        const full = join(current, item)
        if (statSync(full).isDirectory()) walk(full, `${prefix}.${item}`)
        else copyFileSync(full, join(dir, `${prefix}.${item}`))
      }
    }
    walk(path, entry)
    rmSync(path, { recursive: true })
  }
}

const moved: string[] = []
const originals = new Map<string, string>()
try {
  // O Next exige valor literal em "dynamic": no export, estas rotas precisam ser estáticas.
  for (const path of DYNAMIC_ROUTES) {
    const source = readFileSync(path, 'utf8')
    if (!source.includes("export const dynamic = 'force-dynamic'")) throw new Error(`Marcação não encontrada em ${path}`)
    originals.set(path, source)
    writeFileSync(path, source.replace("export const dynamic = 'force-dynamic'", "export const dynamic = 'force-static'"))
  }
  for (const path of SERVER_ONLY) {
    const target = join(HOLD, path)
    mkdirSync(dirname(target), { recursive: true })
    renameSync(path, target)
    moved.push(path)
  }
  cpSync(join(storage, 'images'), join(MEDIA, 'images'), { recursive: true })
  cpSync(join(storage, 'models'), join(MEDIA, 'models'), { recursive: true })
  rmSync('.next', { recursive: true, force: true })
  rmSync('out', { recursive: true, force: true })
  execSync('npx next build', {
    stdio: 'inherit',
    env: {
      ...process.env,
      NEXT_PUBLIC_STATIC_SITE: '1',
      NEXT_PUBLIC_BASE_PATH: basePath,
      NEXT_PUBLIC_SITE_URL: `https://${owner}.github.io${basePath}`,
    },
  })
  flattenSegments('out')
  writeFileSync('out/.nojekyll', '')
  console.log(`Versão estática pronta em out/ para https://${owner}.github.io${basePath}/`)
} finally {
  for (const [path, source] of originals) writeFileSync(path, source)
  for (const path of moved.reverse()) renameSync(join(HOLD, path), path)
  rmSync(HOLD, { recursive: true, force: true })
  rmSync(MEDIA, { recursive: true, force: true })
}
