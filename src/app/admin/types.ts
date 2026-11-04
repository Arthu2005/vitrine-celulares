export type ActionResult<T = unknown> = ({ ok: true } & T) | { ok: false; error: string; issues?: string[] }

export type MediaRow = {
  id: string
  kind: 'image' | 'video' | 'model'
  name: string
  size: number
  url: string
  fullUrl: string
  alt: string
  meta?: Record<string, unknown> | null
  width?: number | null
  height?: number | null
}
