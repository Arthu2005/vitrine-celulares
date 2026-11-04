import { asc, eq } from 'drizzle-orm'
import type { MediaRow } from '@/app/admin/types'
import { db, schema } from './db'
import type { ProductInput } from './schemas'
import { publicUrl } from './storage'

export async function editorOptions() {
  const [brands, categories, collections, products] = await Promise.all([
    db.select({ id: schema.brands.id, name: schema.brands.name }).from(schema.brands).orderBy(asc(schema.brands.sortOrder)),
    db.select({ id: schema.categories.id, name: schema.categories.name, isAccessory: schema.categories.isAccessory }).from(schema.categories).orderBy(asc(schema.categories.sortOrder)),
    db.select({ id: schema.collections.id, name: schema.collections.name }).from(schema.collections).orderBy(asc(schema.collections.sortOrder)),
    db.select({ id: schema.products.id, name: schema.products.name, categoryId: schema.products.categoryId }).from(schema.products).where(eq(schema.products.status, 'published')),
  ])
  const accessoryCats = new Set(categories.filter((c) => c.isAccessory).map((c) => c.id))
  return { brands, categories, collections, accessories: products.filter((p) => p.categoryId && accessoryCats.has(p.categoryId)).map(({ id, name }) => ({ id, name })) }
}

export async function mediaLookup(input: ProductInput) {
  const wanted = new Set([...input.media.map((m) => m.mediaId), input.modelMediaId].filter(Boolean) as string[])
  const rows = await db.select().from(schema.media)
  const out: Record<string, MediaRow> = {}
  for (const m of rows) {
    if (!wanted.has(m.id)) continue
    out[m.id] = { id: m.id, kind: m.kind, name: m.name, size: m.size, url: publicUrl(m.variants?.['480'] ?? m.storageKey), fullUrl: publicUrl(m.storageKey), alt: m.alt, meta: m.meta, width: m.width, height: m.height }
  }
  return out
}
