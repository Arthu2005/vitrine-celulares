import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'

// Imita o GitHub Pages para testar out/ localmente: mesma subpasta, pasta/index.html e 404.html.
const BASE = `/${process.env.PAGES_REPO || 'vitrine-celulares'}`
const PORT = Number(process.env.PORT || 4100)
const TYPES: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm' }

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost')
  if (!url.pathname.startsWith(BASE)) {
    res.writeHead(404).end('fora do site')
    return
  }
  const rel = normalize(decodeURIComponent(url.pathname.slice(BASE.length))).replace(/^([/\\])+/, '')
  let file = join('out', rel)
  if (existsSync(file) && statSync(file).isDirectory()) {
    if (!url.pathname.endsWith('/')) {
      res.writeHead(301, { location: `${url.pathname}/${url.search}` }).end()
      return
    }
    file = join(file, 'index.html')
  }
  const found = existsSync(file) && statSync(file).isFile()
  const target = found ? file : join('out', '404.html')
  res.writeHead(found ? 200 : 404, { 'content-type': TYPES[extname(target)] ?? 'application/octet-stream' })
  createReadStream(target).pipe(res)
}).listen(PORT, () => console.log(`http://localhost:${PORT}${BASE}/`))
