'use client'

import { ChevronDown, GitCompareArrows, Heart, Home, LayoutGrid, Menu, Search, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { track } from '@/lib/client/track'
import { norm } from '@/lib/format'
import { waLink } from '@/lib/whatsapp'
import { WhatsAppIcon } from './icons'
import { useShelf } from './shelf'
import { useStorePublic } from './store-context'

export type NavData = {
  logoUrl: string | null
  brands: { name: string; href: string }[]
  categories: { name: string; href: string }[]
  collections: { name: string; href: string }[]
  hasOffers: boolean
  /** Só na versão estática, em que não existe /api/search. */
  search?: (Hit & { text: string })[]
}

type Hit = { slug: string; name: string; brand: string; image: string | null }

function SearchPanel({ onClose, index }: { onClose: () => void; index?: NavData['search'] }) {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<Hit[]>([])

  useEffect(() => {
    input.current?.focus()
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  useEffect(() => {
    const term = q.trim()
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      if (term.length < 2) return setHits([])
      if (index) {
        const tokens = norm(term).split(/\s+/)
        return setHits(index.filter((h) => tokens.every((t) => h.text.includes(t))).slice(0, 6))
      }
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        if (res.ok) setHits(await res.json())
      } catch {
        // A busca completa continua disponível ao enviar o formulário.
      }
    }, 160)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [q, index])

  return (
    <div role="dialog" aria-label="Buscar aparelhos" className="fixed inset-0 z-50 bg-ink-0/90 backdrop-blur-sm" onClick={onClose}>
      <div className="shell pt-5 md:pt-16" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto max-w-[720px]">
          <form
            action="/celulares"
            onSubmit={(e) => {
              e.preventDefault()
              onClose()
              router.push(`/celulares?q=${encodeURIComponent(q.trim())}`)
            }}
            className="flex items-center gap-3 border-b border-silver-3 pb-2"
          >
            <Search className="size-5 shrink-0 text-silver-3" strokeWidth={1.5} />
            <input ref={input} name="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Modelo, marca ou especificação" enterKeyHint="search" className="title min-w-0 flex-1 bg-transparent text-[22px] outline-none placeholder:text-silver-3 md:text-[32px]" />
            <button type="button" aria-label="Fechar busca" onClick={onClose} className="grid size-10 place-items-center text-silver-2">
              <X className="size-5" strokeWidth={1.5} />
            </button>
          </form>
          <ul className="mt-4">
            {hits.map((h) => (
              <li key={h.slug}>
                <Link href={`/celulares/${h.slug}`} onClick={onClose} className="flex items-center gap-4 rounded-md px-2 py-2 hover:bg-ink-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {h.image ? <img src={h.image} alt="" className="h-14 w-11 object-contain" /> : <span className="h-14 w-11" />}
                  <span className="min-w-0">
                    <span className="block truncate">{h.name}</span>
                    <span className="block truncate text-[14px] text-silver-3">{h.brand}</span>
                  </span>
                </Link>
              </li>
            ))}
            {q.trim().length >= 2 && !hits.length && <li className="px-2 py-3 text-silver-3">Pressione Enter para buscar em todo o catálogo.</li>}
          </ul>
        </div>
      </div>
    </div>
  )
}

export function Header({ nav }: { nav: NavData }) {
  const store = useStorePublic()
  const shelf = useShelf()
  const path = usePathname()
  const [menu, setMenu] = useState(false)
  const [brandsOpen, setBrandsOpen] = useState(false)
  const [search, setSearch] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    // Fecha os menus ao navegar.
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setMenu(false)
    setBrandsOpen(false)
  }, [path])

  const links = [
    { name: 'Todos os celulares', href: '/celulares' },
    ...nav.categories,
    ...(nav.hasOffers ? [{ name: 'Ofertas', href: '/celulares?oferta=1' }] : []),
    { name: 'Comparar', href: '/comparar' },
  ]
  const contact = waLink(store.whatsapp, `Olá! Vim pelo site da ${store.name}.`)
  const onDevicePage = path.startsWith('/celulares/')
  const open = () => {
    clearTimeout(closeTimer.current)
    setBrandsOpen(true)
  }
  const close = () => {
    closeTimer.current = setTimeout(() => setBrandsOpen(false), 180)
  }

  return (
    <>
      <header className={`sticky top-0 z-40 transition-colors duration-300 ${scrolled || brandsOpen ? 'border-b border-line bg-ink-0/92 backdrop-blur-md' : 'border-b border-transparent'}`}>
        <div className="shell flex h-16 items-center gap-6">
          <Link href="/" className="flex min-w-0 items-center gap-2" aria-label={`${store.name}, início`}>
            {nav.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={nav.logoUrl} alt="" className="h-8 w-auto max-w-[150px] object-contain" />
            ) : (
              <span className="title truncate text-[19px]">{store.name}</span>
            )}
          </Link>

          <nav aria-label="Principal" className="hidden flex-1 items-center gap-1 lg:flex">
            <div className="relative" onMouseEnter={open} onMouseLeave={close}>
              <button type="button" aria-expanded={brandsOpen} onClick={() => setBrandsOpen((v) => !v)} className="flex h-10 items-center gap-1 rounded-md px-3 text-[15px] text-silver-2 hover:text-silver-1">
                Marcas <ChevronDown className={`size-4 transition-transform ${brandsOpen ? 'rotate-180' : ''}`} strokeWidth={1.5} />
              </button>
            </div>
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="flex h-10 items-center rounded-md px-3 text-[15px] text-silver-2 hover:text-silver-1">
                {l.name}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <button type="button" aria-label="Buscar" onClick={() => setSearch(true)} className="grid size-10 place-items-center text-silver-2 hover:text-silver-1">
              <Search className="size-5" strokeWidth={1.5} />
            </button>
            <Link href="/favoritos" aria-label={`Favoritos (${shelf.favorites.length})`} className="relative hidden size-10 place-items-center text-silver-2 hover:text-silver-1 sm:grid">
              <Heart className="size-5" strokeWidth={1.5} />
              {shelf.favorites.length > 0 && <span className="absolute right-1 top-1 size-2 rounded-full bg-accent" />}
            </Link>
            <a href={contact} target="_blank" rel="noreferrer" onClick={() => track('whatsapp_click', { label: 'cabeçalho' })} className="btn btn-primary ml-2 hidden !min-h-10 !px-4 !text-[14px] lg:inline-flex">
              <WhatsAppIcon /> Falar com a loja
            </a>
            <button type="button" aria-label={menu ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menu} onClick={() => setMenu((v) => !v)} className="grid size-10 place-items-center text-silver-1 lg:hidden">
              {menu ? <X className="size-6" strokeWidth={1.5} /> : <Menu className="size-6" strokeWidth={1.5} />}
            </button>
          </div>
        </div>

        {brandsOpen && (
          <div className="hidden border-t border-line lg:block" onMouseEnter={open} onMouseLeave={close}>
            <div className="shell grid grid-cols-[1fr_1fr_auto] gap-10 py-8">
              <div>
                <p className="label mb-3">Marcas</p>
                <ul className="grid grid-cols-2 gap-x-6">
                  {nav.brands.map((b) => (
                    <li key={b.href}>
                      <Link href={b.href} className="title block py-1 text-[22px] text-silver-2 hover:text-silver-1">
                        {b.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              {nav.collections.length > 0 && (
                <div>
                  <p className="label mb-3">Coleções</p>
                  <ul>
                    {nav.collections.map((c) => (
                      <li key={c.href}>
                        <Link href={c.href} className="block py-1 text-silver-2 hover:text-silver-1">
                          {c.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <Link href="/encontre" className="btn btn-secondary self-start">
                Encontrar meu próximo celular
              </Link>
            </div>
          </div>
        )}
      </header>

      {menu && (
        <div className="fixed inset-x-0 bottom-0 top-16 z-30 overflow-y-auto bg-ink-0 pb-28 lg:hidden">
          <nav aria-label="Menu" className="shell flex flex-col justify-end pt-4">
            {nav.brands.length > 0 && <p className="label mt-2">Marcas</p>}
            {nav.brands.map((b) => (
              <Link key={b.href} href={b.href} className="title flex min-h-12 items-center text-[24px]">
                {b.name}
              </Link>
            ))}
            <p className="label mt-6">Vitrine</p>
            {[...links, { name: 'Encontrar meu celular', href: '/encontre' }, ...nav.collections, { name: 'Favoritos', href: '/favoritos' }, { name: 'A loja', href: '/loja' }].map((l) => (
              <Link key={l.href} href={l.href} className="flex min-h-12 items-center border-b border-line text-[17px] text-silver-2">
                {l.name}
              </Link>
            ))}
          </nav>
        </div>
      )}

      {search && <SearchPanel onClose={() => setSearch(false)} index={nav.search} />}

      {/* Barra inferior: alcançável com o polegar. Na página do aparelho, dá lugar à barra de compra. */}
      {!onDevicePage && (
        <nav aria-label="Atalhos" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-ink-0/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
          <DockLink href="/" label="Início" icon={<Home className="size-5" strokeWidth={1.5} />} />
          <DockLink href="/celulares" label="Celulares" icon={<LayoutGrid className="size-5" strokeWidth={1.5} />} />
          <button type="button" onClick={() => setSearch(true)} className="flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] text-silver-2">
            <Search className="size-5" strokeWidth={1.5} /> Buscar
          </button>
          <DockLink href="/comparar" label="Comparar" count={shelf.compare.length} icon={<GitCompareArrows className="size-5" strokeWidth={1.5} />} />
          <a href={contact} target="_blank" rel="noreferrer" onClick={() => track('whatsapp_click', { label: 'barra inferior' })} className="flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] text-accent">
            <WhatsAppIcon className="size-5" /> WhatsApp
          </a>
        </nav>
      )}
    </>
  )
}

function DockLink({ href, label, icon, count }: { href: string; label: string; icon: React.ReactNode; count?: number }) {
  const path = usePathname()
  const active = href === '/' ? path === '/' : path.startsWith(href)
  return (
    <Link href={href} aria-current={active ? 'page' : undefined} className={`relative flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] ${active ? 'text-silver-1' : 'text-silver-2'}`}>
      {icon}
      {label}
      {!!count && <span className="absolute right-[26%] top-1.5 grid size-4 place-items-center rounded-full bg-accent font-mono text-[10px] text-on-accent">{count}</span>}
    </Link>
  )
}
