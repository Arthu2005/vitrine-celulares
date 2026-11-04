import type { Availability, Condition } from './constants'

export type MediaItem = {
  id: string
  kind: 'image' | 'video' | 'model'
  url: string
  srcSet?: string
  width?: number
  height?: number
  alt: string
  color?: string
}

export type Variant = {
  id: string
  color: string
  colorHex: string
  storage: string
  ram: string
  condition: Condition | null
  price: number | null
  promoPrice: number | null
  availability: Availability
  stock: number | null
  sku: string
  modelUrl: string | null
}

export type Hotspot = {
  id: string
  label: string
  text: string
  position: [number, number, number]
  normal: [number, number, number]
}

export type Ref = { id: string; name: string; slug: string }

export type Product = {
  id: string
  slug: string
  name: string
  brand: Ref | null
  category: (Ref & { isAccessory: boolean }) | null
  model: string
  sku: string
  shortDescription: string
  description: string
  condition: Condition
  conditionNotes: string
  availability: Availability
  stock: number | null
  warranty: string
  price: number | null
  promoPrice: number | null
  hidePrice: boolean
  highlights: string[]
  specs: Record<string, string>
  customAttrs: { label: string; value: string }[]
  goodFor: string[]
  isNew: boolean
  isFeatured: boolean
  isDemo: boolean
  model3d: { url: string; tintMaterial: string; illustrative: boolean } | null
  hotspots: Hotspot[]
  media: MediaItem[]
  spin: string[]
  variants: Variant[]
  accessoryIds: string[]
  seoTitle: string
  seoDescription: string
  publishedAt: number | null
  createdAt: number
}

export type Collection = { id: string; name: string; slug: string; description: string; productIds: string[] }
export type NavBrand = Ref & { showInNav: boolean }
export type NavCategory = Ref & { showInNav: boolean; isAccessory: boolean }

export type Catalog = {
  products: Product[]
  brands: NavBrand[]
  categories: NavCategory[]
  collections: Collection[]
}
