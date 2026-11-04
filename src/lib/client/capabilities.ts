export function canUse3D() {
  if (typeof window === 'undefined') return { supported: false, auto: false }
  let supported = false
  try {
    const canvas = document.createElement('canvas')
    supported = !!canvas.getContext('webgl2')
  } catch {
    supported = false
  }
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean; effectiveType?: string } }
  const low = (nav.deviceMemory ?? 8) <= 2 || (nav.hardwareConcurrency ?? 8) <= 2
  const slow = nav.connection?.saveData || /2g/.test(nav.connection?.effectiveType ?? '')
  return { supported, auto: supported && !low && !slow }
}
