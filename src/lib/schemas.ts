import { z } from 'zod'

const money = z.number().int().min(0).max(100_000_000).nullable()
const stock = z.number().int().min(0).max(1_000_000).nullable()
const shortText = z.string().trim().max(200)
const condition = z.enum(['novo', 'seminovo', 'recondicionado'])
const availability = z.enum(['disponivel', 'ultimas', 'encomenda', 'indisponivel'])

export const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

const vec3 = z.tuple([z.number(), z.number(), z.number()])

export const variantSchema = z.object({
  id: z.string().optional(),
  color: shortText.default(''),
  colorHex: z.string().regex(/^(#[0-9a-fA-F]{6})?$/, 'Cor inválida').default(''),
  storage: shortText.default(''),
  ram: shortText.default(''),
  condition: condition.nullable().default(null),
  price: money.default(null),
  promoPrice: money.default(null),
  availability: availability.default('disponivel'),
  stock: stock.default(null),
  sku: shortText.default(''),
  modelMediaId: z.string().nullable().default(null),
})

export const productInputSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome do aparelho.').max(160),
  slug: z.string().trim().max(90).default(''),
  brandId: z.string().nullable().default(null),
  categoryId: z.string().nullable().default(null),
  model: shortText.default(''),
  sku: shortText.default(''),
  shortDescription: z.string().trim().max(300).default(''),
  description: z.string().trim().max(8000).default(''),
  condition: condition.default('novo'),
  conditionNotes: z.string().trim().max(1000).default(''),
  availability: availability.default('disponivel'),
  stock: stock.default(null),
  warranty: z.string().trim().max(300).default(''),
  price: money.default(null),
  promoPrice: money.default(null),
  hidePrice: z.boolean().default(false),
  highlights: z.array(shortText).max(8).default([]),
  specs: z.record(z.string(), z.string().trim().max(400)).default({}),
  customAttrs: z.array(z.object({ label: shortText, value: shortText })).max(30).default([]),
  goodFor: z.array(z.string()).max(8).default([]),
  isNew: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  visible: z.boolean().default(true),
  modelMediaId: z.string().nullable().default(null),
  modelTintMaterial: shortText.default(''),
  modelIllustrative: z.boolean().default(true),
  hotspots: z
    .array(z.object({ id: z.string(), label: shortText, text: z.string().trim().max(400), position: vec3, normal: vec3 }))
    .max(12)
    .default([]),
  seoTitle: z.string().trim().max(120).default(''),
  seoDescription: z.string().trim().max(240).default(''),
  variants: z.array(variantSchema).max(60).default([]),
  media: z
    .array(z.object({ mediaId: z.string(), role: z.enum(['gallery', 'spin']).default('gallery'), color: shortText.default('') }))
    .max(120)
    .default([]),
  accessoryIds: z.array(z.string()).max(60).default([]),
  collectionIds: z.array(z.string()).max(60).default([]),
})

export type ProductInput = z.infer<typeof productInputSchema>

/** Regras que só valem para publicar: um rascunho pode estar incompleto. */
export function publishIssues(p: ProductInput): string[] {
  const issues: string[] = []
  if (!p.slug) issues.push('Defina o endereço (URL) do aparelho.')
  if (!p.brandId) issues.push('Escolha a marca.')
  if (!p.media.some((m) => m.role === 'gallery')) issues.push('Adicione pelo menos uma foto.')
  if (!p.hidePrice && p.price == null && !p.variants.some((v) => v.price != null)) {
    issues.push('Informe o preço ou marque "Ocultar preço".')
  }
  if (p.promoPrice != null && p.price != null && p.promoPrice >= p.price) issues.push('O preço promocional precisa ser menor que o preço de venda.')
  for (const v of p.variants) {
    if (v.promoPrice != null && v.price != null && v.promoPrice >= v.price) {
      issues.push(`Variante ${[v.color, v.storage].filter(Boolean).join(' ')}: o preço promocional precisa ser menor.`)
    }
  }
  return issues
}

const link = z.string().trim().max(300)

export const storeSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome da loja.').max(80),
  logoMediaId: z.string().nullable().default(null),
  faviconMediaId: z.string().nullable().default(null),
  accent: z.enum(['filamento', 'ciano', 'lima', 'prata']).default('filamento'),
  whatsapp: z.string().trim().max(24).default(''),
  whatsappTemplate: z.string().trim().max(500).default(''),
  phone: shortText.default(''),
  email: z.string().trim().max(120).default(''),
  address: z.string().trim().max(300).default(''),
  mapQuery: z.string().trim().max(300).default(''),
  hours: z.array(z.object({ label: shortText, value: shortText })).max(10).default([]),
  socials: z.array(z.object({ label: shortText, url: link })).max(8).default([]),
  commercialTerms: z.string().trim().max(3000).default(''),
  warrantyInfo: z.string().trim().max(3000).default(''),
  usedPolicy: z.string().trim().max(3000).default(''),
  pickupInfo: z.string().trim().max(3000).default(''),
  about: z.string().trim().max(3000).default(''),
  notice: z.string().trim().max(200).default(''),
  seoTitle: z.string().trim().max(120).default(''),
  seoDescription: z.string().trim().max(240).default(''),
  ogMediaId: z.string().nullable().default(null),
  privacyPolicy: z.string().trim().max(20000).default(''),
  terms: z.string().trim().max(20000).default(''),
  demoNotice: z.boolean().default(false),
})
export type StoreConfig = z.infer<typeof storeSchema>

export const heroSchema = z.object({
  eyebrow: shortText.default(''),
  title: z.string().trim().max(120).default(''),
  subtitle: z.string().trim().max(240).default(''),
  productId: z.string().nullable().default(null),
  imageMediaId: z.string().nullable().default(null),
  primaryLabel: shortText.default(''),
  primaryHref: link.default('/celulares'),
  secondaryLabel: shortText.default(''),
  secondaryHref: link.default('/encontre'),
  specKeys: z.array(z.string()).max(3).default([]),
})
export type HeroConfig = z.infer<typeof heroSchema>

export const railSources = ['manual', 'destaques', 'novidades', 'ofertas', 'recentes', 'camera', 'desempenho', 'bateria', 'custo', 'premium', 'colecao'] as const

const blockBase = { id: z.string(), enabled: z.boolean().default(true) }

export const blockSchema = z.discriminatedUnion('type', [
  z.object({
    ...blockBase,
    type: z.literal('rail'),
    eyebrow: shortText.default(''),
    title: shortText.default(''),
    source: z.enum(railSources).default('destaques'),
    productIds: z.array(z.string()).max(24).default([]),
    collectionId: z.string().nullable().default(null),
    limit: z.number().int().min(2).max(24).default(8),
  }),
  z.object({
    ...blockBase,
    type: z.literal('spotlight'),
    eyebrow: shortText.default(''),
    title: shortText.default(''),
    text: z.string().trim().max(400).default(''),
    productId: z.string().nullable().default(null),
    specKeys: z.array(z.string()).max(4).default([]),
  }),
  z.object({ ...blockBase, type: z.literal('collections'), eyebrow: shortText.default(''), title: shortText.default('') }),
  z.object({
    ...blockBase,
    type: z.literal('banner'),
    title: shortText.default(''),
    text: z.string().trim().max(400).default(''),
    imageMediaId: z.string().nullable().default(null),
    ctaLabel: shortText.default(''),
    ctaHref: link.default(''),
  }),
  z.object({ ...blockBase, type: z.literal('finder'), title: shortText.default(''), text: z.string().trim().max(400).default('') }),
  z.object({ ...blockBase, type: z.literal('compare'), title: shortText.default(''), text: z.string().trim().max(400).default(''), productIds: z.array(z.string()).max(2).default([]) }),
  z.object({ ...blockBase, type: z.literal('text'), title: shortText.default(''), text: z.string().trim().max(2000).default('') }),
  z.object({ ...blockBase, type: z.literal('store'), title: shortText.default('') }),
])
export type Block = z.infer<typeof blockSchema>

export const homeSchema = z.object({ hero: heroSchema, blocks: z.array(blockSchema).max(30) })
export type HomeConfig = z.infer<typeof homeSchema>

export const defaultStore: StoreConfig = storeSchema.parse({ name: 'Sua Loja' })
export const defaultHome: HomeConfig = homeSchema.parse({ hero: {}, blocks: [] })
