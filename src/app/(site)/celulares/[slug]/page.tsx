import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ProductPage } from '@/components/site/product-page'
import { getCatalog, phones } from '@/lib/catalog'
import { priceInfo, primaryImage } from '@/lib/product-utils'
import { BASE_PATH, STATIC_SITE } from '@/lib/site-mode'
import type { Product } from '@/lib/types'
import { siteUrl } from '@/lib/whatsapp'

type P = { params: Promise<{ slug: string }> }

const find = async (slug: string) => {
  const catalog = await getCatalog()
  return { catalog, product: catalog.products.find((p) => p.slug === slug) }
}

// Com servidor, renderiza por requisição. scripts/build-pages.ts troca este valor na versão estática.
export const dynamic = 'force-dynamic'

export async function generateStaticParams() {
  if (!STATIC_SITE) return []
  return (await getCatalog()).products.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params
  const { product } = await find(slug)
  if (!product) return { title: 'Aparelho não encontrado' }
  const image = primaryImage(product)
  const title = product.seoTitle || product.name
  const description = product.seoDescription || product.shortDescription || undefined
  return {
    title,
    description,
    alternates: { canonical: `${BASE_PATH}/celulares/${product.slug}` },
    robots: product.isDemo ? { index: false } : undefined,
    openGraph: { title, description, url: `${BASE_PATH}/celulares/${product.slug}`, type: 'website', images: image ? [{ url: image.url, width: image.width, height: image.height, alt: product.name }] : undefined },
  }
}

const SCHEMA_AVAILABILITY = { disponivel: 'InStock', ultimas: 'LimitedAvailability', encomenda: 'PreOrder', indisponivel: 'OutOfStock' }

/** Dados estruturados só com informação cadastrada: sem preço visível não há "offers", e nunca há avaliações. */
function structured(product: Product) {
  const info = priceInfo(product)
  const image = primaryImage(product)
  const base = siteUrl()
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription || undefined,
    sku: product.sku || undefined,
    model: product.model || undefined,
    brand: product.brand ? { '@type': 'Brand', name: product.brand.name } : undefined,
    image: image ? (image.url.startsWith('http') ? image.url : `${base}${image.url}`) : undefined,
    url: `${base}/celulares/${product.slug}`,
    offers:
      !info.hidden && info.current != null
        ? {
            '@type': 'Offer',
            priceCurrency: 'BRL',
            price: (info.current / 100).toFixed(2),
            availability: `https://schema.org/${SCHEMA_AVAILABILITY[product.availability]}`,
            itemCondition: `https://schema.org/${product.condition === 'novo' ? 'NewCondition' : product.condition === 'seminovo' ? 'UsedCondition' : 'RefurbishedCondition'}`,
            url: `${base}/celulares/${product.slug}`,
          }
        : undefined,
  }
}

export default async function DevicePage({ params }: P) {
  const { slug } = await params
  const { catalog, product } = await find(slug)
  if (!product) notFound()
  const accessories = product.accessoryIds.flatMap((id) => catalog.products.find((p) => p.id === id) ?? [])
  const related = phones(catalog).filter((p) => p.id !== product.id).slice(0, 6)
  return (
    <>
      {!product.isDemo && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured(product)).replace(/</g, '\\u003c') }} />}
      <ProductPage product={product} accessories={accessories} related={related} />
    </>
  )
}
