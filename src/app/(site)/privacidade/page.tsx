import type { Metadata } from 'next'
import { getStore } from '@/lib/settings'

export const metadata: Metadata = { title: 'Política de privacidade' }

export default async function PrivacyPage() {
  const store = await getStore()
  return (
    <div className="shell max-w-[800px] pt-8 md:pt-12">
      <h1 className="display text-[36px] md:text-[60px]">Política de privacidade</h1>
      <p className="mt-6 whitespace-pre-line text-silver-2">{store.privacyPolicy || 'A loja ainda não publicou sua política de privacidade.'}</p>
    </div>
  )
}
