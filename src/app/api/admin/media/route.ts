import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { audit, getCurrentUser } from '@/lib/auth'
import { LIMITS } from '@/lib/constants'
import { db, schema } from '@/lib/db'
import { ingest, UploadError } from '@/lib/media-ingest'
import { publicUrl, removeObject } from '@/lib/storage'

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Sessão expirada. Entre novamente.' }, { status: 401 })

  const origin = req.headers.get('origin')
  if (origin && new URL(origin).host !== req.headers.get('host')) return NextResponse.json({ error: 'Origem não permitida.' }, { status: 403 })

  const declared = Number(req.headers.get('content-length') ?? 0)
  if (declared > LIMITS.video + 1024 * 1024) return NextResponse.json({ error: 'Arquivo grande demais.' }, { status: 413 })

  let file: File | null
  let replaceId: string | null
  try {
    const form = await req.formData()
    file = form.get('file') as File | null
    replaceId = form.get('replaceId') as string | null
  } catch {
    return NextResponse.json({ error: 'Não foi possível receber o arquivo.' }, { status: 400 })
  }
  if (!file || typeof file === 'string') return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    let row = await ingest(buffer, file.name)

    if (replaceId) {
      // Substituir mantém o mesmo identificador: todos os produtos que usam o arquivo passam a exibir o novo.
      const [old] = await db.select().from(schema.media).where(eq(schema.media.id, replaceId))
      if (!old) throw new UploadError('Arquivo original não encontrado.')
      if (old.kind !== row.kind) {
        for (const key of new Set([row.storageKey, ...Object.values(row.variants ?? {})])) await removeObject(key)
        await db.delete(schema.media).where(eq(schema.media.id, row.id))
        throw new UploadError('O novo arquivo precisa ser do mesmo tipo do original.')
      }
      for (const key of new Set([old.storageKey, ...Object.values(old.variants ?? {})])) await removeObject(key)
      const { id: _new, createdAt: _c, updatedAt: _u, alt: _a, ...next } = row
      await db.delete(schema.media).where(eq(schema.media.id, row.id))
      await db.update(schema.media).set(next).where(eq(schema.media.id, replaceId))
      ;[row] = await db.select().from(schema.media).where(eq(schema.media.id, replaceId))
    }

    await audit(user.name, `${replaceId ? 'Substituiu' : 'Enviou'} o arquivo ${row.name}`)
    return NextResponse.json({
      id: row.id,
      kind: row.kind,
      name: row.name,
      size: row.size,
      url: publicUrl(row.variants?.['480'] ?? row.storageKey),
      fullUrl: publicUrl(row.storageKey),
      alt: row.alt,
      meta: row.meta,
      width: row.width,
      height: row.height,
    })
  } catch (error) {
    if (error instanceof UploadError) return NextResponse.json({ error: error.message }, { status: 422 })
    console.error('Falha no envio:', error)
    return NextResponse.json({ error: 'Falha ao salvar o arquivo. Tente de novo.' }, { status: 500 })
  }
}
