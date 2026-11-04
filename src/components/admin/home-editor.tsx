'use client'

import { ArrowDown, ArrowUp, ChevronDown, ExternalLink, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { saveHome } from '@/app/admin/actions'
import { SPEC_FIELDS } from '@/lib/constants'
import type { Block, HomeConfig } from '@/lib/schemas'
import { MediaPicker } from './media-picker'
import { Field, Section, Toggle, useDirtyGuard, useToast } from './ui'

type Option = { id: string; name: string }

const BLOCK_LABEL: Record<Block['type'], string> = {
  rail: 'Fileira de produtos',
  spotlight: 'Aparelho em destaque',
  collections: 'Coleções',
  banner: 'Banner',
  finder: 'Chamada do assistente',
  compare: 'Chamada do comparador',
  text: 'Texto institucional',
  store: 'Informações da loja',
}

const RAIL_SOURCES: Record<string, string> = {
  destaques: 'Destaques da loja',
  novidades: 'Lançamentos',
  ofertas: 'Aparelhos em oferta',
  recentes: 'Recém-adicionados',
  premium: 'Modelos premium (maior preço)',
  camera: 'Melhores câmeras',
  desempenho: 'Melhor desempenho',
  bateria: 'Bateria para o dia inteiro',
  custo: 'Melhor custo-benefício',
  colecao: 'Uma coleção',
  manual: 'Escolha manual',
}

const NEW_BLOCK = (type: Block['type']): Block => {
  const base = { id: crypto.randomUUID(), enabled: true, title: 'Novo bloco' }
  switch (type) {
    case 'rail':
      return { ...base, type, eyebrow: '', source: 'destaques', productIds: [], collectionId: null, limit: 8 }
    case 'spotlight':
      return { ...base, type, eyebrow: '', text: '', productId: null, specKeys: [] }
    case 'collections':
      return { ...base, type, eyebrow: '' }
    case 'banner':
      return { ...base, type, text: '', imageMediaId: null, ctaLabel: '', ctaHref: '' }
    case 'compare':
      return { ...base, type, text: '', productIds: [] }
    case 'finder':
    case 'text':
      return { ...base, type, text: '' }
    case 'store':
      return { ...base, type }
  }
}

function ProductChips({ products, selected, onChange, max }: { products: Option[]; selected: string[]; onChange: (ids: string[]) => void; max?: number }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {products.map((p) => {
        const on = selected.includes(p.id)
        return (
          <button key={p.id} type="button" aria-pressed={on} disabled={!on && !!max && selected.length >= max} onClick={() => onChange(on ? selected.filter((x) => x !== p.id) : [...selected, p.id])} className="chip !min-h-9 !text-[13px] disabled:opacity-40">
            {p.name}
          </button>
        )
      })}
    </div>
  )
}

function SpecChips({ selected, onChange, max }: { selected: string[]; onChange: (keys: string[]) => void; max: number }) {
  const options = SPEC_FIELDS.filter((f) => f.numeric || f.key === 'processador')
  return <ProductChips products={options.map((f) => ({ id: f.key, name: f.label }))} selected={selected} onChange={onChange} max={max} />
}

export function HomeEditor({ initial, pending: hasDraft, products, collections, imageUrls }: { initial: HomeConfig; pending: boolean; products: Option[]; collections: Option[]; imageUrls: Record<string, string> }) {
  const toast = useToast()
  const router = useRouter()
  const [form, setForm] = useState(initial)
  const [dirty, setDirty] = useState(false)
  const [pending, start] = useTransition()
  const [images, setImages] = useState(imageUrls)
  const [open, setOpen] = useState<string | null>(null)
  const [picker, setPicker] = useState<((id: string, url: string) => void) | null>(null)
  useDirtyGuard(dirty)

  const update = (next: HomeConfig) => {
    setForm(next)
    setDirty(true)
  }
  const hero = (patch: Partial<HomeConfig['hero']>) => update({ ...form, hero: { ...form.hero, ...patch } })
  const block = (id: string, patch: object) => update({ ...form, blocks: form.blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)) })
  const move = (i: number, dir: -1 | 1) => {
    const list = [...form.blocks]
    const j = i + dir
    if (j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
    update({ ...form, blocks: list })
  }

  const save = (mode: 'draft' | 'publish', after?: () => void) =>
    start(async () => {
      const res = await saveHome(form, mode)
      if (!res.ok) return toast('bad', res.error)
      setDirty(false)
      toast('ok', mode === 'publish' ? 'Página inicial publicada.' : 'Rascunho salvo.')
      after?.()
      router.refresh()
    })

  const icon = 'grid size-10 place-items-center rounded-md text-silver-2 hover:bg-ink-3'

  return (
    <div className="space-y-4 pb-24">
      {hasDraft && <p className="rounded-md border border-warn/40 p-3 text-[14px]">Há um rascunho ainda não publicado. A vitrine mostra a versão anterior.</p>}

      <Section title="Destaque principal" description="A primeira impressão. Pouco texto: o aparelho é o protagonista.">
        <Field label="Etiqueta">
          <input value={form.hero.eyebrow} onChange={(e) => hero({ eyebrow: e.target.value })} className="field" />
        </Field>
        <Field label="Título">
          <input value={form.hero.title} onChange={(e) => hero({ title: e.target.value })} className="field" />
        </Field>
        <Field label="Subtítulo">
          <textarea rows={2} value={form.hero.subtitle} onChange={(e) => hero({ subtitle: e.target.value })} className="field" />
        </Field>
        <Field label="Aparelho em destaque" hint="Se ele tiver modelo 3D, o destaque gira em tempo real.">
          <select value={form.hero.productId ?? ''} onChange={(e) => hero({ productId: e.target.value || null })} className="field">
            <option value="">Nenhum</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <div>
          <p className="mb-1 text-[14px] text-silver-2">Imagem do destaque (usada até o 3D carregar)</p>
          <div className="flex flex-wrap items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {form.hero.imageMediaId && images[form.hero.imageMediaId] && <img src={images[form.hero.imageMediaId]} alt="" className="h-20 w-20 object-contain" />}
            <button type="button" onClick={() => setPicker(() => (id: string, url: string) => { setImages((m) => ({ ...m, [id]: url })); hero({ imageMediaId: id }) })} className="btn btn-secondary">
              Escolher imagem
            </button>
            {form.hero.imageMediaId && (
              <button type="button" onClick={() => hero({ imageMediaId: null })} className="btn btn-quiet">
                Retirar
              </button>
            )}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Botão principal">
            <input value={form.hero.primaryLabel} onChange={(e) => hero({ primaryLabel: e.target.value })} className="field" />
          </Field>
          <Field label="Destino">
            <input value={form.hero.primaryHref} onChange={(e) => hero({ primaryHref: e.target.value })} className="field" />
          </Field>
          <Field label="Botão secundário">
            <input value={form.hero.secondaryLabel} onChange={(e) => hero({ secondaryLabel: e.target.value })} className="field" />
          </Field>
          <Field label="Destino">
            <input value={form.hero.secondaryHref} onChange={(e) => hero({ secondaryHref: e.target.value })} className="field" />
          </Field>
        </div>
        <div>
          <p className="mb-2 text-[14px] text-silver-2">Números exibidos ao lado do aparelho (até 3)</p>
          <SpecChips selected={form.hero.specKeys} onChange={(specKeys) => hero({ specKeys })} max={3} />
        </div>
      </Section>

      <Section title="Seções da página">
        <ul className="space-y-2">
          {form.blocks.map((b, i) => (
            <li key={b.id} className="rounded-md border border-line">
              <div className="flex flex-wrap items-center gap-1 p-2">
                <button type="button" aria-expanded={open === b.id} onClick={() => setOpen(open === b.id ? null : b.id)} className="flex min-h-10 min-w-[160px] flex-1 items-center gap-2 text-left">
                  <ChevronDown className={`size-4 shrink-0 text-silver-3 transition-transform ${open === b.id ? 'rotate-180' : ''}`} strokeWidth={1.5} />
                  <span className="min-w-0">
                    <span className={`block truncate ${b.enabled ? '' : 'text-silver-3'}`}>{b.title || BLOCK_LABEL[b.type]}</span>
                    <span className="block truncate text-[12px] text-silver-3">{BLOCK_LABEL[b.type]}</span>
                  </span>
                </button>
                <button type="button" role="switch" aria-checked={b.enabled} aria-label={`Exibir ${b.title}`} onClick={() => block(b.id, { enabled: !b.enabled })} className={`relative h-6 w-10 shrink-0 rounded-full ${b.enabled ? 'bg-accent' : 'bg-ink-3'}`}>
                  <span className={`absolute top-1 size-4 rounded-full bg-silver-1 transition-all ${b.enabled ? 'left-5' : 'left-1'}`} />
                </button>
                <button type="button" aria-label="Mover para cima" onClick={() => move(i, -1)} className={icon}>
                  <ArrowUp className="size-4" strokeWidth={1.5} />
                </button>
                <button type="button" aria-label="Mover para baixo" onClick={() => move(i, 1)} className={icon}>
                  <ArrowDown className="size-4" strokeWidth={1.5} />
                </button>
              </div>
              {open === b.id && (
                <div className="space-y-4 border-t border-line p-3">
                  <Field label="Título">
                    <input value={b.title} onChange={(e) => block(b.id, { title: e.target.value })} className="field" />
                  </Field>
                  {'eyebrow' in b && (
                    <Field label="Etiqueta">
                      <input value={b.eyebrow} onChange={(e) => block(b.id, { eyebrow: e.target.value })} className="field" />
                    </Field>
                  )}
                  {'text' in b && (
                    <Field label="Texto">
                      <textarea rows={3} value={b.text} onChange={(e) => block(b.id, { text: e.target.value })} className="field" />
                    </Field>
                  )}
                  {b.type === 'rail' && (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="O que mostrar">
                          <select value={b.source} onChange={(e) => block(b.id, { source: e.target.value })} className="field">
                            {Object.entries(RAIL_SOURCES).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Quantidade máxima">
                          <input type="number" min={2} max={24} value={b.limit} onChange={(e) => block(b.id, { limit: Number(e.target.value) || 8 })} className="field" />
                        </Field>
                      </div>
                      {b.source === 'colecao' && (
                        <Field label="Coleção">
                          <select value={b.collectionId ?? ''} onChange={(e) => block(b.id, { collectionId: e.target.value || null })} className="field">
                            <option value="">Escolher</option>
                            {collections.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </Field>
                      )}
                      {b.source === 'manual' && <ProductChips products={products} selected={b.productIds} onChange={(productIds) => block(b.id, { productIds })} />}
                    </>
                  )}
                  {b.type === 'spotlight' && (
                    <>
                      <Field label="Aparelho">
                        <select value={b.productId ?? ''} onChange={(e) => block(b.id, { productId: e.target.value || null })} className="field">
                          <option value="">Escolher</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <SpecChips selected={b.specKeys} onChange={(specKeys) => block(b.id, { specKeys })} max={4} />
                    </>
                  )}
                  {b.type === 'compare' && (
                    <div>
                      <p className="mb-2 text-[14px] text-silver-2">Dois aparelhos sugeridos</p>
                      <ProductChips products={products} selected={b.productIds} onChange={(productIds) => block(b.id, { productIds })} max={2} />
                    </div>
                  )}
                  {b.type === 'banner' && (
                    <>
                      <div className="flex flex-wrap items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {b.imageMediaId && images[b.imageMediaId] && <img src={images[b.imageMediaId]} alt="" className="h-20 w-20 object-contain" />}
                        <button type="button" onClick={() => setPicker(() => (id: string, url: string) => { setImages((m) => ({ ...m, [id]: url })); block(b.id, { imageMediaId: id }) })} className="btn btn-secondary">
                          Escolher imagem
                        </button>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Texto do botão">
                          <input value={b.ctaLabel} onChange={(e) => block(b.id, { ctaLabel: e.target.value })} className="field" />
                        </Field>
                        <Field label="Destino do botão">
                          <input value={b.ctaHref} onChange={(e) => block(b.id, { ctaHref: e.target.value })} className="field" />
                        </Field>
                      </div>
                    </>
                  )}
                  <button type="button" onClick={() => update({ ...form, blocks: form.blocks.filter((x) => x.id !== b.id) })} className="btn btn-quiet">
                    <Trash2 className="size-4" strokeWidth={1.5} /> Remover seção
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(BLOCK_LABEL) as Block['type'][]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                const created = NEW_BLOCK(type)
                update({ ...form, blocks: [...form.blocks, created] })
                setOpen(created.id)
              }}
              className="chip !min-h-9 !text-[13px]"
            >
              <Plus className="size-3.5" strokeWidth={1.5} /> {BLOCK_LABEL[type]}
            </button>
          ))}
        </div>
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink-1/95 px-3 py-2 pb-[max(8px,env(safe-area-inset-bottom))] backdrop-blur-md md:left-[240px] md:px-8">
        <div className="mx-auto flex max-w-[1056px] items-center justify-end gap-2">
          <button
            type="button"
            disabled={pending}
            aria-label="Pré-visualizar"
            onClick={() => {
              const tab = window.open('about:blank', '_blank')
              save('draft', () => {
                if (tab) tab.location.href = '/preview/inicio'
              })
            }}
            className="btn btn-quiet"
          >
            <ExternalLink className="size-4" strokeWidth={1.5} /> <span className="hidden sm:inline">Pré-visualizar</span>
          </button>
          <button type="button" disabled={pending} onClick={() => save('draft')} className="btn btn-secondary flex-1 !px-3 sm:flex-none">
            Salvar rascunho
          </button>
          <button type="button" disabled={pending} onClick={() => save('publish')} className="btn btn-primary flex-1 !px-3 sm:flex-none">
            Publicar
          </button>
        </div>
      </div>

      {picker && (
        <MediaPicker
          kind="image"
          onClose={() => setPicker(null)}
          onPick={([row]) => {
            picker(row.id, row.url)
            setPicker(null)
          }}
        />
      )}
    </div>
  )
}
