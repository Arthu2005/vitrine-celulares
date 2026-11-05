import type { Product } from './types'
import type { StoreConfig } from './schemas'

/** No servidor, o endereço é lido ao rodar: o domínio da hospedagem só existe depois do primeiro build. */
export function siteUrl() {
  const built = process.env.NEXT_PUBLIC_SITE_URL
  if (typeof window !== 'undefined') return (built || window.location.origin).replace(/\/$/, '')
  const railway = process.env.RAILWAY_PUBLIC_DOMAIN
  return (process.env.SITE_URL || (railway && `https://${railway}`) || built || 'http://localhost:3000').replace(/\/$/, '')
}

export const DEFAULT_TEMPLATE = 'Olá! Tenho interesse no {produto}. Gostaria de saber o preço, as cores disponíveis, a condição e as formas de pagamento.\n{link}'

/** Sem número configurado, o WhatsApp abre e o cliente escolhe o contato: o botão nunca fica morto. */
export function waLink(phone: string, text: string) {
  const digits = phone.replace(/\D/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

export function productMessage(store: Pick<StoreConfig, 'whatsappTemplate'>, product: Pick<Product, 'name' | 'slug'>, detail?: string) {
  const name = detail ? `${product.name} (${detail})` : product.name
  return (store.whatsappTemplate || DEFAULT_TEMPLATE)
    .replaceAll('{produto}', name)
    .replaceAll('{link}', `${siteUrl()}/celulares/${product.slug}`)
}

export function compareMessage(products: Pick<Product, 'name'>[], url: string) {
  return `Olá! Estou em dúvida entre ${products.map((p) => p.name).join(', ').replace(/, ([^,]*)$/, ' e $1')}. Pode me ajudar a escolher?\n${url}`
}
