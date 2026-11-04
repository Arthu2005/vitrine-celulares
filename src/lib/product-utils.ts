import { CONDITIONS, specField } from './constants'
import type { Product, Variant } from './types'
import { norm, num } from './format'

export type PriceInfo = { hidden: boolean; current: number | null; original: number | null; from: boolean; onSale: boolean }

const effective = (v: { price: number | null; promoPrice: number | null }) => v.promoPrice ?? v.price

export function priceInfo(p: Product, variant?: Variant | null): PriceInfo {
  if (p.hidePrice) return { hidden: true, current: null, original: null, from: false, onSale: false }
  if (variant && (variant.price != null || variant.promoPrice != null)) {
    const current = effective(variant)
    return { hidden: false, current, original: variant.promoPrice != null ? variant.price : null, from: false, onSale: variant.promoPrice != null }
  }
  const priced = p.variants.filter((v) => effective(v) != null)
  if (priced.length) {
    const min = priced.reduce((a, b) => (effective(a)! <= effective(b)! ? a : b))
    const distinct = new Set(priced.map(effective)).size > 1
    return { hidden: false, current: effective(min), original: min.promoPrice != null ? min.price : null, from: distinct, onSale: min.promoPrice != null }
  }
  const current = effective(p)
  return { hidden: current == null, current, original: p.promoPrice != null ? p.price : null, from: false, onSale: p.promoPrice != null }
}

export const unique = (items: string[]) => [...new Set(items.filter(Boolean))]

const orSpec = (fromVariants: string[], spec: string | undefined) => {
  const values = unique(fromVariants)
  return values.length ? values : spec ? [`${spec} GB`] : []
}

export const storages = (p: Product) => orSpec(p.variants.map((v) => v.storage), p.specs.armazenamento)
export const rams = (p: Product) => orSpec(p.variants.map((v) => v.ram), p.specs.ram)
export const colors = (p: Product) => {
  const seen = new Map<string, string>()
  for (const v of p.variants) if (v.color && !seen.has(v.color)) seen.set(v.color, v.colorHex)
  return [...seen].map(([name, hex]) => ({ name, hex }))
}

export const primaryImage = (p: Product) => p.media.find((m) => m.kind === 'image') ?? null

export const specValue = (p: Product, key: string) => {
  const raw = p.specs[key]
  if (!raw) return ''
  const field = specField(key)
  return field?.unit && /^[\d.,]+$/.test(raw.trim()) ? `${raw} ${field.unit}` : raw
}

export const isAvailable = (p: Product) => p.availability !== 'indisponivel' || p.variants.some((v) => v.availability !== 'indisponivel')

export const searchText = (p: Product) =>
  norm(
    [
      p.name,
      p.model,
      p.sku,
      p.brand?.name,
      p.category?.name,
      p.shortDescription,
      CONDITIONS[p.condition],
      ...p.highlights,
      ...p.variants.flatMap((v) => [v.color, v.storage, v.ram]),
      ...Object.entries(p.specs).flatMap(([k, v]) => [specField(k)?.label ?? k, v, specField(k)?.unit]),
      ...p.customAttrs.flatMap((a) => [a.label, a.value]),
    ]
      .filter(Boolean)
      .join(' '),
  )

export const numericSpec = (p: Product, key: string) => num(p.specs[key])
