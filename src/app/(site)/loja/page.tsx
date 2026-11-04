import type { Metadata } from 'next'
import { StoreInfo } from '@/components/site/store-info'
import { getStore } from '@/lib/settings'

export const metadata: Metadata = { title: 'A loja' }

export default async function StorePage() {
  const store = await getStore()
  return (
    <div className="shell pt-8 md:pt-12">
      <h1 className="display mb-4 text-[40px] md:text-[72px]">{store.name}</h1>
      {store.about && <p className="mb-10 max-w-[62ch] whitespace-pre-line text-[18px] text-silver-2">{store.about}</p>}
      <div className="mt-8">
        <StoreInfo store={store} />
      </div>
    </div>
  )
}
