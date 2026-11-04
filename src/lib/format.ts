export const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: cents % 100 ? 2 : 0 })

export const bytes = (n: number) => {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

export const dateTime = (ms: number) =>
  new Date(ms).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

export const num = (value: string | undefined | null) => {
  if (!value) return null
  const n = parseFloat(value.replace(',', '.').replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? n : null
}

/** "1.299,90" ou "1299.9" viram centavos; vazio vira null. */
export function parseMoney(input: string): number | null {
  const clean = input.replace(/[^0-9,.]/g, '')
  if (!clean) return null
  const normalized = clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean
  const n = Math.round(parseFloat(normalized) * 100)
  return Number.isFinite(n) ? n : null
}

export const moneyInput = (cents: number | null) => (cents == null ? '' : (cents / 100).toFixed(2).replace('.', ','))
