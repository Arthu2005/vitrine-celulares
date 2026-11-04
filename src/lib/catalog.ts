import { asc, eq, inArray } from 'drizzle-orm'
import { unstable_cache } from 'next/cache'
import { cache } from 'react'
import { db, schema } from './db'
import { toMediaItem } from './media-ingest'
import { publicUrl } from './storage'
import { STATIC_SITE } from './site-mode'
import { productInputSchema, type ProductInput } from './schemas'
import type { Availability, Condition } from './constants'
import type { Catalog, Product, Variant } from './types'

type ProductRow = typeof schema.products.$inferSelect
type MediaRow = typeof schema.media.$inferSelect

export type Lookups = {
  media: Map<string, MediaRow>
  brands: Map<string, typeof schema.brands.$inferSelect>
  categories: Map<string, typeof schema.categories.$inferSelect>
}

export async function loadLookups(): Promise<Lookups> {
  const [media, brands, categories] = await Promise.all([db.select().from(schema.media), db.select().from(schema.brands), db.select().from(schema.categories)])
  return {
    media: new Map(media.map((m) => [m.id, m])),
    brands: new Map(brands.map((b) => [b.id, b])),
    categories: new Map(categories.map((c) => [c.id, c])),
  }
}

type Compose = ProductInput & Pick<ProductRow, 'id' | 'isDemo' | 'publishedAt' | 'createdAt'>

/** Transforma os dados do formulário ou do banco no objeto que a vitrine exibe. */
export function compose(input: Compose, look: Lookups): Product {
  const brand = input.brandId ? look.brands.get(input.brandId) : undefined
  const category = input.categoryId ? look.categories.get(input.categoryId) : undefined
  const model = input.modelMediaId ? look.media.get(input.modelMediaId) : undefined
  const pick = (role: 'gallery' | 'spin') => input.media.filter((m) => m.role === role).flatMap((m) => {
    const row = look.media.get(m.mediaId)
    return row ? [toMediaItem(row, m.color)] : []
  })
  const variants: Variant[] = input.variants.map((v, i) => {
    const modelRow = v.modelMediaId ? look.media.get(v.modelMediaId) : undefined
    return {
      id: v.id ?? String(i),
      color: v.color,
      colorHex: v.colorHex,
      storage: v.storage,
      ram: v.ram,
      condition: v.condition as Condition | null,
      price: v.price,
      promoPrice: v.promoPrice,
      availability: v.availability as Availability,
      stock: v.stock,
      sku: v.sku,
      modelUrl: modelRow ? publicUrl(modelRow.storageKey) : null,
    }
  })
  return {
    id: input.id,
    slug: input.slug,
    name: input.name,
    brand: brand ? { id: brand.id, name: brand.name, slug: brand.slug } : null,
    category: category ? { id: category.id, name: category.name, slug: category.slug, isAccessory: category.isAccessory } : null,
    model: input.model,
    sku: input.sku,
    shortDescription: input.shortDescription,
    description: input.description,
    condition: input.condition,
    conditionNotes: input.conditionNotes,
    availability: input.availability,
    stock: input.stock,
    warranty: input.warranty,
    price: input.price,
    promoPrice: input.promoPrice,
    hidePrice: input.hidePrice,
    highlights: input.highlights,
    specs: Object.fromEntries(Object.entries(input.specs).filter(([, v]) => v)),
    customAttrs: input.customAttrs,
    goodFor: input.goodFor,
    isNew: input.isNew,
    isFeatured: input.isFeatured,
    isDemo: input.isDemo,
    model3d: model ? { url: publicUrl(model.storageKey), tintMaterial: input.modelTintMaterial, illustrative: input.modelIllustrative } : null,
    hotspots: input.hotspots,
    media: pick('gallery'),
    spin: pick('spin').map((m) => m.url),
    variants,
    accessoryIds: input.accessoryIds,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    publishedAt: input.publishedAt,
    createdAt: input.createdAt,
  }
}

type Children = {
  variants: (typeof schema.productVariants.$inferSelect)[]
  media: (typeof schema.productMedia.$inferSelect)[]
  accessories: (typeof schema.accessoryLinks.$inferSelect)[]
  collections: (typeof schema.collectionProducts.$inferSelect)[]
}

export function rowToInput(row: ProductRow, c: Children): ProductInput {
  return productInputSchema.parse({
    ...row,
    variants: c.variants.filter((v) => v.productId === row.id).sort((a, b) => a.sortOrder - b.sortOrder),
    media: c.media.filter((m) => m.productId === row.id).sort((a, b) => a.sortOrder - b.sortOrder).map(({ mediaId, role, color }) => ({ mediaId, role, color })),
    accessoryIds: c.accessories.filter((a) => a.productId === row.id).map((a) => a.accessoryId),
    collectionIds: c.collections.filter((x) => x.productId === row.id).map((x) => x.collectionId),
  })
}

async function loadChildren(ids?: string[]): Promise<Children> {
  const scope = <T,>(table: { productId: never }) => (ids ? inArray(table.productId, ids) : undefined) as T
  const [variants, media, accessories, collections] = await Promise.all([
    db.select().from(schema.productVariants).where(scope(schema.productVariants as never)),
    db.select().from(schema.productMedia).where(scope(schema.productMedia as never)),
    db.select().from(schema.accessoryLinks).where(scope(schema.accessoryLinks as never)),
    db.select().from(schema.collectionProducts).where(scope(schema.collectionProducts as never)),
  ])
  return { variants, media, accessories, collections }
}

async function loadCatalog(): Promise<Catalog> {
  const [rows, children, look, collections] = await Promise.all([
    db.select().from(schema.products).where(eq(schema.products.status, 'published')),
    loadChildren(),
    loadLookups(),
    db.select().from(schema.collections).orderBy(asc(schema.collections.sortOrder)),
  ])
  const products = rows.filter((r) => r.visible).map((r) => compose({ ...rowToInput(r, children), id: r.id, isDemo: r.isDemo, publishedAt: r.publishedAt, createdAt: r.createdAt }, look))
  const published = new Set(products.map((p) => p.id))
  const byOrder = <T extends { sortOrder: number }>(a: T, b: T) => a.sortOrder - b.sortOrder
  return {
    products,
    brands: [...look.brands.values()].sort(byOrder).map(({ id, name, slug, showInNav }) => ({ id, name, slug, showInNav })),
    categories: [...look.categories.values()].sort(byOrder).map(({ id, name, slug, showInNav, isAccessory }) => ({ id, name, slug, showInNav, isAccessory })),
    collections: collections
      .filter((c) => c.visible)
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        productIds: children.collections.filter((x) => x.collectionId === c.id).sort(byOrder).map((x) => x.productId).filter((id) => published.has(id)),
      })),
  }
}

export const getCatalog = cache(unstable_cache(loadCatalog, ['catalog-v1'], { tags: ['catalog'], revalidate: STATIC_SITE ? false : 60 }))

/** Telefones públicos: acessórios ficam fora do catálogo principal, comparador e recomendações. */
export const phones = (c: Catalog) => c.products.filter((p) => !p.category?.isAccessory)

export async function getEditableProduct(id: string) {
  const [row] = await db.select().from(schema.products).where(eq(schema.products.id, id))
  if (!row) return null
  const children = await loadChildren([id])
  const saved = rowToInput(row, children)
  const draft = row.draftJson ? productInputSchema.safeParse(row.draftJson) : null
  return { row, input: draft?.success ? draft.data : saved, hasPendingDraft: !!draft?.success }
}

export async function getPreviewProduct(id: string) {
  const data = await getEditableProduct(id)
  if (!data) return null
  const look = await loadLookups()
  return compose({ ...data.input, id, isDemo: data.row.isDemo, publishedAt: data.row.publishedAt, createdAt: data.row.createdAt }, look)
}
