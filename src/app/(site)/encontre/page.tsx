import type { Metadata } from 'next'
import { Finder } from '@/components/site/finder'
import { getCatalog, phones } from '@/lib/catalog'

export const metadata: Metadata = { title: 'Encontre seu celular', description: 'Responda seis perguntas e veja os aparelhos que combinam com o seu uso.' }

export default async function FinderPage() {
  const catalog = await getCatalog()
  const list = phones(catalog)
  const used = new Set(list.map((p) => p.brand?.id))
  return <Finder products={list} brands={catalog.brands.filter((b) => used.has(b.id)).map((b) => ({ name: b.name, slug: b.slug }))} />
}
