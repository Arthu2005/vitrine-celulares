import { eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { db, schema } from './db'
import type { ProductInput } from './schemas'

/** Grava o produto e seus filhos numa transação. Usado pelo painel e pela carga de demonstração. */
export async function writeProduct(id: string, input: ProductInput, opts: { status: 'draft' | 'published'; isDemo?: boolean; publishedAt?: number | null }) {
  const { variants, media, accessoryIds, collectionIds, ...fields } = input
  const values = { ...fields, status: opts.status, publishedAt: opts.publishedAt ?? null, draftJson: null }
  await db.transaction(async (tx) => {
    await tx
      .insert(schema.products)
      .values({ id, ...values, isDemo: opts.isDemo ?? false })
      .onConflictDoUpdate({ target: schema.products.id, set: { ...values, updatedAt: Date.now() } })
    await tx.delete(schema.productVariants).where(eq(schema.productVariants.productId, id))
    await tx.delete(schema.productMedia).where(eq(schema.productMedia.productId, id))
    await tx.delete(schema.accessoryLinks).where(eq(schema.accessoryLinks.productId, id))
    await tx.delete(schema.collectionProducts).where(eq(schema.collectionProducts.productId, id))
    if (variants.length) {
      await tx.insert(schema.productVariants).values(variants.map((v, sortOrder) => ({ ...v, id: v.id || randomUUID(), productId: id, sortOrder })))
    }
    if (media.length) {
      const seen = new Set<string>()
      const unique = media.filter((m) => {
        const key = `${m.mediaId}|${m.role}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      await tx.insert(schema.productMedia).values(unique.map((m, sortOrder) => ({ ...m, productId: id, sortOrder })))
    }
    if (accessoryIds.length) await tx.insert(schema.accessoryLinks).values(accessoryIds.map((accessoryId) => ({ productId: id, accessoryId })))
    if (collectionIds.length) await tx.insert(schema.collectionProducts).values(collectionIds.map((collectionId, sortOrder) => ({ collectionId, productId: id, sortOrder })))
  })
}

export async function deleteProductRows(id: string) {
  await db.transaction(async (tx) => {
    await tx.delete(schema.productVariants).where(eq(schema.productVariants.productId, id))
    await tx.delete(schema.productMedia).where(eq(schema.productMedia.productId, id))
    await tx.delete(schema.accessoryLinks).where(eq(schema.accessoryLinks.productId, id))
    await tx.delete(schema.accessoryLinks).where(eq(schema.accessoryLinks.accessoryId, id))
    await tx.delete(schema.collectionProducts).where(eq(schema.collectionProducts.productId, id))
    await tx.delete(schema.products).where(eq(schema.products.id, id))
  })
}
