import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getStore } from '@/lib/settings'

export const metadata: Metadata = { title: 'Termos de uso' }

export default async function TermsPage() {
  const store = await getStore()
  if (!store.terms) notFound()
  return (
    <div className="shell max-w-[800px] pt-8 md:pt-12">
      <h1 className="display text-[36px] md:text-[60px]">Termos de uso</h1>
      <p className="mt-6 whitespace-pre-line text-silver-2">{store.terms}</p>
    </div>
  )
}
