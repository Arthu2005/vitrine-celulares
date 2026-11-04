import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CatalogRoute } from '@/components/site/catalog-route'
import { getCatalog } from '@/lib/catalog'
import { STATIC_SITE } from '@/lib/site-mode'

type P = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }

// Com servidor, renderiza por requisição. scripts/build-pages.ts troca este valor na versão estática.
export const dynamic = 'force-dynamic'

export async function generateStaticParams() {
  if (!STATIC_SITE) return []
  return (await getCatalog()).brands.map((b) => ({ slug: b.slug }))
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params
  const brand = (await getCatalog()).brands.find((b) => b.slug === slug)
  return { title: brand?.name ?? 'Marca' }
}

export default async function BrandPage({ params, searchParams }: P) {
  const [{ slug }, catalog] = await Promise.all([params, getCatalog()])
  const brand = catalog.brands.find((b) => b.slug === slug)
  if (!brand) notFound()
  return <CatalogRoute eyebrow="Marca" title={brand.name} base={catalog.products.filter((p) => p.brand?.id === brand.id)} searchParams={searchParams} hideBrand />
}
