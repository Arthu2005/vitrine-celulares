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
  return (await getCatalog()).collections.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params
  const collection = (await getCatalog()).collections.find((c) => c.slug === slug)
  return { title: collection?.name ?? 'Coleção', description: collection?.description || undefined }
}

export default async function CollectionPage({ params, searchParams }: P) {
  const [{ slug }, catalog] = await Promise.all([params, getCatalog()])
  const collection = catalog.collections.find((c) => c.slug === slug)
  if (!collection) notFound()
  const base = collection.productIds.flatMap((id) => catalog.products.find((p) => p.id === id) ?? [])
  return <CatalogRoute eyebrow="Coleção" title={collection.name} description={collection.description} base={base} searchParams={searchParams} />
}
