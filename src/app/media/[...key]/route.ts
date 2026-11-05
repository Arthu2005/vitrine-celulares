import { extname } from 'node:path'
import { objectSize, objectStream } from '@/lib/storage'

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
  const size = await objectSize(relative)
  if (size === null) return new Response('Não encontrado', { status: 404 })
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
    return new Response(objectStream(relative, start, end), {
      status: 206,
      headers: { ...headers, 'content-range': `bytes ${start}-${end}/${size}`, 'content-length': String(end - start + 1) },
    })
  }
  return new Response(objectStream(relative, 0, size - 1), { headers: { ...headers, 'content-length': String(size) } })
}
