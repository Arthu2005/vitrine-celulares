import Link from 'next/link'
import { getCatalog, phones } from '@/lib/catalog'
import { mediaUrl } from '@/lib/media-lookup'
import { priceInfo, primaryImage, searchText } from '@/lib/product-utils'
import { getStore } from '@/lib/settings'
import { STATIC_SITE } from '@/lib/site-mode'
import { CompareTray } from '@/components/site/compare-tray'
import { Header, type NavData } from '@/components/site/header'
import { ShelfProvider } from '@/components/site/shelf'
import { StorePublicProvider } from '@/components/site/store-context'

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [store, catalog] = await Promise.all([getStore(), getCatalog()])
  const logoUrl = await mediaUrl(store.logoMediaId)
  const used = new Set(catalog.products.map((p) => p.brand?.id))
  const usedCats = new Set(catalog.products.map((p) => p.category?.id))
  const nav: NavData = {
    logoUrl,
    brands: catalog.brands.filter((b) => b.showInNav && used.has(b.id)).map((b) => ({ name: b.name, href: `/marca/${b.slug}` })),
    categories: catalog.categories.filter((c) => c.showInNav && usedCats.has(c.id)).map((c) => ({ name: c.name, href: `/categoria/${c.slug}` })),
    collections: catalog.collections.filter((c) => c.productIds.length).map((c) => ({ name: c.name, href: `/colecao/${c.slug}` })),
    hasOffers: catalog.products.some((p) => priceInfo(p).onSale || p.variants.some((v) => v.promoPrice != null)),
    search: STATIC_SITE ? catalog.products.map((p) => ({ slug: p.slug, name: p.name, brand: p.brand?.name ?? '', image: primaryImage(p)?.url ?? null, text: searchText(p) })) : undefined,
  }
  const tray = phones(catalog).map((p) => ({ slug: p.slug, name: p.name, image: primaryImage(p)?.url ?? null }))
  const slugs = catalog.products.map((p) => p.slug)

  return (
    <StorePublicProvider value={{ name: store.name, whatsapp: store.whatsapp, whatsappTemplate: store.whatsappTemplate }}>
      <ShelfProvider validSlugs={slugs}>
        {store.notice && <p className="bg-accent px-4 py-1.5 text-center text-[13px] font-[560] text-on-accent">{store.notice}</p>}
        {store.demoNotice && (
          <p className="border-b border-line bg-ink-1 px-4 py-1.5 text-center font-mono text-[12px] text-silver-2">
            Ambiente de demonstração: aparelhos, marcas, preços e especificações são fictícios.
          </p>
        )}
        <Header nav={nav} />
        <main className="min-h-[60vh]">{children}</main>
        <footer className="mt-[var(--section)] border-t border-line pb-24 lg:pb-8">
          <div className="shell grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <p className="title text-[24px]">{store.name}</p>
              {store.address && <p className="mt-3 max-w-[40ch] text-silver-2">{store.address}</p>}
              {store.phone && <p className="mt-1 text-silver-2">{store.phone}</p>}
              {store.email && <p className="mt-1 text-silver-2">{store.email}</p>}
              {store.socials.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-3">
                  {store.socials.map((s) => (
                    <li key={s.url}>
                      <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 text-silver-2 hover:text-silver-1">
                                                {s.label}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="label mb-2">Vitrine</p>
              {[['/celulares', 'Todos os celulares'], ['/encontre', 'Encontrar meu celular'], ['/comparar', 'Comparar aparelhos'], ['/favoritos', 'Favoritos']].map(([href, label]) => (
                <Link key={href} href={href} className="flex min-h-9 items-center text-silver-2 hover:text-silver-1">
                  {label}
                </Link>
              ))}
            </div>
            <div>
              <p className="label mb-2">Loja</p>
              {[['/loja', 'Sobre a loja e garantia'], ['/privacidade', 'Política de privacidade'], ...(store.terms ? [['/termos', 'Termos de uso']] : [])].map(([href, label]) => (
                <Link key={href} href={href} className="flex min-h-9 items-center text-silver-2 hover:text-silver-1">
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </footer>
        <CompareTray items={tray} />
      </ShelfProvider>
    </StorePublicProvider>
  )
}
