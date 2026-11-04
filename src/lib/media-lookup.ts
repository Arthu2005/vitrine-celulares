import { eq, inArray } from 'drizzle-orm'
import { db, schema } from './db'
import { toMediaItem } from './media-ingest'
import { publicUrl } from './storage'

export async function mediaUrl(id: string | null | undefined) {
  if (!id) return null
  const [row] = await db.select().from(schema.media).where(eq(schema.media.id, id))
  return row ? publicUrl(row.storageKey) : null
}

export async function mediaItems(ids: (string | null | undefined)[]) {
  const wanted = ids.filter((id): id is string => !!id)
  if (!wanted.length) return new Map<string, ReturnType<typeof toMediaItem>>()
  const rows = await db.select().from(schema.media).where(inArray(schema.media.id, wanted))
  return new Map(rows.map((r) => [r.id, toMediaItem(r)]))
}
