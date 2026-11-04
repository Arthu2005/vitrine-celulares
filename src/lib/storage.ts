import { createReadStream, promises as fs } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import { AwsClient } from 'aws4fetch'
import { BASE_PATH } from './site-mode'

const driver = () => process.env.STORAGE_DRIVER || 'local'
const localRoot = () => resolve(/*turbopackIgnore: true*/ process.env.STORAGE_LOCAL_DIR || './storage')

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

export async function putObject(key: string, body: Buffer, contentType: string) {
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
  if (driver() === 's3') {
    await s3().fetch(s3Url(key), { method: 'DELETE' })
    return
  }
  await fs.rm(safeLocalPath(key), { force: true })
}

export function publicUrl(key: string) {
  if (driver() === 's3') return `${process.env.S3_PUBLIC_URL!.replace(/\/$/, '')}/${key}`
  return `${BASE_PATH}/media/${key}`
}

export { createReadStream }
