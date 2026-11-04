'use client'

import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { deleteBrand, deleteCategory, deleteCollection, reorder, saveBrand, saveCategory, saveCollection } from '@/app/admin/actions'
import { ConfirmDialog, EmptyState, Field, Modal, Section, Toggle, useToast } from './ui'

type Brand = { id: string; name: string; slug: string; showInNav: boolean }
type Category = Brand & { isAccessory: boolean }
type Collection = { id: string; name: string; slug: string; description: string; visible: boolean; productIds: string[] }
type Table = 'brands' | 'categories' | 'collections'

type Result = { ok: boolean; error?: string }

function useRun() {
  const toast = useToast()
  const router = useRouter()
  const [pending, start] = useTransition()
  const run = (fn: () => Promise<Result>, message: string, after?: () => void) =>
    start(async () => {
      const res = await fn()
      if (res.ok) {
        toast('ok', message)
        after?.()
        router.refresh()
      } else toast('bad', res.error ?? 'Não foi possível salvar.')
    })
  return { run, pending }
}

function List<T extends { id: string; name: string; slug: string }>({ items, table, onEdit, onDelete, detail }: { items: T[]; table: Table; onEdit: (item: T) => void; onDelete: (item: T) => void; detail?: (item: T) => string }) {
  const { run, pending } = useRun()
  const move = (index: number, dir: -1 | 1) => {
    const list = items.map((i) => i.id)
    const j = index + dir
    if (j < 0 || j >= list.length) return
    ;[list[index], list[j]] = [list[j], list[index]]
    run(() => reorder(table, list), 'Ordem atualizada.')
  }
  const icon = 'grid size-10 place-items-center rounded-md text-silver-2 hover:bg-ink-3'
  if (!items.length) return <EmptyState title="Nada cadastrado ainda." />
  return (
    <ul className={`divide-y divide-line ${pending ? 'opacity-60' : ''}`}>
      {items.map((item, i) => (
        <li key={item.id} className="flex items-center gap-1 py-1">
          <div className="min-w-0 flex-1">
            <p className="truncate">{item.name}</p>
            <p className="truncate text-[13px] text-silver-3">{detail?.(item) ?? item.slug}</p>
          </div>
          <button type="button" aria-label={`Mover ${item.name} para cima`} onClick={() => move(i, -1)} className={icon}>
            <ArrowUp className="size-4" strokeWidth={1.5} />
          </button>
          <button type="button" aria-label={`Mover ${item.name} para baixo`} onClick={() => move(i, 1)} className={icon}>
            <ArrowDown className="size-4" strokeWidth={1.5} />
          </button>
          <button type="button" aria-label={`Editar ${item.name}`} onClick={() => onEdit(item)} className={icon}>
            <Pencil className="size-4" strokeWidth={1.5} />
          </button>
          <button type="button" aria-label={`Excluir ${item.name}`} onClick={() => onDelete(item)} className={icon}>
            <Trash2 className="size-4" strokeWidth={1.5} />
          </button>
        </li>
      ))}
    </ul>
  )
}

export function CatalogManager({ brands, categories, collections, products }: { brands: Brand[]; categories: Category[]; collections: Collection[]; products: { id: string; name: string; status: string }[] }) {
  const { run, pending } = useRun()
  const [brand, setBrand] = useState<Partial<Brand> | null>(null)
  const [category, setCategory] = useState<Partial<Category> | null>(null)
  const [collection, setCollection] = useState<Partial<Collection> | null>(null)
  const [remove, setRemove] = useState<{ name: string; fn: () => Promise<Result> } | null>(null)

  return (
    <div className="space-y-4">
      <Section title="Marcas">
        <List items={brands} table="brands" onEdit={setBrand} onDelete={(b) => setRemove({ name: b.name, fn: () => deleteBrand(b.id) })} />
        <button type="button" onClick={() => setBrand({ showInNav: true })} className="btn btn-secondary">
          <Plus className="size-4" strokeWidth={1.5} /> Nova marca
        </button>
      </Section>

      <Section title="Categorias">
        <List items={categories} table="categories" onEdit={setCategory} onDelete={(c) => setRemove({ name: c.name, fn: () => deleteCategory(c.id) })} detail={(c) => `${c.slug}${c.isAccessory ? ' · acessórios' : ''}`} />
        <button type="button" onClick={() => setCategory({ showInNav: true, isAccessory: false })} className="btn btn-secondary">
          <Plus className="size-4" strokeWidth={1.5} /> Nova categoria
        </button>
      </Section>

      <Section title="Coleções" description='Listas escolhidas por você, como "Celulares para fotografia".'>
        <List items={collections} table="collections" onEdit={setCollection} onDelete={(c) => setRemove({ name: c.name, fn: () => deleteCollection(c.id) })} detail={(c) => `${c.productIds.length} produtos${c.visible ? '' : ' · oculta'}`} />
        <button type="button" onClick={() => setCollection({ visible: true, productIds: [], description: '' })} className="btn btn-secondary">
          <Plus className="size-4" strokeWidth={1.5} /> Nova coleção
        </button>
      </Section>

      {brand && (
        <Modal title={brand.id ? 'Editar marca' : 'Nova marca'} onClose={() => setBrand(null)}>
          <div className="space-y-4">
            <Field label="Nome">
              <input autoFocus value={brand.name ?? ''} onChange={(e) => setBrand({ ...brand, name: e.target.value })} className="field" />
            </Field>
            <Field label="Endereço" hint="Preenchido automaticamente se ficar vazio.">
              <input value={brand.slug ?? ''} onChange={(e) => setBrand({ ...brand, slug: e.target.value })} className="field" />
            </Field>
            <Toggle label="Mostrar no menu" checked={brand.showInNav ?? true} onChange={(showInNav) => setBrand({ ...brand, showInNav })} />
            <button type="button" disabled={pending} onClick={() => run(() => saveBrand(brand.id ?? null, brand), 'Marca salva.', () => setBrand(null))} className="btn btn-primary">
              Salvar
            </button>
          </div>
        </Modal>
      )}

      {category && (
        <Modal title={category.id ? 'Editar categoria' : 'Nova categoria'} onClose={() => setCategory(null)}>
          <div className="space-y-4">
            <Field label="Nome">
              <input autoFocus value={category.name ?? ''} onChange={(e) => setCategory({ ...category, name: e.target.value })} className="field" />
            </Field>
            <Field label="Endereço">
              <input value={category.slug ?? ''} onChange={(e) => setCategory({ ...category, slug: e.target.value })} className="field" />
            </Field>
            <Toggle label="Mostrar no menu" checked={category.showInNav ?? true} onChange={(showInNav) => setCategory({ ...category, showInNav })} />
            <Toggle label="É categoria de acessórios" hint="Itens daqui ficam fora do comparador e das recomendações." checked={category.isAccessory ?? false} onChange={(isAccessory) => setCategory({ ...category, isAccessory })} />
            <button type="button" disabled={pending} onClick={() => run(() => saveCategory(category.id ?? null, category), 'Categoria salva.', () => setCategory(null))} className="btn btn-primary">
              Salvar
            </button>
          </div>
        </Modal>
      )}

      {collection && (
        <Modal title={collection.id ? 'Editar coleção' : 'Nova coleção'} onClose={() => setCollection(null)}>
          <div className="space-y-4">
            <Field label="Nome">
              <input autoFocus value={collection.name ?? ''} onChange={(e) => setCollection({ ...collection, name: e.target.value })} className="field" />
            </Field>
            <Field label="Endereço">
              <input value={collection.slug ?? ''} onChange={(e) => setCollection({ ...collection, slug: e.target.value })} className="field" />
            </Field>
            <Field label="Descrição">
              <textarea rows={2} value={collection.description ?? ''} onChange={(e) => setCollection({ ...collection, description: e.target.value })} className="field" />
            </Field>
            <Toggle label="Visível na vitrine" checked={collection.visible ?? true} onChange={(visible) => setCollection({ ...collection, visible })} />
            <div>
              <p className="mb-2 text-[14px] text-silver-2">Produtos</p>
              <div className="flex flex-wrap gap-1.5">
                {products.map((p) => {
                  const on = collection.productIds?.includes(p.id)
                  return (
                    <button key={p.id} type="button" aria-pressed={on} onClick={() => setCollection({ ...collection, productIds: on ? collection.productIds?.filter((x) => x !== p.id) : [...(collection.productIds ?? []), p.id] })} className="chip !min-h-9 !text-[13px]">
                      {p.name}
                    </button>
                  )
                })}
              </div>
            </div>
            <button type="button" disabled={pending} onClick={() => run(() => saveCollection(collection.id ?? null, collection), 'Coleção salva.', () => setCollection(null))} className="btn btn-primary">
              Salvar
            </button>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={!!remove}
        title={`Excluir ${remove?.name}?`}
        text="Esta ação não pode ser desfeita."
        onClose={() => setRemove(null)}
        onConfirm={() => {
          const fn = remove!.fn
          setRemove(null)
          run(fn, 'Excluído.')
        }}
      />
    </div>
  )
}
