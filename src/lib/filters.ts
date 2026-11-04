import { AVAILABILITY, CONDITIONS } from './constants'
import { norm, num } from './format'
import { isAvailable, numericSpec, priceInfo, rams, searchText, storages, unique } from './product-utils'
import type { Product } from './types'

export type Sort = 'relevancia' | 'menor-preco' | 'maior-preco' | 'recentes'

export type CatalogQuery = {
  q: string
  marca: string[]
  armazenamento: string[]
  ram: string[]
  tela: string[]
  painel: string[]
  bateria: string[]
  cameras: string[]
  condicao: string[]
  disponibilidade: string[]
  extra: string[]
  min: number | null
  max: number | null
  oferta: boolean
  ordem: Sort
  pagina: number
}

export const PAGE_SIZE = 12

export const TELA_FAIXAS = [
  { value: 'compacta', label: 'Até 6,2"', test: (n: number) => n <= 6.2 },
  { value: 'media', label: '6,3" a 6,6"', test: (n: number) => n > 6.2 && n <= 6.6 },
  { value: 'grande', label: '6,7" ou mais', test: (n: number) => n > 6.6 },
]

export const BATERIA_FAIXAS = [
  { value: 'ate-4500', label: 'Até 4.500 mAh', test: (n: number) => n <= 4500 },
  { value: '4500-5000', label: '4.501 a 5.000 mAh', test: (n: number) => n > 4500 && n <= 5000 },
  { value: 'acima-5000', label: 'Acima de 5.000 mAh', test: (n: number) => n > 5000 },
]

const list = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? v.split(',') : []).filter(Boolean)
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''

export function parseQuery(sp: Record<string, string | string[] | undefined>): CatalogQuery {
  const ordem = first(sp.ordem)
  return {
    q: first(sp.q).slice(0, 80),
    marca: list(sp.marca),
    armazenamento: list(sp.armazenamento),
    ram: list(sp.ram),
    tela: list(sp.tela),
    painel: list(sp.painel),
    bateria: list(sp.bateria),
    cameras: list(sp.cameras),
    condicao: list(sp.condicao),
    disponibilidade: list(sp.disponibilidade),
    extra: list(sp.extra),
    min: num(first(sp.min)),
    max: num(first(sp.max)),
    oferta: first(sp.oferta) === '1',
    ordem: (['menor-preco', 'maior-preco', 'recentes'].includes(ordem) ? ordem : 'relevancia') as Sort,
    pagina: Math.max(1, parseInt(first(sp.pagina)) || 1),
  }
}

export function toParams(q: CatalogQuery) {
  const params = new URLSearchParams()
  if (q.q) params.set('q', q.q)
  for (const key of ['marca', 'armazenamento', 'ram', 'tela', 'painel', 'bateria', 'cameras', 'condicao', 'disponibilidade', 'extra'] as const) {
    if (q[key].length) params.set(key, q[key].join(','))
  }
  if (q.min != null) params.set('min', String(q.min))
  if (q.max != null) params.set('max', String(q.max))
  if (q.oferta) params.set('oferta', '1')
  if (q.ordem !== 'relevancia') params.set('ordem', q.ordem)
  if (q.pagina > 1) params.set('pagina', String(q.pagina))
  return params
}

export const emptyQuery = (): CatalogQuery => parseQuery({})

export const activeFilterCount = (q: CatalogQuery) =>
  q.marca.length + q.armazenamento.length + q.ram.length + q.tela.length + q.painel.length + q.bateria.length + q.cameras.length + q.condicao.length + q.disponibilidade.length + q.extra.length + (q.min != null ? 1 : 0) + (q.max != null ? 1 : 0) + (q.oferta ? 1 : 0)

const attrKey = (a: { label: string; value: string }) => `${a.label}: ${a.value}`

const matchesRange = (value: number | null, selected: string[], ranges: { value: string; test: (n: number) => boolean }[]) =>
  !selected.length || (value != null && ranges.some((r) => selected.includes(r.value) && r.test(value)))

export function matches(p: Product, q: CatalogQuery, skip?: keyof CatalogQuery) {
  const check = (key: keyof CatalogQuery, test: boolean) => skip === key || test
  const info = priceInfo(p)
  const onSale = info.onSale || p.variants.some((v) => v.promoPrice != null)
  return (
    check('q', q.q ? norm(q.q).split(/\s+/).filter(Boolean).every((t) => searchText(p).includes(t)) : true) &&
    check('marca', !q.marca.length || q.marca.includes(p.brand?.slug ?? '')) &&
    check('armazenamento', !q.armazenamento.length || storages(p).some((s) => q.armazenamento.includes(s))) &&
    check('ram', !q.ram.length || rams(p).some((s) => q.ram.includes(s))) &&
    check('tela', matchesRange(numericSpec(p, 'telaTamanho'), q.tela, TELA_FAIXAS)) &&
    check('painel', !q.painel.length || q.painel.includes(p.specs.telaTipo ?? '')) &&
    check('bateria', matchesRange(numericSpec(p, 'bateria'), q.bateria, BATERIA_FAIXAS)) &&
    check('cameras', !q.cameras.length || q.cameras.includes(p.specs.camQuantidade ?? '')) &&
    check('condicao', !q.condicao.length || q.condicao.includes(p.condition) || p.variants.some((v) => v.condition && q.condicao.includes(v.condition))) &&
    check('disponibilidade', !q.disponibilidade.length || q.disponibilidade.includes(p.availability) || p.variants.some((v) => q.disponibilidade.includes(v.availability))) &&
    check('extra', q.extra.every((e) => p.customAttrs.some((a) => attrKey(a) === e))) &&
    check('min', q.min == null || (info.current != null && info.current >= q.min * 100)) &&
    check('max', q.max == null || (info.current != null && info.current <= q.max * 100)) &&
    check('oferta', !q.oferta || onSale)
  )
}

export function applyQuery(products: Product[], q: CatalogQuery) {
  const out = products.filter((p) => matches(p, q))
  const price = (p: Product) => priceInfo(p).current
  const byPrice = (dir: 1 | -1) => (a: Product, b: Product) => {
    const pa = price(a)
    const pb = price(b)
    if (pa == null) return pb == null ? 0 : 1
    if (pb == null) return -1
    return (pa - pb) * dir
  }
  if (q.ordem === 'menor-preco') out.sort(byPrice(1))
  else if (q.ordem === 'maior-preco') out.sort(byPrice(-1))
  else if (q.ordem === 'recentes') out.sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0))
  else out.sort((a, b) => Number(isAvailable(b)) - Number(isAvailable(a)) || Number(b.isFeatured) - Number(a.isFeatured))
  return out
}

export type Facet = { value: string; label: string; count: number }

function facet(products: Product[], q: CatalogQuery, key: keyof CatalogQuery, values: (p: Product) => { value: string; label: string }[]): Facet[] {
  const pool = products.filter((p) => matches(p, q, key))
  const counts = new Map<string, Facet>()
  for (const p of pool) {
    for (const { value, label } of values(p)) {
      if (!value) continue
      const entry = counts.get(value) ?? { value, label, count: 0 }
      entry.count++
      counts.set(value, entry)
    }
  }
  return [...counts.values()]
}

const sizeOrder = (s: string) => {
  const n = num(s) ?? 0
  return /tb/i.test(s) ? n * 1024 : n
}

const byRange = (ranges: { value: string; label: string; test: (n: number) => boolean }[], value: number | null) =>
  value == null ? [] : ranges.filter((r) => r.test(value)).map(({ value, label }) => ({ value, label }))

export function facets(products: Product[], q: CatalogQuery) {
  const same = (s: string) => ({ value: s, label: s })
  const sized = (list: Facet[]) => list.sort((a, b) => sizeOrder(a.value) - sizeOrder(b.value))
  return {
    marca: facet(products, q, 'marca', (p) => (p.brand ? [{ value: p.brand.slug, label: p.brand.name }] : [])).sort((a, b) => a.label.localeCompare(b.label)),
    armazenamento: sized(facet(products, q, 'armazenamento', (p) => storages(p).map(same))),
    ram: sized(facet(products, q, 'ram', (p) => rams(p).map(same))),
    tela: facet(products, q, 'tela', (p) => byRange(TELA_FAIXAS, numericSpec(p, 'telaTamanho'))),
    painel: facet(products, q, 'painel', (p) => (p.specs.telaTipo ? [same(p.specs.telaTipo)] : [])),
    bateria: facet(products, q, 'bateria', (p) => byRange(BATERIA_FAIXAS, numericSpec(p, 'bateria'))),
    cameras: facet(products, q, 'cameras', (p) =>
      p.specs.camQuantidade ? [{ value: p.specs.camQuantidade, label: `${p.specs.camQuantidade} ${p.specs.camQuantidade === '1' ? 'câmera' : 'câmeras'}` }] : [],
    ).sort((a, b) => a.value.localeCompare(b.value)),
    condicao: facet(products, q, 'condicao', (p) => unique([p.condition, ...p.variants.map((v) => v.condition ?? '')]).map((c) => ({ value: c, label: CONDITIONS[c as keyof typeof CONDITIONS] }))),
    disponibilidade: facet(products, q, 'disponibilidade', (p) =>
      unique([p.availability, ...p.variants.map((v) => v.availability)]).map((c) => ({ value: c, label: AVAILABILITY[c as keyof typeof AVAILABILITY] })),
    ),
    extra: facet(products, q, 'extra', (p) => p.customAttrs.map((a) => ({ value: attrKey(a), label: attrKey(a) }))),
  }
}

export type Facets = ReturnType<typeof facets>
