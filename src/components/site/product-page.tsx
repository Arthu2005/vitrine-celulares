import { ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { SPEC_GROUPS, specField } from '@/lib/constants'
import { specValue } from '@/lib/product-utils'
import type { Product } from '@/lib/types'
import { ProductExperience } from './product-experience'
import { ProductTile } from './product-tile'
import { Rail } from './rail'

const KEY_SPECS = ['telaTamanho', 'camPrincipal', 'bateria', 'ram', 'taxa', 'processador']

export function ProductPage({ product, accessories, related, preview }: { product: Product; accessories: Product[]; related: Product[]; preview?: boolean }) {
  const keys = KEY_SPECS.filter((k) => product.specs[k]).slice(0, 4)
  const groups = SPEC_GROUPS.map((g) => ({ ...g, rows: g.fields.filter((f) => product.specs[f.key]) })).filter((g) => g.rows.length)

  return (
    <>
      <div className="shell pt-4 md:pt-8">
        <nav aria-label="Trilha" className="mb-4 truncate font-mono text-[12px] text-silver-3">
          <Link href="/celulares" className="hover:text-silver-1">
            Celulares
          </Link>
          {product.brand && (
            <>
              {' / '}
              <Link href={`/marca/${product.brand.slug}`} className="hover:text-silver-1">
                {product.brand.name}
              </Link>
            </>
          )}
        </nav>
        <ProductExperience product={product} preview={preview} />
      </div>

      {keys.length > 0 && (
        <section aria-label="Principais números" className="mt-16 border-y border-line bg-ink-1 md:mt-24">
          <dl className="shell grid grid-cols-2 gap-x-6 gap-y-8 py-10 md:grid-cols-4 md:py-14">
            {keys.map((k) => (
              <div key={k} className="readout min-w-0">
                <dt className="label">{specField(k)?.label}</dt>
                <dd className="title mt-2 text-[26px] md:text-[38px]">{specValue(product, k)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {(product.highlights.length > 0 || product.description) && (
        <section className="shell mt-16 grid gap-10 md:mt-24 md:grid-cols-12">
          {product.highlights.length > 0 && (
            <div className="md:col-span-5">
              <p className="label mb-4">Diferenciais</p>
              <ul className="space-y-3">
                {product.highlights.map((h) => (
                  <li key={h} className="title text-[24px] md:text-[30px]">
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {product.description && (
            <div className="md:col-span-6 md:col-start-7">
              <p className="label mb-4">Sobre o aparelho</p>
              <p className="max-w-[62ch] whitespace-pre-line text-[17px] text-silver-2">{product.description}</p>
            </div>
          )}
        </section>
      )}

      {(groups.length > 0 || product.customAttrs.length > 0) && (
        <section className="shell mt-16 md:mt-24">
          <h2 className="title text-[32px] md:text-[48px]">Ficha técnica</h2>
          <div className="mt-6 border-t border-line">
            {groups.map((g, i) => (
              <details key={g.id} open={i < 2} className="group border-b border-line">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between text-[18px] [&::-webkit-details-marker]:hidden">
                  {g.title}
                  <ChevronDown className="size-5 text-silver-3 transition-transform group-open:rotate-180" strokeWidth={1.5} />
                </summary>
                <dl className="grid gap-x-12 pb-5 md:grid-cols-2">
                  {g.rows.map((f) => (
                    <div key={f.key} className="flex justify-between gap-6 border-t border-line/50 py-2.5 text-[15px]">
                      <dt className="text-silver-3">{f.label}</dt>
                      <dd className="text-right">{specValue(product, f.key)}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            ))}
            {product.customAttrs.length > 0 && (
              <details className="group border-b border-line">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between text-[18px] [&::-webkit-details-marker]:hidden">
                  Outras características
                  <ChevronDown className="size-5 text-silver-3 transition-transform group-open:rotate-180" strokeWidth={1.5} />
                </summary>
                <dl className="grid gap-x-12 pb-5 md:grid-cols-2">
                  {product.customAttrs.map((a) => (
                    <div key={a.label} className="flex justify-between gap-6 border-t border-line/50 py-2.5 text-[15px]">
                      <dt className="text-silver-3">{a.label}</dt>
                      <dd className="text-right">{a.value}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            )}
          </div>
        </section>
      )}

      {accessories.length > 0 && (
        <section className="shell mt-16 md:mt-24">
          <h2 className="title text-[28px] md:text-[40px]">Acessórios compatíveis</h2>
          <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
            {accessories.map((a) => (
              <li key={a.id} className="min-w-0">
                <ProductTile product={a} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <Rail eyebrow="Continue explorando" title="Outros aparelhos" products={related} href="/celulares" />
    </>
  )
}
