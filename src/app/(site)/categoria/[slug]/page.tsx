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
  return (await getCatalog()).categories.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params
  const category = (await getCatalog()).categories.find((c) => c.slug === slug)
  return { title: category?.name ?? 'Categoria' }
}

export default async function CategoryPage({ params, searchParams }: P) {
  const [{ slug }, catalog] = await Promise.all([params, getCatalog()])
  const category = catalog.categories.find((c) => c.slug === slug)
  if (!category) notFound()
  return <CatalogRoute eyebrow="Categoria" title={category.name} base={catalog.products.filter((p) => p.category?.id === category.id)} searchParams={searchParams} />
}
