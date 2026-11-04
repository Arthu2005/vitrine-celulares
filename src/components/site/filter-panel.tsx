'use client'

import { SlidersHorizontal, X } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { track } from '@/lib/client/track'
import { activeFilterCount, parseQuery, toParams, type CatalogQuery, type Facet, type Facets, type Sort } from '@/lib/filters'

type ListKey = 'marca' | 'armazenamento' | 'ram' | 'tela' | 'painel' | 'bateria' | 'cameras' | 'condicao' | 'disponibilidade' | 'extra'

const GROUPS: { key: ListKey; title: string }[] = [
  { key: 'marca', title: 'Marca' },
  { key: 'condicao', title: 'Condição' },
  { key: 'armazenamento', title: 'Armazenamento' },
  { key: 'ram', title: 'Memória RAM' },
  { key: 'tela', title: 'Tamanho de tela' },
  { key: 'painel', title: 'Tipo de tela' },
  { key: 'bateria', title: 'Bateria' },
  { key: 'cameras', title: 'Câmeras traseiras' },
  { key: 'disponibilidade', title: 'Disponibilidade' },
  { key: 'extra', title: 'Características' },
]

const useUpdater = () => {
  const router = useRouter()
  const path = usePathname()
  const [pending, start] = useTransition()
  const go = (next: CatalogQuery) => {
    const params = toParams({ ...next, pagina: 1 }).toString()
    start(() => router.replace(params ? `${path}?${params}` : path, { scroll: false }))
  }
  return { go, pending }
}

function Options({ group, query, onChange, hideBrand }: { group: { key: ListKey; title: string; facets: Facet[] }; query: CatalogQuery; onChange: (q: CatalogQuery) => void; hideBrand?: boolean }) {
  if (group.facets.length === 0 || (hideBrand && group.key === 'marca')) return null
  const selected = query[group.key]
  return (
    <fieldset className="border-b border-line py-4">
      <legend className="label mb-2">{group.title}</legend>
      <div className="flex flex-wrap gap-1.5 pt-1">
        {group.facets.map((f) => {
          const on = selected.includes(f.value)
          return (
            <button
              key={f.value}
              type="button"
              aria-pressed={on}
              onClick={() => {
                const values = on ? selected.filter((v) => v !== f.value) : [...selected, f.value]
                onChange({ ...query, [group.key]: values })
                track('filter_use', { label: group.key })
              }}
              className="chip !min-h-9 !px-3 !text-[13px]"
            >
              {f.label} <span className="font-mono text-[11px] text-silver-3">{f.count}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

function Price({ query, onChange }: { query: CatalogQuery; onChange: (q: CatalogQuery) => void }) {
  const [min, setMin] = useState(query.min?.toString() ?? '')
  const [max, setMax] = useState(query.max?.toString() ?? '')
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setMin(query.min?.toString() ?? '')
    setMax(query.max?.toString() ?? '')
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [query.min, query.max])
  const apply = () => {
    const toNumber = (v: string) => (v.trim() && Number.isFinite(Number(v)) ? Number(v) : null)
    onChange({ ...query, min: toNumber(min), max: toNumber(max) })
    track('filter_use', { label: 'preco' })
  }
  return (
    <fieldset className="border-b border-line py-4">
      <legend className="label mb-2">Faixa de preço (R$)</legend>
      <div className="flex items-center gap-2 pt-1">
        <input value={min} onChange={(e) => setMin(e.target.value)} onBlur={apply} onKeyDown={(e) => e.key === 'Enter' && apply()} inputMode="numeric" placeholder="Mínimo" aria-label="Preço mínimo" className="field !min-h-10" />
        <input value={max} onChange={(e) => setMax(e.target.value)} onBlur={apply} onKeyDown={(e) => e.key === 'Enter' && apply()} inputMode="numeric" placeholder="Máximo" aria-label="Preço máximo" className="field !min-h-10" />
      </div>
    </fieldset>
  )
}

export function FilterPanel({ facets, search, total, hideBrand }: { facets: Facets; search: string; total: number; hideBrand?: boolean }) {
  const query = parseQuery(Object.fromEntries(new URLSearchParams(search)))
  const { go, pending } = useUpdater()
  const [open, setOpen] = useState(false)
  const count = activeFilterCount(query)

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const groups = GROUPS.map((g) => ({ ...g, facets: facets[g.key] }))
  const clear = () => go({ ...parseQuery({}), q: query.q, ordem: query.ordem })
  const body = (
    <>
      <Price query={query} onChange={go} />
      <div className="flex items-center justify-between border-b border-line py-3">
        <span className="text-[15px]">Somente ofertas</span>
        <button type="button" role="switch" aria-checked={query.oferta} aria-label="Somente ofertas" onClick={() => go({ ...query, oferta: !query.oferta })} className={`relative h-7 w-12 rounded-full transition-colors ${query.oferta ? 'bg-accent' : 'bg-ink-3'}`}>
          <span className={`absolute top-1 size-5 rounded-full bg-silver-1 transition-all ${query.oferta ? 'left-6' : 'left-1'}`} />
        </button>
      </div>
      {groups.map((g) => (
        <Options key={g.key} group={g} query={query} onChange={go} hideBrand={hideBrand} />
      ))}
    </>
  )

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <button type="button" onClick={() => setOpen(true)} className="chip lg:hidden">
          <SlidersHorizontal className="size-4" strokeWidth={1.5} /> Filtros {count > 0 && <span className="font-mono text-accent">{count}</span>}
        </button>
        <p aria-live="polite" className={`order-last w-full text-[14px] text-silver-2 transition-opacity sm:order-none sm:w-auto ${pending ? 'opacity-50' : ''}`}>
          {total} {total === 1 ? 'aparelho encontrado' : 'aparelhos encontrados'}
        </p>
        {count > 0 && (
          <button type="button" onClick={clear} className="text-[14px] text-silver-2 underline underline-offset-4 hover:text-silver-1">
            Limpar filtros
          </button>
        )}
        <label className="ml-auto flex items-center gap-2 text-[14px] text-silver-3">
          <span className="hidden sm:inline">Ordenar</span>
          <select aria-label="Ordenar por" value={query.ordem} onChange={(e) => go({ ...query, ordem: e.target.value as Sort })} className="h-10 max-w-[150px] rounded-md border border-line bg-ink-1 px-2 text-[14px] text-silver-1">
            <option value="relevancia">Relevância</option>
            <option value="menor-preco">Menor preço</option>
            <option value="maior-preco">Maior preço</option>
            <option value="recentes">Mais recentes</option>
          </select>
        </label>
      </div>
      <aside aria-label="Filtros" className="hidden lg:absolute lg:left-0 lg:top-0 lg:block lg:w-[280px]">
        <div className="-mt-4">{body}</div>
      </aside>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Filtros" className="fixed inset-0 z-50 flex flex-col bg-ink-0 lg:hidden">
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-4">
            <p className="title text-[20px]">Filtros</p>
            <button type="button" aria-label="Fechar filtros" onClick={() => setOpen(false)} className="grid size-10 place-items-center">
              <X className="size-6" strokeWidth={1.5} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4">{body}</div>
          <div className="flex gap-2 border-t border-line p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
            <button type="button" onClick={clear} className="btn btn-secondary flex-1">
              Limpar
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn btn-primary flex-[2]">
              Ver {total} {total === 1 ? 'aparelho' : 'aparelhos'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
