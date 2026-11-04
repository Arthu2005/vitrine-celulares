'use client'

import { ArrowDown, ArrowUp, Box, Copy, ExternalLink, Film, Plus, Trash2, X } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { saveProduct } from '@/app/admin/actions'
import type { MediaRow } from '@/app/admin/types'
import { AVAILABILITY, CONDITIONS, GOOD_FOR, SPEC_GROUPS } from '@/lib/constants'
import { moneyInput, parseMoney } from '@/lib/format'
import { slugify, type ProductInput } from '@/lib/schemas'
import { MediaPicker, MediaThumb, UploadButton } from './media-picker'
import { Field, Section, Toggle, useDirtyGuard, useToast } from './ui'

const ModelEditor = dynamic(() => import('./model-editor').then((m) => m.ModelEditor), { ssr: false })

type Option = { id: string; name: string }
export type MediaLookup = Record<string, MediaRow>

type Props = {
  id: string | null
  initial: ProductInput
  status: 'draft' | 'published' | null
  pendingDraft: boolean
  brands: Option[]
  categories: (Option & { isAccessory: boolean })[]
  collections: Option[]
  accessories: Option[]
  media: MediaLookup
}

const Money = ({ value, onChange, label, hint }: { value: number | null; onChange: (v: number | null) => void; label: string; hint?: string }) => {
  const [text, setText] = useState(moneyInput(value))
  return (
    <Field label={label} hint={hint}>
      <input
        inputMode="decimal"
        value={text}
        placeholder="0,00"
        onChange={(e) => {
          setText(e.target.value)
          onChange(parseMoney(e.target.value))
        }}
        onBlur={() => setText(moneyInput(parseMoney(text)))}
        className="field"
      />
    </Field>
  )
}

const Number_ = ({ value, onChange, label }: { value: number | null; onChange: (v: number | null) => void; label: string }) => (
  <Field label={label}>
    <input inputMode="numeric" value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Math.max(0, parseInt(e.target.value.replace(/\D/g, '')) || 0))} className="field" />
  </Field>
)

const SECTIONS = [
  ['essencial', 'Essencial'],
  ['comercial', 'Preço e estoque'],
  ['midia', 'Fotos'],
  ['modelo', 'Modelo 3D'],
  ['variantes', 'Variantes'],
  ['ficha', 'Ficha técnica'],
  ['vitrine', 'Vitrine e SEO'],
]

const emptyVariant = (): ProductInput['variants'][number] => ({ color: '', colorHex: '', storage: '', ram: '', condition: null, price: null, promoPrice: null, availability: 'disponivel', stock: null, sku: '', modelMediaId: null })

export function ProductEditor({ id, initial, status, pendingDraft, brands, categories, collections, accessories, media: initialMedia }: Props) {
  const router = useRouter()
  const toast = useToast()
  const [form, setForm] = useState(initial)
  const [dirty, setDirty] = useState(false)
  const [pending, start] = useTransition()
  const [media, setMedia] = useState(initialMedia)
  const [picker, setPicker] = useState<'gallery' | 'spin' | 'video' | null>(null)
  const [slugEdited, setSlugEdited] = useState(!!initial.slug)
  useDirtyGuard(dirty)

  const set = <K extends keyof ProductInput>(key: K, value: ProductInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setDirty(true)
  }
  const setSpec = (key: string, value: string) => set('specs', { ...form.specs, [key]: value })
  const remember = (rows: MediaRow[]) => setMedia((m) => ({ ...m, ...Object.fromEntries(rows.map((r) => [r.id, r])) }))

  const gallery = form.media.filter((m) => m.role === 'gallery')
  const spin = form.media.filter((m) => m.role === 'spin')
  const colorNames = useMemo(() => [...new Set(form.variants.map((v) => v.color).filter(Boolean))], [form.variants])

  const addMedia = (rows: MediaRow[], role: 'gallery' | 'spin') => {
    remember(rows)
    set('media', [...form.media, ...rows.filter((r) => !form.media.some((m) => m.mediaId === r.id && m.role === role)).map((r) => ({ mediaId: r.id, role, color: '' }))])
  }
  const moveMedia = (mediaId: string, dir: -1 | 1) => {
    const list = [...gallery]
    const i = list.findIndex((m) => m.mediaId === mediaId)
    const j = i + dir
    if (j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
    set('media', [...list, ...spin])
  }

  const variant = (i: number, patch: Partial<ProductInput['variants'][number]>) => set('variants', form.variants.map((v, n) => (n === i ? { ...v, ...patch } : v)))

  const save = (mode: 'draft' | 'publish', after?: (productId: string) => void) =>
    start(async () => {
      const res = await saveProduct(id, form, mode)
      if (!res.ok) {
        toast('bad', res.error, res.issues)
        return
      }
      setDirty(false)
      toast('ok', mode === 'publish' ? 'Publicado na vitrine.' : status === 'published' ? 'Rascunho salvo. A vitrine continua com a versão publicada.' : 'Rascunho salvo.')
      after?.(res.id)
      if (!id) router.replace(`/admin/produtos/${res.id}`)
      else router.refresh()
    })

  const preview = () => {
    const tab = window.open('about:blank', '_blank')
    save('draft', (productId) => {
      if (tab) tab.location.href = `/preview/produto/${productId}`
    })
  }

  return (
    <div className="pb-24">
      <nav aria-label="Seções do produto" className="no-scrollbar sticky top-14 z-20 -mx-3 mb-4 flex gap-1 overflow-x-auto bg-ink-0/95 px-3 py-2 backdrop-blur-md md:top-0 md:-mx-8 md:px-8">
        {SECTIONS.map(([sectionId, label]) => (
          <a key={sectionId} href={`#${sectionId}`} className="shrink-0 rounded-md px-3 py-2 text-[14px] text-silver-2 hover:bg-ink-3 hover:text-silver-1">
            {label}
          </a>
        ))}
      </nav>

      {pendingDraft && <p className="mb-4 rounded-md border border-warn/40 p-3 text-[14px]">Você está vendo alterações ainda não publicadas. A vitrine mostra a versão anterior até você publicar.</p>}

      <div className="space-y-4">
        <Section id="essencial" title="Essencial" description="O mínimo para um aparelho aparecer na vitrine: nome, marca, preço e uma foto.">
          <Field label="Nome comercial">
            <input
              value={form.name}
              onChange={(e) => {
                const name = e.target.value
                setForm((f) => ({ ...f, name, slug: slugEdited ? f.slug : slugify(name) }))
                setDirty(true)
              }}
              placeholder="Exemplo: Galaxy S25 128 GB"
              className="field"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Marca">
              <select value={form.brandId ?? ''} onChange={(e) => set('brandId', e.target.value || null)} className="field">
                <option value="">Escolher</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Categoria">
              <select value={form.categoryId ?? ''} onChange={(e) => set('categoryId', e.target.value || null)} className="field">
                <option value="">Sem categoria</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Modelo">
              <input value={form.model} onChange={(e) => set('model', e.target.value)} className="field" />
            </Field>
            <Field label="Código interno (SKU)">
              <input value={form.sku} onChange={(e) => set('sku', e.target.value)} className="field" />
            </Field>
          </div>
          <Field label="Endereço na vitrine" hint={`/celulares/${form.slug || '...'}`}>
            <input
              value={form.slug}
              onChange={(e) => {
                setSlugEdited(true)
                set('slug', slugify(e.target.value))
              }}
              className="field"
            />
          </Field>
          <Field label="Descrição curta">
            <textarea rows={2} maxLength={300} value={form.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} className="field" />
          </Field>
          <Field label="Descrição completa">
            <textarea rows={6} value={form.description} onChange={(e) => set('description', e.target.value)} className="field" />
          </Field>
        </Section>

        <Section id="comercial" title="Preço e estoque">
          <div className="grid gap-4 sm:grid-cols-2">
            <Money label="Preço de venda (R$)" value={form.price} onChange={(v) => set('price', v)} hint="Se cada variante tiver preço próprio, ele tem prioridade." />
            <Money label="Preço promocional (R$)" value={form.promoPrice} onChange={(v) => set('promoPrice', v)} />
          </div>
          <Toggle label="Ocultar preço" hint='A vitrine mostra "Consulte o preço".' checked={form.hidePrice} onChange={(v) => set('hidePrice', v)} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Condição">
              <select value={form.condition} onChange={(e) => set('condition', e.target.value as ProductInput['condition'])} className="field">
                {Object.entries(CONDITIONS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Disponibilidade">
              <select value={form.availability} onChange={(e) => set('availability', e.target.value as ProductInput['availability'])} className="field">
                {Object.entries(AVAILABILITY).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Number_ label="Estoque (opcional)" value={form.stock} onChange={(v) => set('stock', v)} />
          </div>
          <Field label="Garantia" hint="Informe apenas o que a loja realmente oferece.">
            <input value={form.warranty} onChange={(e) => set('warranty', e.target.value)} className="field" />
          </Field>
          {form.condition !== 'novo' && (
            <Field label="Estado do aparelho">
              <textarea rows={2} value={form.conditionNotes} onChange={(e) => set('conditionNotes', e.target.value)} className="field" />
            </Field>
          )}
        </Section>

        <Section id="midia" title="Fotos e vídeos" description="A primeira foto é a principal. Fotos com fundo transparente ficam melhores sobre a plataforma da vitrine.">
          <div className="flex flex-wrap gap-2">
            <UploadButton kind="image" onUploaded={(row) => { setForm((f) => ({ ...f, media: [...f.media, { mediaId: row.id, role: 'gallery', color: '' }] })); setDirty(true); remember([row]) }} label="Enviar fotos" />
            <button type="button" onClick={() => setPicker('gallery')} className="btn btn-quiet underline underline-offset-4">
              Escolher da biblioteca
            </button>
            <button type="button" onClick={() => setPicker('video')} className="btn btn-quiet underline underline-offset-4">
              <Film className="size-4" strokeWidth={1.5} /> Adicionar vídeo
            </button>
          </div>
          {gallery.length > 0 && (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {gallery.map((m, i) => {
                const row = media[m.mediaId]
                return (
                  <li key={m.mediaId} className="rounded-md border border-line p-2">
                    <div className="relative grid aspect-square place-items-center overflow-hidden">
                      {row && <MediaThumb row={row} />}
                      {i === 0 && <span className="badge badge-accent absolute left-0 top-0">Principal</span>}
                    </div>
                    {colorNames.length > 0 && (
                      <select aria-label="Cor desta foto" value={m.color} onChange={(e) => set('media', form.media.map((x) => (x.mediaId === m.mediaId && x.role === 'gallery' ? { ...x, color: e.target.value } : x)))} className="mt-2 h-9 w-full rounded-md border border-line bg-ink-2 px-1 text-[13px]">
                        <option value="">Todas as cores</option>
                        {colorNames.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    )}
                    <div className="mt-1 flex justify-between">
                      <button type="button" aria-label="Mover para trás" onClick={() => moveMedia(m.mediaId, -1)} className="grid size-9 place-items-center text-silver-2">
                        <ArrowUp className="size-4 -rotate-90" strokeWidth={1.5} />
                      </button>
                      <button type="button" aria-label="Mover para frente" onClick={() => moveMedia(m.mediaId, 1)} className="grid size-9 place-items-center text-silver-2">
                        <ArrowDown className="size-4 -rotate-90" strokeWidth={1.5} />
                      </button>
                      <button type="button" aria-label="Remover foto" onClick={() => set('media', form.media.filter((x) => !(x.mediaId === m.mediaId && x.role === 'gallery')))} className="grid size-9 place-items-center text-silver-2">
                        <X className="size-4" strokeWidth={1.5} />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          <div className="border-t border-line pt-4">
            <p className="text-[15px]">Visualização em 360° por fotos</p>
            <p className="text-[13px] text-silver-3">Alternativa ao modelo 3D: envie de 12 a 36 fotos, em ordem, girando o aparelho. {spin.length > 0 && `${spin.length} quadros adicionados.`}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => setPicker('spin')} className="btn btn-secondary">
                Escolher quadros
              </button>
              {spin.length > 0 && (
                <button type="button" onClick={() => set('media', gallery)} className="btn btn-quiet">
                  Limpar sequência
                </button>
              )}
            </div>
          </div>
        </Section>

        <Section id="modelo" title="Modelo 3D" description="Opcional. Sem modelo, a vitrine mostra a galeria e não promete rotação livre.">
          <div className="flex flex-wrap items-center gap-2">
            <UploadButton kind="model" multiple={false} label="Enviar GLB" onUploaded={(row) => { remember([row]); set('modelMediaId', row.id) }} />
            {form.modelMediaId && (
              <button type="button" onClick={() => { set('modelMediaId', null); set('hotspots', []); set('modelTintMaterial', '') }} className="btn btn-quiet">
                <Trash2 className="size-4" strokeWidth={1.5} /> Retirar modelo
              </button>
            )}
          </div>
          {form.modelMediaId && media[form.modelMediaId] ? (
            <ModelEditor
              media={media[form.modelMediaId]}
              tintMaterial={form.modelTintMaterial}
              illustrative={form.modelIllustrative}
              hotspots={form.hotspots}
              colorHex={form.variants.find((v) => v.colorHex)?.colorHex}
              onTint={(v) => set('modelTintMaterial', v)}
              onIllustrative={(v) => set('modelIllustrative', v)}
              onHotspots={(v) => set('hotspots', v)}
            />
          ) : (
            <p className="flex items-center gap-2 text-[14px] text-silver-3">
              <Box className="size-4" strokeWidth={1.5} /> Nenhum modelo associado.
            </p>
          )}
        </Section>

        <Section id="variantes" title="Variantes" description="Combinações de cor, armazenamento e memória que a loja vende. Deixe o preço vazio para usar o preço geral.">
          {form.variants.map((v, i) => (
            <fieldset key={i} className="rounded-md border border-line p-3">
              <legend className="px-1 text-[13px] text-silver-3">Variante {i + 1}</legend>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Field label="Cor">
                  <div className="flex gap-1.5">
                    <input type="color" aria-label="Amostra da cor" value={v.colorHex || '#555555'} onChange={(e) => variant(i, { colorHex: e.target.value })} className="h-11 w-11 shrink-0 rounded-md border border-line bg-ink-2 p-1" />
                    <input value={v.color} onChange={(e) => variant(i, { color: e.target.value })} className="field" />
                  </div>
                </Field>
                <Field label="Armazenamento">
                  <input value={v.storage} placeholder="256 GB" onChange={(e) => variant(i, { storage: e.target.value })} className="field" />
                </Field>
                <Field label="Memória RAM">
                  <input value={v.ram} placeholder="8 GB" onChange={(e) => variant(i, { ram: e.target.value })} className="field" />
                </Field>
                <Field label="Condição">
                  <select value={v.condition ?? ''} onChange={(e) => variant(i, { condition: (e.target.value || null) as typeof v.condition })} className="field">
                    <option value="">Igual ao produto</option>
                    {Object.entries(CONDITIONS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Money label="Preço (R$)" value={v.price} onChange={(price) => variant(i, { price })} />
                <Money label="Promocional (R$)" value={v.promoPrice} onChange={(promoPrice) => variant(i, { promoPrice })} />
                <Field label="Disponibilidade">
                  <select value={v.availability} onChange={(e) => variant(i, { availability: e.target.value as typeof v.availability })} className="field">
                    {Object.entries(AVAILABILITY).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Number_ label="Estoque" value={v.stock} onChange={(stock) => variant(i, { stock })} />
              </div>
              <div className="mt-2 flex gap-1">
                <button type="button" onClick={() => set('variants', [...form.variants.slice(0, i + 1), { ...v, id: undefined }, ...form.variants.slice(i + 1)])} className="btn btn-quiet !min-h-9 !text-[14px]">
                  <Copy className="size-4" strokeWidth={1.5} /> Duplicar
                </button>
                <button type="button" onClick={() => set('variants', form.variants.filter((_, n) => n !== i))} className="btn btn-quiet !min-h-9 !text-[14px]">
                  <Trash2 className="size-4" strokeWidth={1.5} /> Remover
                </button>
              </div>
            </fieldset>
          ))}
          <button type="button" onClick={() => set('variants', [...form.variants, emptyVariant()])} className="btn btn-secondary">
            <Plus className="size-4" strokeWidth={1.5} /> Adicionar variante
          </button>
        </Section>

        <Section id="ficha" title="Ficha técnica" description="Preencha só o que você confirmou. Campos vazios não aparecem na vitrine. Números alimentam filtros e comparador.">
          {SPEC_GROUPS.map((g) => (
            <details key={g.id} open={g.id === 'desempenho'} className="rounded-md border border-line p-3">
              <summary className="cursor-pointer text-[15px]">{g.title}</summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {g.fields.map((f) => (
                  <Field key={f.key} label={f.unit ? `${f.label} (${f.unit})` : f.label} hint={f.hint}>
                    <input value={form.specs[f.key] ?? ''} inputMode={f.numeric ? 'decimal' : undefined} onChange={(e) => setSpec(f.key, e.target.value)} className="field" />
                  </Field>
                ))}
              </div>
            </details>
          ))}
          <div>
            <p className="mb-2 text-[15px]">Atributos personalizados</p>
            {form.customAttrs.map((a, i) => (
              <div key={i} className="mb-2 flex gap-2">
                <input aria-label="Nome do atributo" placeholder="Nome" value={a.label} onChange={(e) => set('customAttrs', form.customAttrs.map((x, n) => (n === i ? { ...x, label: e.target.value } : x)))} className="field" />
                <input aria-label="Valor do atributo" placeholder="Valor" value={a.value} onChange={(e) => set('customAttrs', form.customAttrs.map((x, n) => (n === i ? { ...x, value: e.target.value } : x)))} className="field" />
                <button type="button" aria-label="Remover atributo" onClick={() => set('customAttrs', form.customAttrs.filter((_, n) => n !== i))} className="grid size-11 shrink-0 place-items-center text-silver-2">
                  <X className="size-4" strokeWidth={1.5} />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => set('customAttrs', [...form.customAttrs, { label: '', value: '' }])} className="btn btn-secondary">
              <Plus className="size-4" strokeWidth={1.5} /> Adicionar atributo
            </button>
          </div>
        </Section>

        <Section id="vitrine" title="Vitrine e SEO">
          <Toggle label="Visível na vitrine" hint="Desligue para manter publicado, mas fora de listagens e busca." checked={form.visible} onChange={(v) => set('visible', v)} />
          <Toggle label="Destaque da loja" checked={form.isFeatured} onChange={(v) => set('isFeatured', v)} />
          <Toggle label="Selo de lançamento" checked={form.isNew} onChange={(v) => set('isNew', v)} />
          <Field label="Diferenciais comerciais" hint="Um por linha, até 8.">
            <textarea rows={3} value={form.highlights.join('\n')} onChange={(e) => set('highlights', e.target.value.split('\n').slice(0, 8))} onBlur={() => set('highlights', form.highlights.map((h) => h.trim()).filter(Boolean))} className="field" />
          </Field>
          <div>
            <p className="mb-2 text-[14px] text-silver-2">Indicado para (usado nas seções e no assistente de escolha)</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(GOOD_FOR).map(([value, label]) => (
                <button key={value} type="button" aria-pressed={form.goodFor.includes(value)} onClick={() => set('goodFor', form.goodFor.includes(value) ? form.goodFor.filter((g) => g !== value) : [...form.goodFor, value])} className="chip">
                  {label}
                </button>
              ))}
            </div>
          </div>
          {collections.length > 0 && (
            <div>
              <p className="mb-2 text-[14px] text-silver-2">Coleções</p>
              <div className="flex flex-wrap gap-1.5">
                {collections.map((c) => (
                  <button key={c.id} type="button" aria-pressed={form.collectionIds.includes(c.id)} onClick={() => set('collectionIds', form.collectionIds.includes(c.id) ? form.collectionIds.filter((x) => x !== c.id) : [...form.collectionIds, c.id])} className="chip">
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {accessories.length > 0 && (
            <div>
              <p className="mb-2 text-[14px] text-silver-2">Acessórios compatíveis (confirmados pela loja)</p>
              <div className="flex flex-wrap gap-1.5">
                {accessories.filter((a) => a.id !== id).map((a) => (
                  <button key={a.id} type="button" aria-pressed={form.accessoryIds.includes(a.id)} onClick={() => set('accessoryIds', form.accessoryIds.includes(a.id) ? form.accessoryIds.filter((x) => x !== a.id) : [...form.accessoryIds, a.id])} className="chip">
                    {a.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <Field label="Título para buscadores" hint="Se vazio, usa o nome do aparelho.">
            <input maxLength={120} value={form.seoTitle} onChange={(e) => set('seoTitle', e.target.value)} className="field" />
          </Field>
          <Field label="Descrição para buscadores" hint="Se vazia, usa a descrição curta.">
            <textarea rows={2} maxLength={240} value={form.seoDescription} onChange={(e) => set('seoDescription', e.target.value)} className="field" />
          </Field>
        </Section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink-1/95 px-3 py-2 pb-[max(8px,env(safe-area-inset-bottom))] backdrop-blur-md md:left-[240px] md:px-8">
        <div className="mx-auto flex max-w-[1056px] items-center gap-2">
          <p className="hidden min-w-0 flex-1 truncate text-[14px] text-silver-3 sm:block">{dirty ? 'Alterações não salvas' : status === 'published' ? 'Publicado' : status === 'draft' ? 'Rascunho' : 'Novo aparelho'}</p>
          <button type="button" disabled={pending} onClick={preview} aria-label="Pré-visualizar" className="btn btn-quiet shrink-0">
            <ExternalLink className="size-4" strokeWidth={1.5} /> <span className="hidden sm:inline">Pré-visualizar</span>
          </button>
          <button type="button" disabled={pending} onClick={() => save('draft')} className="btn btn-secondary flex-1 !px-3 sm:flex-none">
            Salvar rascunho
          </button>
          <button type="button" disabled={pending} onClick={() => save('publish')} className="btn btn-primary flex-1 !px-3 sm:flex-none">
            {pending ? 'Salvando…' : 'Publicar'}
          </button>
        </div>
      </div>

      {picker && (
        <MediaPicker
          kind={picker === 'video' ? 'video' : 'image'}
          multiple
          selected={form.media.filter((m) => m.role === (picker === 'spin' ? 'spin' : 'gallery')).map((m) => m.mediaId)}
          onClose={() => setPicker(null)}
          onPick={(rows) => {
            addMedia(rows, picker === 'spin' ? 'spin' : 'gallery')
            setPicker(null)
          }}
        />
      )}
    </div>
  )
}
