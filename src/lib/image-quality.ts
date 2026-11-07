import type { Sharp } from 'sharp'
import type { FrameQuality } from './capture-quality'

const SAMPLE = 512
const BACKGROUND_DIFF = 28
// Uma linha ou coluna só conta como parte do aparelho com pelo menos 2% de pixels diferentes do fundo.
const MIN_LINE_FILL = 0.02

/** Mede nitidez, exposição e posição do aparelho numa cópia reduzida da foto, já girada pelo EXIF. */
export async function measureFrame(pipeline: Sharp, width: number, height: number): Promise<FrameQuality> {
  const { data, info } = await pipeline.clone().resize(SAMPLE, SAMPLE, { fit: 'inside' }).flatten({ background: '#ffffff' }).removeAlpha().greyscale().raw().toBuffer({ resolveWithObject: true })
  const w = info.width
  const h = info.height
  const px = (x: number, y: number) => data[y * w + x]

  let sum = 0
  let high = 0
  let low = 0
  for (const v of data) {
    sum += v
    if (v >= 250) high++
    if (v <= 5) low++
  }

  // O fundo é estimado pela mediana da borda da foto.
  const border: number[] = []
  for (let x = 0; x < w; x++) border.push(px(x, 0), px(x, h - 1))
  for (let y = 0; y < h; y++) border.push(px(0, y), px(w - 1, y))
  border.sort((a, b) => a - b)
  const background = border[Math.floor(border.length / 2)]

  const rows = new Array<number>(h).fill(0)
  const cols = new Array<number>(w).fill(0)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (Math.abs(px(x, y) - background) > BACKGROUND_DIFF) {
        rows[y]++
        cols[x]++
      }
    }
  }
  const first = (arr: number[], min: number) => arr.findIndex((c) => c >= min)
  const last = (arr: number[], min: number) => arr.length - 1 - [...arr].reverse().findIndex((c) => c >= min)
  const top = first(rows, w * MIN_LINE_FILL)
  const left = first(cols, h * MIN_LINE_FILL)
  let box: FrameQuality['box'] = null
  let x0 = 1
  let y0 = 1
  let x1 = w - 2
  let y1 = h - 2
  if (top >= 0 && left >= 0) {
    const bottom = last(rows, w * MIN_LINE_FILL)
    const right = last(cols, h * MIN_LINE_FILL)
    const bw = right - left + 1
    const bh = bottom - top + 1
    // Um "aparelho" do tamanho da foto inteira é sinal de fundo poluído, não de aparelho encontrado.
    if (bw > 4 && bh > 4 && bw * bh < w * h * 0.95) {
      box = { cx: (left + bw / 2) / w, cy: (top + bh / 2) / h, w: bw / w, h: bh / h }
      x0 = Math.max(1, left)
      y0 = Math.max(1, top)
      x1 = Math.min(w - 2, right)
      y1 = Math.min(h - 2, bottom)
    }
  }

  // Nitidez e reflexos são medidos só na área do aparelho: um fundo branco e liso não é defeito.
  let n = 0
  let mean = 0
  let m2 = 0
  let glare = 0
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const lap = px(x - 1, y) + px(x + 1, y) + px(x, y - 1) + px(x, y + 1) - 4 * px(x, y)
      n++
      const delta = lap - mean
      mean += delta / n
      m2 += delta * (lap - mean)
      if (px(x, y) >= 250) glare++
    }
  }

  return {
    sharpness: Math.round(n > 1 ? m2 / (n - 1) : 0),
    brightness: Math.round(sum / data.length),
    clippedHigh: Number(((box ? glare / Math.max(n, 1) : high / data.length)).toFixed(3)),
    clippedLow: Number((low / data.length).toFixed(3)),
    box: box && { cx: Number(box.cx.toFixed(3)), cy: Number(box.cy.toFixed(3)), w: Number(box.w.toFixed(3)), h: Number(box.h.toFixed(3)) },
    width,
    height,
  }
}
