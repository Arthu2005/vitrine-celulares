import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { db, schema } from './db'
import { frameIssues, type FrameQuality } from './capture-quality'
import { LIMITS } from './constants'
import { measureFrame } from './image-quality'
import { publicUrl, putObject } from './storage'
import type { MediaItem } from './types'

export class UploadError extends Error {}

const IMAGE_WIDTHS = [480, 960, 1600]

type Sniffed = { kind: 'image' | 'video' | 'model-glb' | 'model-gltf'; mime: string; ext: string }

/** Decide o tipo pelos bytes do arquivo. Nome e content-type enviados pelo navegador não são confiáveis. */
export function sniff(b: Buffer): Sniffed | null {
  if (b.length < 12) return null
  const ascii = (start: number, end: number) => b.toString('latin1', start, end)
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { kind: 'image', mime: 'image/jpeg', ext: 'jpg' }
  if (ascii(1, 4) === 'PNG') return { kind: 'image', mime: 'image/png', ext: 'png' }
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return { kind: 'image', mime: 'image/webp', ext: 'webp' }
  if (ascii(4, 8) === 'ftyp') {
    const brand = ascii(8, 12)
    if (brand === 'avif' || brand === 'avis') return { kind: 'image', mime: 'image/avif', ext: 'avif' }
    if (/^(hei|hev|mif)/.test(brand)) throw new UploadError('Fotos HEIC do iPhone não são aceitas. Envie em JPG ou escolha "Mais compatível" nos ajustes da câmera.')
    return { kind: 'video', mime: 'video/mp4', ext: 'mp4' }
  }
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return { kind: 'video', mime: 'video/webm', ext: 'webm' }
  if (ascii(0, 4) === 'glTF') return { kind: 'model-glb', mime: 'model/gltf-binary', ext: 'glb' }
  const head = ascii(0, 200).trimStart()
  if (head.startsWith('{') && head.includes('"asset"')) return { kind: 'model-gltf', mime: 'model/gltf+json', ext: 'gltf' }
  return null
}

type Gltf = {
  asset?: { version?: string }
  meshes?: { primitives: { indices?: number; attributes: { POSITION?: number } }[] }[]
  accessors?: { count: number }[]
  materials?: { name?: string }[]
  buffers?: { uri?: string }[]
  images?: { uri?: string }[]
  extensionsRequired?: string[]
}

function inspectGltf(json: Gltf, size: number) {
  if (!json.asset?.version?.startsWith('2')) throw new UploadError('Somente modelos glTF 2.0 são aceitos.')
  const unsupported = (json.extensionsRequired ?? []).filter((e) => !['KHR_draco_mesh_compression', 'EXT_meshopt_compression', 'KHR_mesh_quantization', 'KHR_texture_transform', 'KHR_texture_basisu'].includes(e))
  if (unsupported.includes('KHR_texture_basisu')) throw new UploadError('Texturas KTX2 não são suportadas neste visualizador.')
  if (unsupported.length) throw new UploadError(`O modelo exige recursos não suportados: ${unsupported.join(', ')}.`)
  let triangles = 0
  for (const mesh of json.meshes ?? []) {
    for (const prim of mesh.primitives) {
      const accessor = prim.indices != null ? json.accessors?.[prim.indices] : json.accessors?.[prim.attributes.POSITION ?? -1]
      triangles += Math.round((accessor?.count ?? 0) / 3)
    }
  }
  if (!json.meshes?.length) throw new UploadError('O arquivo não contém nenhuma malha 3D.')
  const warnings: string[] = []
  if (size > LIMITS.modelSoft) warnings.push(`Arquivo pesado (${(size / 1048576).toFixed(1)} MB): pode demorar em celulares. Recomendado: até 8 MB.`)
  if (triangles > LIMITS.modelTriangles) warnings.push(`Muitos polígonos (${triangles.toLocaleString('pt-BR')}): pode travar em aparelhos intermediários.`)
  return {
    triangles,
    meshes: json.meshes.length,
    materials: (json.materials ?? []).map((m) => m.name ?? '').filter(Boolean),
    warnings,
  }
}

function parseGlb(b: Buffer) {
  const version = b.readUInt32LE(4)
  if (version !== 2) throw new UploadError('Somente modelos glTF 2.0 são aceitos.')
  const declared = b.readUInt32LE(8)
  if (declared !== b.length) throw new UploadError('O arquivo GLB está incompleto ou corrompido.')
  const chunkLength = b.readUInt32LE(12)
  if (b.readUInt32LE(16) !== 0x4e4f534a) throw new UploadError('O arquivo GLB está corrompido.')
  try {
    return JSON.parse(b.toString('utf8', 20, 20 + chunkLength)) as Gltf
  } catch {
    throw new UploadError('O arquivo GLB está corrompido.')
  }
}

function parseGltfJson(b: Buffer) {
  let json: Gltf
  try {
    json = JSON.parse(b.toString('utf8'))
  } catch {
    throw new UploadError('O arquivo glTF não é um JSON válido.')
  }
  const external = [...(json.buffers ?? []), ...(json.images ?? [])].some((item) => item.uri && !item.uri.startsWith('data:'))
  if (external) throw new UploadError('Este glTF depende de arquivos externos. Exporte como GLB, que reúne tudo em um único arquivo.')
  return json
}

export type IngestResult = typeof schema.media.$inferSelect

export async function ingest(buffer: Buffer, fileName: string, opts: { isDemo?: boolean; replaceId?: string; alt?: string } = {}): Promise<IngestResult> {
  const type = sniff(buffer)
  if (!type) throw new UploadError('Formato não aceito. Use JPG, PNG, WebP, AVIF, MP4, WebM, GLB ou glTF.')
  const id = randomUUID()
  const name = fileName.replace(/[^\p{L}\p{N}._ -]/gu, '_').slice(0, 120) || 'arquivo'

  const base = { id, name, size: buffer.length, isDemo: opts.isDemo ?? false, alt: opts.alt ?? '' }
  let row: typeof schema.media.$inferInsert

  if (type.kind === 'image') {
    if (buffer.length > LIMITS.image) throw new UploadError('Imagem acima de 15 MB.')
    let width: number
    let height: number
    const variants: Record<string, string> = {}
    let quality: FrameQuality | null = null
    try {
      const pipeline = sharp(buffer, { limitInputPixels: 64_000_000 }).rotate()
      const meta = await pipeline.metadata()
      const swap = (meta.orientation ?? 1) >= 5
      width = (swap ? meta.height : meta.width) ?? 0
      height = (swap ? meta.width : meta.height) ?? 0
      quality = await measureFrame(pipeline, width, height)
      for (const w of IMAGE_WIDTHS) {
        if (w > width && w !== IMAGE_WIDTHS[0]) continue
        const output = await pipeline.clone().resize({ width: Math.min(w, width), withoutEnlargement: true }).webp({ quality: 82, alphaQuality: 92 }).toBuffer()
        const key = `images/${id}/${w}.webp`
        await putObject(key, output, 'image/webp')
        variants[w] = key
      }
    } catch (error) {
      if (error instanceof UploadError) throw error
      throw new UploadError('Não foi possível ler esta imagem. O arquivo pode estar corrompido.')
    }
    const largest = Object.keys(variants).map(Number).sort((a, b) => b - a)[0]
    const warnings = quality ? frameIssues(quality) : []
    row = { ...base, kind: 'image', mime: 'image/webp', width, height, variants, storageKey: variants[largest], meta: { quality, warnings } }
  } else if (type.kind === 'video') {
    if (buffer.length > LIMITS.video) throw new UploadError('Vídeo acima de 100 MB.')
    const key = `videos/${id}.${type.ext}`
    await putObject(key, buffer, type.mime)
    row = { ...base, kind: 'video', mime: type.mime, storageKey: key }
  } else {
    if (buffer.length > LIMITS.model) throw new UploadError('Modelo 3D acima de 30 MB.')
    const json = type.kind === 'model-glb' ? parseGlb(buffer) : parseGltfJson(buffer)
    const meta = inspectGltf(json, buffer.length)
    const key = `models/${id}.${type.ext}`
    await putObject(key, buffer, type.mime)
    row = { ...base, kind: 'model', mime: type.mime, storageKey: key, meta }
  }

  const [saved] = await db.insert(schema.media).values(row).returning()
  return saved
}

export function toMediaItem(row: typeof schema.media.$inferSelect, color?: string): MediaItem {
  const variants = row.variants ?? {}
  const entries = Object.entries(variants).sort((a, b) => Number(a[0]) - Number(b[0]))
  return {
    id: row.id,
    kind: row.kind,
    url: publicUrl(row.storageKey),
    srcSet: entries.length ? entries.map(([w, key]) => `${publicUrl(key)} ${Math.min(Number(w), row.width ?? Number(w))}w`).join(', ') : undefined,
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    alt: row.alt,
    color: color || undefined,
  }
}
