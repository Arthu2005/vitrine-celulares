import { createReadStream, promises as fs } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import { Readable } from 'node:stream'
import { AwsClient } from 'aws4fetch'
import { and, eq, sql } from 'drizzle-orm'
import { db, schema } from './db'
import { BASE_PATH } from './site-mode'

const driver = () => process.env.STORAGE_DRIVER || 'local'
const localRoot = () => resolve(/*turbopackIgnore: true*/ process.env.STORAGE_LOCAL_DIR || './storage')
// Cada resposta do banco remoto tem limite de tamanho, então o arquivo é gravado em partes.
const CHUNK_SIZE = 512 * 1024

export function safeLocalPath(key: string) {
  const root = localRoot()
  const full = resolve(join(/*turbopackIgnore: true*/ root, key))
  if (!full.startsWith(root + sep)) throw new Error('Caminho inválido')
  return full
}

const s3 = () =>
  new AwsClient({
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    service: 's3',
    region: process.env.S3_REGION || 'auto',
  })

const s3Url = (key: string) => `${process.env.S3_ENDPOINT!.replace(/\/$/, '')}/${process.env.S3_BUCKET}/${key}`

const removeChunks = (key: string) => db.delete(schema.mediaChunks).where(eq(schema.mediaChunks.key, key))

async function putChunks(key: string, body: Buffer) {
  await removeChunks(key)
  try {
    for (let offset = 0, part = 0; offset < body.length; offset += CHUNK_SIZE, part++) {
      await db.insert(schema.mediaChunks).values({ key, part, data: body.subarray(offset, offset + CHUNK_SIZE) })
    }
  } catch (error) {
    await removeChunks(key)
    throw error
  }
}

export async function putObject(key: string, body: Buffer, contentType: string) {
  if (driver() === 'database') return putChunks(key, body)
  if (driver() === 's3') {
    const res = await s3().fetch(s3Url(key), {
      method: 'PUT',
      body: new Uint8Array(body),
      headers: { 'content-type': contentType, 'cache-control': 'public, max-age=31536000, immutable' },
    })
    if (!res.ok) throw new Error(`Falha ao enviar para o armazenamento (${res.status})`)
    return
  }
  const path = safeLocalPath(key)
  await fs.mkdir(dirname(path), { recursive: true })
  await fs.writeFile(path, body)
}

export async function removeObject(key: string) {
  if (driver() === 'database') {
    await removeChunks(key)
    return
  }
  if (driver() === 's3') {
    await s3().fetch(s3Url(key), { method: 'DELETE' })
    return
  }
  await fs.rm(safeLocalPath(key), { force: true })
}

/** Tamanho do arquivo servido por /media, ou null se ele não existir. */
export async function objectSize(key: string) {
  if (driver() === 'database') {
    const [row] = await db.select({ size: sql<number | null>`sum(length(${schema.mediaChunks.data}))` }).from(schema.mediaChunks).where(eq(schema.mediaChunks.key, key))
    return row?.size ?? null
  }
  try {
    return (await fs.stat(safeLocalPath(key))).size
  } catch {
    return null
  }
}

async function* readChunks(key: string, start: number, end: number) {
  const first = Math.floor(start / CHUNK_SIZE)
  const last = Math.floor(end / CHUNK_SIZE)
  for (let part = first; part <= last; part++) {
    const [row] = await db.select({ data: schema.mediaChunks.data }).from(schema.mediaChunks).where(and(eq(schema.mediaChunks.key, key), eq(schema.mediaChunks.part, part)))
    if (!row) throw new Error(`Parte ${part} de ${key} não encontrada`)
    yield row.data.subarray(part === first ? start % CHUNK_SIZE : 0, part === last ? (end % CHUNK_SIZE) + 1 : undefined)
  }
}

export function objectStream(key: string, start: number, end: number) {
  const stream = driver() === 'database' ? Readable.from(readChunks(key, start, end), { objectMode: false }) : createReadStream(safeLocalPath(key), { start, end })
  return Readable.toWeb(stream) as ReadableStream
}

export function publicUrl(key: string) {
  if (driver() === 's3') return `${process.env.S3_PUBLIC_URL!.replace(/\/$/, '')}/${key}`
  return `${BASE_PATH}/media/${key}`
}
