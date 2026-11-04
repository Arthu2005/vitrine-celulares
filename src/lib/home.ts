import { priceInfo } from './product-utils'
import type { Block } from './schemas'
import type { Catalog, Product } from './types'
import { phones } from './catalog'

export function railProducts(block: Extract<Block, { type: 'rail' }>, catalog: Catalog): Product[] {
  const list = phones(catalog)
  const byId = new Map(catalog.products.map((p) => [p.id, p]))
  const tagged = (tag: string) => list.filter((p) => p.goodFor.includes(tag))
  let out: Product[]
  switch (block.source) {
    case 'manual':
      out = block.productIds.flatMap((id) => byId.get(id) ?? [])
      break
    case 'novidades':
      out = list.filter((p) => p.isNew)
      break
    case 'ofertas':
      out = list.filter((p) => priceInfo(p).onSale || p.variants.some((v) => v.promoPrice != null))
      break
    case 'recentes':
      out = [...list].sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0))
      break
    case 'premium':
      out = [...list].sort((a, b) => (priceInfo(b).current ?? 0) - (priceInfo(a).current ?? 0))
      break
    case 'colecao':
      out = (catalog.collections.find((c) => c.id === block.collectionId)?.productIds ?? []).flatMap((id) => byId.get(id) ?? [])
      break
    case 'destaques':
      out = list.filter((p) => p.isFeatured)
      break
    default:
      out = tagged(block.source)
  }
  return out.slice(0, block.limit)
}
