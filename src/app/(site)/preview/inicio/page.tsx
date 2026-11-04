import { HomeView } from '@/components/site/home-view'
import { getCatalog } from '@/lib/catalog'
import { getHomeDraft, getStoreDraft } from '@/lib/settings'

export default async function HomePreview() {
  const [home, store, catalog] = await Promise.all([getHomeDraft(), getStoreDraft(), getCatalog()])
  return <HomeView home={home.value} store={store.value} catalog={catalog} />
}
