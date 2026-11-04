import type { Metadata } from 'next'
import { FavoritesView } from '@/components/site/favorites-view'
import { getCatalog } from '@/lib/catalog'

export const metadata: Metadata = { title: 'Favoritos', robots: { index: false } }

export default async function FavoritesPage() {
  const catalog = await getCatalog()
  return <FavoritesView products={catalog.products} />
}
