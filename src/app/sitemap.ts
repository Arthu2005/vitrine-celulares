import type { MetadataRoute } from 'next'
import { getCatalog } from '@/lib/catalog'
import { siteUrl } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()
  const { products, brands, collections } = await getCatalog()
  const used = new Set(products.map((p) => p.brand?.id))
  return [
    { url: base },
    { url: `${base}/celulares` },
    { url: `${base}/encontre` },
    { url: `${base}/loja` },
    ...brands.filter((b) => used.has(b.id)).map((b) => ({ url: `${base}/marca/${b.slug}` })),
    ...collections.filter((c) => c.productIds.length).map((c) => ({ url: `${base}/colecao/${c.slug}` })),
    ...products.filter((p) => !p.isDemo).map((p) => ({ url: `${base}/celulares/${p.slug}`, lastModified: p.publishedAt ? new Date(p.publishedAt) : undefined })),
  ]
}
