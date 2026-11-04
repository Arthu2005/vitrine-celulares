'use client'

import { Check, ChevronDown, Link2, Plus, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AVAILABILITY, CONDITIONS, SPEC_GROUPS, type SpecField } from '@/lib/constants'
import { track } from '@/lib/client/track'
import { brl, num } from '@/lib/format'
import { priceInfo, primaryImage, rams, specValue, storages } from '@/lib/product-utils'
import { BASE_PATH } from '@/lib/site-mode'
import type { Product } from '@/lib/types'
import { compareMessage, waLink } from '@/lib/whatsapp'
import { WhatsAppIcon } from './icons'
import { Picture } from './picture'
import { MAX_COMPARE, useShelf } from './shelf'
import { useStorePublic } from './store-context'

type Row = { label: string; values: string[]; best: number[] }

function bestIndexes(values: (number | null)[], direction?: 'higher' | 'lower') {
  if (!direction || values.some((v) => v == null)) return []
  const numbers = values as number[]
  if (new Set(numbers).size < 2) return []
  const target = direction === 'higher' ? Math.max(...numbers) : Math.min(...numbers)
  return numbers.flatMap((v, i) => (v === target ? [i] : []))
}

function fieldRow(f: SpecField, items: Product[]): Row | null {
  const values = items.map((p) => specValue(p, f.key))
  if (values.every((v) => !v)) return null
  return { label: f.label, values: values.map((v) => v || '—'), best: bestIndexes(items.map((p) => num(p.specs[f.key])), f.better) }
}

function buildSections(items: Product[]) {
  const prices = items.map((p) => priceInfo(p))
  const comercial: Row[] = [
    { label: 'Preço', values: prices.map((i) => (i.hidden || i.current == null ? 'Consulte o preço' : `${i.from ? 'a partir de ' : ''}${brl(i.current)}`)), best: bestIndexes(prices.map((i) => (i.hidden ? null : i.current)), 'lower') },
    { label: 'Condição', values: items.map((p) => CONDITIONS[p.condition]), best: [] },
    { label: 'Disponibilidade', values: items.map((p) => AVAILABILITY[p.availability]), best: [] },
    { label: 'Garantia', values: items.map((p) => p.warranty || '—'), best: [] },
    { label: 'Armazenamento disponível', values: items.map((p) => storages(p).join(', ') || '—'), best: [] },
    { label: 'Memória disponível', values: items.map((p) => rams(p).join(', ') || '—'), best: [] },
  ]
  return [
    { id: 'comercial', title: 'Comercial', rows: comercial },
    ...SPEC_GROUPS.map((g) => ({ id: g.id, title: g.title, rows: g.fields.filter((f) => f.compare).flatMap((f) => fieldRow(f, items) ?? []) })).filter((g) => g.rows.length),
  ]
}

export function CompareView({ items, options }: { items: Product[]; options: { slug: string; name: string }[] }) {
  const store = useStorePublic()
  const router = useRouter()
  const path = usePathname()
  const { compare, setCompare } = useShelf()
  const [copied, setCopied] = useState(false)
  const slugs = items.map((p) => p.slug)

  useEffect(() => {
    // Abriu sem nada no endereço: recupera a seleção guardada.
    if (!items.length && compare.length) router.replace(`${path}?m=${compare.join(',')}`)
  }, [items.length, compare, path, router])

  useEffect(() => {
    if (items.length >= 2) track('compare', { label: items.map((p) => p.name).sort().join(' × ') })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugs.join(',')])

  const update = (next: string[]) => {
    setCompare(next)
    router.replace(next.length ? `${path}?m=${next.join(',')}` : path, { scroll: false })
  }

  const url = () => `${window.location.origin}${BASE_PATH}${path}?m=${slugs.join(',')}`
  const share = async () => {
    track('share', { label: 'comparação' })
    await navigator.clipboard.writeText(url())
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }

  const sections = items.length >= 2 ? buildSections(items) : []
  const leads = items.map((_, i) => sections.flatMap((s) => s.rows.filter((r) => r.best.length === 1 && r.best[0] === i).map((r) => r.label)))
  const available = options.filter((o) => !slugs.includes(o.slug))
  const cols = items.length

  return (
    <div className="shell pt-8 md:pt-12">
      <p className="label mb-3">Comparador</p>
      <h1 className="display text-[40px] md:text-[72px]">Lado a lado, sem atalhos.</h1>
      <p className="mt-3 max-w-[56ch] text-silver-2">Só comparamos o que foi cadastrado. O destaque marca o melhor número em cada linha; a escolha certa depende do seu uso.</p>

      <div className={`sticky top-16 z-20 -mx-[var(--gutter)] mt-8 grid gap-3 bg-ink-0/95 px-[var(--gutter)] py-3 backdrop-blur-md ${items.length >= 3 ? 'grid-cols-3' : 'grid-cols-2'} md:grid-cols-[220px_repeat(3,1fr)]`}>
        <div className="hidden md:block" />
        {items.map((p) => {
          const image = primaryImage(p)
          return (
            <div key={p.id} className="relative min-w-0 border-t border-accent pt-2">
              <button type="button" aria-label={`Remover ${p.name}`} onClick={() => update(slugs.filter((s) => s !== p.slug))} className="absolute -right-1 top-1 grid size-8 place-items-center text-silver-3 hover:text-silver-1">
                <X className="size-4" strokeWidth={1.5} />
              </button>
              {image && <Picture item={image} alt="" sizes="160px" className="h-20 w-auto object-contain md:h-32" />}
              <Link href={`/celulares/${p.slug}`} className="title mt-1 line-clamp-2 block pr-4 text-[15px] md:text-[20px]">
                {p.name}
              </Link>
            </div>
          )
        })}
        {items.length < MAX_COMPARE && (
          <label className="flex min-h-24 min-w-0 flex-col justify-center gap-2 rounded-md border border-dashed border-line p-2 text-silver-3">
            <span className="flex items-center gap-1 text-[13px]">
              <Plus className="size-4" strokeWidth={1.5} /> Adicionar
            </span>
            <select value="" aria-label="Adicionar aparelho à comparação" onChange={(e) => e.target.value && update([...slugs, e.target.value])} className="h-10 w-full rounded-md border border-line bg-ink-1 px-1 text-[14px] text-silver-1">
              <option value="">Escolher</option>
              {available.map((o) => (
                <option key={o.slug} value={o.slug}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {items.length < 2 ? (
        <p className="border-t border-line py-10 text-silver-2">Escolha pelo menos dois aparelhos para ver as diferenças.</p>
      ) : (
        <>
          <section aria-label="Onde cada aparelho se destaca" className="mt-6 grid gap-3 md:grid-cols-3">
            {items.map((p, i) => (
              <div key={p.id} className="rounded-md border border-line p-4">
                <p className="font-[560]">{p.name}</p>
                <p className="mt-1 text-[14px] text-silver-2">{leads[i].length ? `Lidera em: ${leads[i].join(', ').toLowerCase()}.` : 'Não lidera nenhuma linha com número comparável.'}</p>
              </div>
            ))}
          </section>

          <div className="mt-8">
            {sections.map((s, i) => (
              <details key={s.id} open={i < 4} className="group border-t border-line">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between text-[18px] [&::-webkit-details-marker]:hidden">
                  {s.title}
                  <ChevronDown className="size-5 text-silver-3 transition-transform group-open:rotate-180" strokeWidth={1.5} />
                </summary>
                <div className="pb-4">
                  {s.rows.map((r) => (
                    <div key={r.label} className="grid gap-x-3 border-t border-line/50 py-2.5 md:grid-cols-[220px_repeat(3,1fr)]">
                      <p className="mb-1 text-[13px] text-silver-3 md:mb-0 md:text-[15px]">{r.label}</p>
                      <div className={`grid gap-3 md:contents ${cols >= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                        {r.values.map((v, vi) => (
                          <p key={vi} className={`min-w-0 break-words text-[14px] md:text-[15px] ${r.best.includes(vi) ? 'text-accent' : ''}`}>
                            {r.best.includes(vi) && <span className="sr-only">Melhor valor: </span>}
                            {v}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-2 sm:flex-row">
            <a
              href={waLink(store.whatsapp, compareMessage(items, typeof window === 'undefined' ? '' : url()))}
              target="_blank"
              rel="noreferrer"
              onClick={() => track('whatsapp_click', { label: `comparação: ${items.map((p) => p.name).join(' × ')}` })}
              className="btn btn-primary"
            >
              <WhatsAppIcon /> Me ajude a escolher
            </a>
            <button type="button" onClick={share} className="btn btn-secondary">
              {copied ? <Check className="size-4 text-accent" strokeWidth={1.5} /> : <Link2 className="size-4" strokeWidth={1.5} />} {copied ? 'Link copiado' : 'Compartilhar comparação'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
