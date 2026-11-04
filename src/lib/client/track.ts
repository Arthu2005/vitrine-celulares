import type { EventType } from '../constants'
import { STATIC_SITE } from '../site-mode'

export function track(type: EventType, data: { productId?: string; label?: string; results?: number } = {}) {
  if (STATIC_SITE) return
  try {
    const body = JSON.stringify({ type, ...data })
    if (!navigator.sendBeacon?.('/api/events', new Blob([body], { type: 'application/json' }))) {
      void fetch('/api/events', { method: 'POST', body, headers: { 'content-type': 'application/json' }, keepalive: true })
    }
  } catch {
    // Métricas nunca atrapalham a navegação.
  }
}
