import { SearchX } from 'lucide-react'
import Link from 'next/link'
import { applyQuery, facets, PAGE_SIZE, parseQuery, toParams } from '@/lib/filters'
import type { Product } from '@/lib/types'
import { CatalogTracker } from './catalog-tracker'
import { FilterPanel } from './filter-panel'
import { ProductTile } from './product-tile'

type Props = {
  eyebrow?: string
  title: string
  description?: string
  base: Product[]
  params: Record<string, string | string[] | undefined>
  hideBrand?: boolean
}

export function CatalogView({ eyebrow, title, description, base, params, hideBrand }: Props) {
  const query = parseQuery(params)
  const results = applyQuery(base, query)
  const visible = results.slice(0, query.pagina * PAGE_SIZE)
  const more = results.length > visible.length
  const search = toParams(query).toString()

  return (
    <div className="shell pt-8 md:pt-12">
      <header className="mb-8 md:mb-12">
        {eyebrow && <p className="label mb-3">{eyebrow}</p>}
        <h1 className="display text-[40px] md:text-[76px]">{query.q ? `Resultados para "${query.q}"` : title}</h1>
        {description && <p className="mt-3 max-w-[56ch] text-silver-2">{description}</p>}
      </header>

      <div className="relative lg:pl-[320px]">
        <FilterPanel facets={facets(base, query)} search={search} total={results.length} hideBrand={hideBrand} />
        <CatalogTracker q={query.q} results={results.length} />
        <h2 className="sr-only">Aparelhos</h2>
        {visible.length > 0 ? (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-7 md:gap-y-14">
            {visible.map((p, i) => (
              <li key={p.id} className="min-w-0">
                <ProductTile product={p} sizes="(min-width: 1024px) 24vw, (min-width: 768px) 33vw, 50vw" priority={i < 2} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-start gap-3 border-t border-line py-14">
            <SearchX className="size-7 text-silver-3" strokeWidth={1.5} />
            <p className="title text-[24px]">Nenhum aparelho com essa combinação.</p>
            <p className="text-silver-2">Tente retirar alguns filtros ou buscar por outro termo.</p>
          </div>
        )}
        {more && (
          <div className="mt-12 flex justify-center">
            <Link scroll={false} href={`?${toParams({ ...query, pagina: query.pagina + 1 })}`} className="btn btn-secondary">
              Carregar mais
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
