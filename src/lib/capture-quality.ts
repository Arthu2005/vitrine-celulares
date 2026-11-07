/**
 * Analista de captura: avalia se as fotos servem para mostrar a unidade real com fidelidade.
 * As medidas são calculadas no envio (image-quality.ts); aqui ficam só as regras, usadas no servidor e no painel.
 */

export type FrameQuality = {
  /** Variância do laplaciano na área do aparelho: quanto maior, mais nítida. */
  sharpness: number
  /** Brilho médio, de 0 a 255. */
  brightness: number
  /** Fração de pixels estourados (quase brancos) e sem detalhe (quase pretos). */
  clippedHigh: number
  clippedLow: number
  /** Posição do aparelho na foto, de 0 a 1, ou null quando não foi possível separar do fundo. */
  box: { cx: number; cy: number; w: number; h: number } | null
  width: number
  height: number
}

export const QUALITY_RULES = {
  minFrames: 12,
  maxFrames: 36,
  minSide: 900,
  minSharpness: 50,
  relativeSharpness: 0.5,
  darkBrightness: 45,
  maxClippedHigh: 0.15,
  maxClippedLow: 0.35,
  maxBrightnessSpread: 25,
  maxCenterDrift: 0.08,
  maxSizeChange: 1.15,
} as const

const R = QUALITY_RULES

/** Problemas de uma foto isolada, em linguagem para a loja. */
export function frameIssues(q: FrameQuality): string[] {
  const issues: string[] = []
  if (Math.min(q.width, q.height) < R.minSide) issues.push(`Resolução baixa (${q.width}×${q.height}): use pelo menos ${R.minSide} px no lado menor.`)
  if (q.sharpness < R.minSharpness) issues.push('Foto tremida ou fora de foco: apoie o celular e toque no aparelho para focar.')
  if (q.brightness < R.darkBrightness) issues.push('Foto escura: aumente a luz ambiente, sem usar flash.')
  if (q.clippedHigh > R.maxClippedHigh && q.box) issues.push('Reflexo ou luz forte demais apagando detalhes: use luz indireta.')
  if (q.clippedLow > R.maxClippedLow) issues.push('Sombras sem detalhe: ilumine também o outro lado do aparelho.')
  if (!q.box) issues.push('Não foi possível localizar o aparelho: use um fundo liso, de cor diferente do aparelho, e deixe espaço em volta dele.')
  return issues
}

export type ReportItem = { level: 'ok' | 'atencao' | 'refazer'; text: string }
export type SequenceReport = { verdict: 'boa' | 'atencao' | 'refazer' | 'sem-dados'; items: ReportItem[] }

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)] ?? 0
}
const list = (frames: number[]) => (frames.length > 6 ? `${frames.slice(0, 6).join(', ')} e outros` : frames.join(', '))

/** Parecer sobre uma sequência de giro 360°. Os quadros são numerados a partir de 1, na ordem da vitrine. */
export function sequenceReport(frames: (FrameQuality | null | undefined)[]): SequenceReport {
  if (!frames.length) return { verdict: 'sem-dados', items: [] }
  const items: ReportItem[] = []
  const known = frames.map((q, i) => ({ q, n: i + 1 })).filter((f): f is { q: FrameQuality; n: number } => !!f.q)

  if (frames.length < R.minFrames) items.push({ level: 'refazer', text: `Só ${frames.length} quadros: o giro fica aos saltos. Use de ${R.minFrames} a ${R.maxFrames}.` })
  else if (frames.length > R.maxFrames) items.push({ level: 'atencao', text: `${frames.length} quadros: acima de ${R.maxFrames}, a página demora mais para carregar sem ganho visível.` })
  else items.push({ level: 'ok', text: `${frames.length} quadros, dentro do recomendado.` })

  if (known.length < frames.length) items.push({ level: 'atencao', text: `${frames.length - known.length} quadros foram enviados antes do analista existir e não têm análise. Envie a sequência de novo para avaliar todos.` })
  if (!known.length) return { verdict: 'atencao', items }

  const sizes = new Set(known.map(({ q }) => `${q.width}x${q.height}`))
  if (sizes.size > 1) items.push({ level: 'refazer', text: 'Fotos com tamanhos ou orientações diferentes: tire todas com a mesma câmera, na mesma posição.' })

  const lowRes = known.filter(({ q }) => Math.min(q.width, q.height) < R.minSide).map((f) => f.n)
  if (lowRes.length) items.push({ level: 'atencao', text: `Resolução baixa nos quadros ${list(lowRes)}.` })

  const sharpMedian = median(known.map(({ q }) => q.sharpness))
  const blurry = known.filter(({ q }) => q.sharpness < R.minSharpness).map((f) => f.n)
  const softer = known.filter(({ q }) => q.sharpness >= R.minSharpness && q.sharpness < sharpMedian * R.relativeSharpness).map((f) => f.n)
  if (blurry.length) items.push({ level: 'refazer', text: `Tremidos ou fora de foco: quadros ${list(blurry)}.` })
  if (softer.length) items.push({ level: 'atencao', text: `Menos nítidos que o resto: quadros ${list(softer)}.` })
  if (!blurry.length && !softer.length) items.push({ level: 'ok', text: 'Todos os quadros estão nítidos.' })

  const dark = known.filter(({ q }) => q.brightness < R.darkBrightness).map((f) => f.n)
  const glare = known.filter(({ q }) => q.box && q.clippedHigh > R.maxClippedHigh).map((f) => f.n)
  if (dark.length) items.push({ level: 'refazer', text: `Escuros demais: quadros ${list(dark)}.` })
  if (glare.length) items.push({ level: 'atencao', text: `Reflexos fortes apagando detalhes: quadros ${list(glare)}.` })

  const brightness = known.map(({ q }) => q.brightness)
  if (Math.max(...brightness) - Math.min(...brightness) > R.maxBrightnessSpread) items.push({ level: 'atencao', text: 'A luz mudou durante a sequência: trave o foco e a exposição antes da primeira foto.' })
  else if (!dark.length && !glare.length) items.push({ level: 'ok', text: 'Luz uniforme em toda a sequência.' })

  const boxes = known.flatMap(({ q, n }) => (q.box ? [{ ...q.box, n }] : []))
  if (boxes.length < known.length * 0.8) {
    items.push({ level: 'atencao', text: 'Em vários quadros não deu para separar o aparelho do fundo: use um fundo liso e de cor diferente do aparelho.' })
  } else {
    const cx = median(boxes.map((b) => b.cx))
    const cy = median(boxes.map((b) => b.cy))
    const moved = boxes.filter((b) => Math.abs(b.cx - cx) > R.maxCenterDrift || Math.abs(b.cy - cy) > R.maxCenterDrift).map((b) => b.n)
    const heights = boxes.map((b) => b.h)
    if (moved.length) items.push({ level: 'atencao', text: `O aparelho saiu do centro nos quadros ${list(moved)}: centralize na base giratória e não mexa na câmera.` })
    if (Math.max(...heights) / Math.max(Math.min(...heights), 0.01) > R.maxSizeChange) items.push({ level: 'atencao', text: 'A distância da câmera mudou durante a sequência: mantenha o celular fixo no mesmo lugar.' })
    if (!moved.length && Math.max(...heights) / Math.max(Math.min(...heights), 0.01) <= R.maxSizeChange) items.push({ level: 'ok', text: 'Aparelho centralizado e na mesma distância.' })
  }

  const verdict = items.some((i) => i.level === 'refazer') ? 'refazer' : items.some((i) => i.level === 'atencao') ? 'atencao' : 'boa'
  return { verdict, items }
}
