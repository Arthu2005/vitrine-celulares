import Link from 'next/link'
import type { Product } from '@/lib/types'
import { ProductTile } from './product-tile'

export function Rail({ eyebrow, title, products, href }: { eyebrow?: string; title: string; products: Product[]; href?: string }) {
  if (!products.length) return null
  return (
    <section className="mt-[var(--section)]">
      <div className="shell flex items-end justify-between gap-6">
        <div className="min-w-0">
          {eyebrow && <p className="label mb-3">{eyebrow}</p>}
          <h2 className="title text-[32px] md:text-[48px]">{title}</h2>
        </div>
        {href && (
          <Link href={href} className="shrink-0 pb-1 text-[15px] text-silver-2 underline underline-offset-4 hover:text-silver-1">
            Ver todos
          </Link>
        )}
      </div>
      <div className="no-scrollbar mt-8 flex snap-x snap-mandatory scroll-pl-[var(--gutter)] gap-5 overflow-x-auto px-[max(var(--gutter),calc((100vw-1360px)/2+var(--gutter)))] pb-2 md:gap-8">
        {products.map((p) => (
          <div key={p.id} className="w-[62vw] max-w-[300px] shrink-0 snap-start sm:w-[38vw] lg:w-[23vw]">
            <ProductTile product={p} sizes="(min-width: 1024px) 300px, 62vw" />
          </div>
        ))}
      </div>
    </section>
  )
}
