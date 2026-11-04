import { num } from './format'
import { isAvailable, numericSpec, priceInfo, specValue, storages } from './product-utils'
import type { Product } from './types'

export type Answers = {
  budget: number | null
  priority: 'camera' | 'desempenho' | 'bateria' | 'custo' | null
  storage: number | null
  brand: string | null
  use: 'jogos' | 'fotografia' | 'trabalho' | 'cotidiano' | null
  used: boolean
}

export type Recommendation = { product: Product; score: number; reasons: string[]; priceUnknown: boolean }

const USE_LABEL = { jogos: 'jogos', fotografia: 'fotografia', trabalho: 'trabalho', cotidiano: 'uso cotidiano' }
const PRIORITY_SPEC = { camera: 'camPrincipal', bateria: 'bateria', desempenho: 'ram' } as const

const relative = (value: number | null, all: (number | null)[]) => {
  const known = all.filter((v): v is number => v != null)
  if (value == null || known.length < 2) return 0
  const max = Math.max(...known)
  const min = Math.min(...known)
  return max === min ? 0 : (value - min) / (max - min)
}

const maxStorage = (p: Product) => Math.max(0, ...storages(p).map((s) => (/tb/i.test(s) ? (num(s) ?? 0) * 1024 : (num(s) ?? 0))))

/** Pontua apenas com o que está cadastrado. O que não existe no cadastro não vira argumento. */
export function recommend(products: Product[], a: Answers): Recommendation[] {
  const pool = products.filter((p) => {
    if (!isAvailable(p)) return false
    if (!a.used && p.condition !== 'novo') return false
    if (a.brand && p.brand?.slug !== a.brand) return false
    if (a.storage && maxStorage(p) > 0 && maxStorage(p) < a.storage) return false
    const price = priceInfo(p).current
    if (a.budget && price != null && !priceInfo(p).hidden && price > a.budget * 100) return false
    return true
  })

  const prices = pool.map((p) => priceInfo(p).current)
  return pool
    .map((p) => {
      let score = 0
      const reasons: string[] = []
      if (a.priority) {
        if (p.goodFor.includes(a.priority)) {
          score += 3
          reasons.push('Marcado pela loja como forte neste ponto')
        }
        if (a.priority === 'custo') {
          const value = relative(priceInfo(p).current, prices)
          score += (1 - value) * 2
        } else {
          const key = PRIORITY_SPEC[a.priority]
          const value = relative(numericSpec(p, key), pool.map((x) => numericSpec(x, key)))
          score += value * 2
          if (value > 0.6 && p.specs[key]) reasons.push(specValue(p, key) + (key === 'ram' ? ' de RAM' : key === 'bateria' ? ' de bateria' : ' na câmera principal'))
        }
      }
      if (a.use && p.goodFor.includes(a.use)) {
        score += 2
        reasons.push(`Indicado pela loja para ${USE_LABEL[a.use]}`)
      }
      if (a.storage && maxStorage(p) >= a.storage) score += 0.5
      if (p.availability === 'disponivel') score += 0.25
      return { product: p, score, reasons, priceUnknown: priceInfo(p).hidden }
    })
    .sort((x, y) => y.score - x.score)
    .slice(0, 3)
}
