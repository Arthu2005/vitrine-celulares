import type { Metadata } from 'next'
import { getCatalog } from '@/lib/catalog'
import { getHome, getStore } from '@/lib/settings'
import { HomeView } from '@/components/site/home-view'

export async function generateMetadata(): Promise<Metadata> {
  const [home, store] = await Promise.all([getHome(), getStore()])
  return { description: store.seoDescription || home.hero.subtitle || undefined }
}

export default async function HomePage() {
  const [home, store, catalog] = await Promise.all([getHome(), getStore(), getCatalog()])
  return <HomeView home={home} store={store} catalog={catalog} />
}
