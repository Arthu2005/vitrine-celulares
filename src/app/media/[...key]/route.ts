import { promises as fs, createReadStream } from 'node:fs'
import { extname } from 'node:path'
import { Readable } from 'node:stream'
import { safeLocalPath } from '@/lib/storage'

const TYPES: Record<string, string> = {
  '.webp': 'image/webp',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
}

export async function GET(req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params
  const relative = key.join('/')
  const type = TYPES[extname(relative)]
  if (!type) return new Response('Não encontrado', { status: 404 })
  let path: string
  let size: number
  try {
    path = safeLocalPath(relative)
    size = (await fs.stat(path)).size
  } catch {
    return new Response('Não encontrado', { status: 404 })
  }
  const headers: Record<string, string> = {
    'content-type': type,
    'cache-control': 'public, max-age=31536000, immutable',
    'accept-ranges': 'bytes',
    'x-content-type-options': 'nosniff',
  }
  const range = req.headers.get('range')?.match(/bytes=(\d+)-(\d*)/)
  if (range) {
    const start = Number(range[1])
    const end = Math.min(range[2] ? Number(range[2]) : size - 1, size - 1)
    if (start > end) return new Response(null, { status: 416, headers: { 'content-range': `bytes */${size}` } })
    return new Response(Readable.toWeb(createReadStream(path, { start, end })) as ReadableStream, {
      status: 206,
      headers: { ...headers, 'content-range': `bytes ${start}-${end}/${size}`, 'content-length': String(end - start + 1) },
    })
  }
  return new Response(Readable.toWeb(createReadStream(path)) as ReadableStream, { headers: { ...headers, 'content-length': String(size) } })
}
