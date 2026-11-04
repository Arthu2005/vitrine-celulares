/** Versão estática (GitHub Pages): sem servidor, sem painel e com os dados congelados no momento do build. */
export const STATIC_SITE = process.env.NEXT_PUBLIC_STATIC_SITE === '1'
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
