'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import type { Product } from '@/lib/types'
import { CompareView } from './compare-view'

function Selected({ products }: { products: Product[] }) {
  const search = useSearchParams()
  const items = (search.get('m') ?? '').split(',').slice(0, 3).flatMap((slug) => products.find((p) => p.slug === slug) ?? [])
  return <CompareView items={items} options={products.map((p) => ({ slug: p.slug, name: p.name }))} />
}

export function StaticCompare({ products }: { products: Product[] }) {
  return (
    <Suspense fallback={<CompareView items={[]} options={products.map((p) => ({ slug: p.slug, name: p.name }))} />}>
      <Selected products={products} />
    </Suspense>
  )
}
