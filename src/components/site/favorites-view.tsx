'use client'

import { Heart } from 'lucide-react'
import Link from 'next/link'
import type { Product } from '@/lib/types'
import { ProductTile } from './product-tile'
import { useShelf } from './shelf'

export function FavoritesView({ products }: { products: Product[] }) {
  const { favorites } = useShelf()
  const list = favorites.flatMap((slug) => products.find((p) => p.slug === slug) ?? [])
  return (
    <div className="shell pt-8 md:pt-12">
      <p className="label mb-3">Salvos neste aparelho</p>
      <h1 className="display text-[40px] md:text-[72px]">Favoritos</h1>
      {list.length ? (
        <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-7">
          {list.map((p) => (
            <li key={p.id} className="min-w-0">
              <ProductTile product={p} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-8 flex flex-col items-start gap-3 border-t border-line py-10">
          <Heart className="size-7 text-silver-3" strokeWidth={1.5} />
          <p className="text-silver-2">Toque no coração de um aparelho para guardá-lo aqui. Não é preciso criar conta.</p>
          <Link href="/celulares" className="btn btn-primary">
            Explorar celulares
          </Link>
        </div>
      )}
    </div>
  )
}
