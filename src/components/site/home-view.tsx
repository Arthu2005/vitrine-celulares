import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { specField } from '@/lib/constants'
import { railProducts } from '@/lib/home'
import { mediaItems } from '@/lib/media-lookup'
import { colors, primaryImage, specValue } from '@/lib/product-utils'
import type { HomeConfig, StoreConfig } from '@/lib/schemas'
import type { Catalog, Product } from '@/lib/types'
import { Hero } from './hero'
import { Picture } from './picture'
import { Rail } from './rail'
import { StoreInfo, hasStoreInfo } from './store-info'

function Spotlight({ product, eyebrow, title, text, specKeys }: { product: Product; eyebrow: string; title: string; text: string; specKeys: string[] }) {
  const image = product.media.find((m) => m.kind === 'image' && /costas|angulo/i.test(m.alt)) ?? primaryImage(product)
  const readouts = specKeys.flatMap((k) => (product.specs[k] ? [{ label: specField(k)?.label ?? k, value: specValue(product, k) }] : []))
  return (
    <section className="reveal mt-[var(--section)] overflow-hidden border-y border-line bg-ink-1">
      <div className="shell grid items-center gap-8 py-14 md:grid-cols-12 md:py-20">
        <div className="md:col-span-5">
          {eyebrow && <p className="label mb-3">{eyebrow}</p>}
          <h2 className="title text-[34px] md:text-[56px]">{title}</h2>
          {text && <p className="mt-4 max-w-[46ch] text-silver-2">{text}</p>}
          <Link href={`/celulares/${product.slug}`} className="btn btn-secondary mt-6">
            {product.model3d ? 'Explorar em 3D' : 'Ver aparelho'} <ArrowRight className="size-4" strokeWidth={1.5} />
          </Link>
        </div>
        <div className="platform relative aspect-[5/5] md:col-span-4">
          {image && (
            <div className="absolute inset-x-[12%] bottom-[11%] top-0">
              <Picture item={image} alt={image.alt || product.name} sizes="(min-width: 768px) 34vw, 90vw" className="size-full object-contain object-bottom" />
            </div>
          )}
        </div>
        {readouts.length > 0 && (
          <dl className="grid grid-cols-2 gap-6 md:col-span-3 md:grid-cols-1">
            {readouts.map((r) => (
              <div key={r.label} className="readout">
                <dt className="label">{r.label}</dt>
                <dd className="title mt-1 text-[26px] md:text-[32px]">{r.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  )
}

function Collections({ eyebrow, title, catalog }: { eyebrow: string; title: string; catalog: Catalog }) {
  const byId = new Map(catalog.products.map((p) => [p.id, p]))
  const list = catalog.collections.filter((c) => c.productIds.length)
  if (!list.length) return null
  return (
    <section className="reveal shell mt-[var(--section)]">
      {eyebrow && <p className="label mb-3">{eyebrow}</p>}
      {title && <h2 className="title max-w-[20ch] text-[32px] md:text-[48px]">{title}</h2>}
      <ul className="mt-8 grid gap-4 md:grid-cols-12">
        {list.map((c, i) => {
          const device = byId.get(c.productIds[0])
          const image = device && primaryImage(device)
          return (
            <li key={c.id} className={i % 3 === 0 ? 'md:col-span-7' : 'md:col-span-5'}>
              <Link href={`/colecao/${c.slug}`} className="group relative flex h-[280px] overflow-hidden rounded-lg border border-line bg-ink-1 p-6 transition-colors hover:border-white/30 md:h-[360px]">
                <div className="relative z-10 max-w-[58%]">
                  <h3 className="title text-[26px] md:text-[34px]">{c.name}</h3>
                  {c.description && <p className="mt-2 text-[15px] text-silver-3">{c.description}</p>}
                  <span className="mt-3 inline-block font-mono text-[12px] text-silver-2">
                    {c.productIds.length} {c.productIds.length === 1 ? 'aparelho' : 'aparelhos'}
                  </span>
                </div>
                {image && (
                  <div className="absolute -bottom-10 -right-2 h-[110%] w-[52%] rotate-[8deg] transition-transform duration-700 ease-(--ease-studio) group-hover:-translate-y-2 group-hover:rotate-[5deg]">
                    <Picture item={image} alt="" sizes="(min-width: 768px) 24vw, 50vw" className="size-full object-contain" />
                  </div>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export async function HomeView({ home, store, catalog }: { home: HomeConfig; store: StoreConfig; catalog: Catalog }) {
  const { hero, blocks } = home
  const byId = new Map(catalog.products.map((p) => [p.id, p]))
  const images = await mediaItems([hero.imageMediaId, ...blocks.map((b) => (b.type === 'banner' ? b.imageMediaId : null))])
  const heroProduct = hero.productId ? byId.get(hero.productId) : undefined
  const poster = (hero.imageMediaId ? images.get(hero.imageMediaId) : null) ?? (heroProduct ? primaryImage(heroProduct) : null)
  const heroColor = heroProduct ? colors(heroProduct)[0] : undefined

  return (
    <>
      <Hero
        eyebrow={hero.eyebrow}
        title={hero.title || store.name}
        subtitle={hero.subtitle}
        primary={hero.primaryLabel ? { label: hero.primaryLabel, href: hero.primaryHref } : null}
        secondary={hero.secondaryLabel ? { label: hero.secondaryLabel, href: hero.secondaryHref } : null}
        poster={poster}
        model={heroProduct?.model3d ? { url: heroProduct.model3d.url, tint: heroColor?.hex, tintMaterial: heroProduct.model3d.tintMaterial } : null}
        readouts={heroProduct ? hero.specKeys.flatMap((k) => (heroProduct.specs[k] ? [{ label: specField(k)?.label ?? k, value: specValue(heroProduct, k) }] : [])) : []}
        demoLabel={heroProduct?.isDemo}
      />
      {blocks
        .filter((b) => b.enabled)
        .map((b) => {
          switch (b.type) {
            case 'rail':
              return <Rail key={b.id} eyebrow={b.eyebrow} title={b.title} products={railProducts(b, catalog)} href={b.source === 'ofertas' ? '/celulares?oferta=1' : '/celulares'} />
            case 'spotlight': {
              const product = b.productId ? byId.get(b.productId) : undefined
              return product ? <Spotlight key={b.id} product={product} eyebrow={b.eyebrow} title={b.title} text={b.text} specKeys={b.specKeys} /> : null
            }
            case 'collections':
              return <Collections key={b.id} eyebrow={b.eyebrow} title={b.title} catalog={catalog} />
            case 'banner': {
              const image = b.imageMediaId ? images.get(b.imageMediaId) : null
              if (!b.title && !image) return null
              return (
                <section key={b.id} className="reveal shell mt-[var(--section)]">
                  <div className="relative flex min-h-[320px] items-center overflow-hidden rounded-lg border border-line bg-[radial-gradient(70%_120%_at_90%_60%,color-mix(in_srgb,var(--accent)_16%,transparent),transparent_70%)] p-6 md:p-12">
                    <div className="relative z-10 max-w-[56%]">
                      <h2 className="title text-[28px] md:text-[44px]">{b.title}</h2>
                      {b.text && <p className="mt-3 max-w-[44ch] text-silver-2">{b.text}</p>}
                      {b.ctaLabel && b.ctaHref && (
                        <Link href={b.ctaHref} className="btn btn-primary mt-5">
                          {b.ctaLabel}
                        </Link>
                      )}
                    </div>
                    {image && (
                      <div className="absolute -bottom-16 right-0 h-[130%] w-[46%] rotate-[10deg]">
                        <Picture item={image} alt={image.alt} sizes="46vw" className="size-full object-contain" />
                      </div>
                    )}
                  </div>
                </section>
              )
            }
            case 'finder':
              return (
                <section key={b.id} className="reveal shell mt-[var(--section)]">
                  <div className="grid gap-6 border-t border-accent pt-8 md:grid-cols-[1.2fr_1fr] md:items-end">
                    <h2 className="display text-[38px] md:text-[72px]">{b.title}</h2>
                    <div>
                      {b.text && <p className="max-w-[44ch] text-silver-2">{b.text}</p>}
                      <Link href="/encontre" className="btn btn-primary mt-5">
                        Encontrar meu próximo celular
                      </Link>
                    </div>
                  </div>
                </section>
              )
            case 'compare': {
              const pair = b.productIds.flatMap((id) => byId.get(id) ?? [])
              return (
                <section key={b.id} className="reveal shell mt-[var(--section)] grid items-center gap-8 md:grid-cols-2">
                  <div>
                    <h2 className="title text-[32px] md:text-[48px]">{b.title}</h2>
                    {b.text && <p className="mt-3 max-w-[44ch] text-silver-2">{b.text}</p>}
                    <Link href={pair.length ? `/comparar?m=${pair.map((p) => p.slug).join(',')}` : '/comparar'} className="btn btn-secondary mt-5">
                      Comparar aparelhos
                    </Link>
                  </div>
                  {pair.length === 2 && (
                    <div className="grid grid-cols-2 items-end gap-4">
                      {pair.map((p) => {
                        const image = primaryImage(p)
                        return (
                          <Link key={p.id} href={`/celulares/${p.slug}`} className="platform block aspect-[4/5]">
                            {image && (
                              <span className="absolute inset-x-[10%] bottom-[11%] top-0">
                                <Picture item={image} alt={p.name} sizes="24vw" className="size-full object-contain object-bottom" />
                              </span>
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </section>
              )
            }
            case 'text':
              return b.text || b.title ? (
                <section key={b.id} className="reveal shell mt-[var(--section)] max-w-[800px]">
                  <h2 className="title text-[32px]">{b.title}</h2>
                  <p className="mt-3 whitespace-pre-line text-silver-2">{b.text}</p>
                </section>
              ) : null
            case 'store':
              return hasStoreInfo(store) ? (
                <section key={b.id} className="reveal shell mt-[var(--section)]">
                  <h2 className="title mb-8 text-[32px] md:text-[48px]">{b.title}</h2>
                  <StoreInfo store={store} compact />
                </section>
              ) : null
          }
        })}
    </>
  )
}
