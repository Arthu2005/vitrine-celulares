import type { Metadata } from 'next'
import { CompareView } from '@/components/site/compare-view'
import { StaticCompare } from '@/components/site/compare-static'
import { getCatalog, phones } from '@/lib/catalog'
import { STATIC_SITE } from '@/lib/site-mode'

export const metadata: Metadata = { title: 'Comparar aparelhos', description: 'Compare até três celulares lado a lado.' }

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const list = phones(await getCatalog())
  if (STATIC_SITE) return <StaticCompare products={list} />
  const { m } = await searchParams
  const items = (m ?? '').split(',').slice(0, 3).flatMap((slug) => list.find((p) => p.slug === slug) ?? [])
  return <CompareView items={items} options={list.map((p) => ({ slug: p.slug, name: p.name }))} />
}
