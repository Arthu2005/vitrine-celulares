'use client'

import { Eye, EyeOff, ExternalLink, Pencil, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { deleteProduct, quickUpdateProduct, setProductStatus } from '@/app/admin/actions'
import { AVAILABILITY } from '@/lib/constants'
import { ConfirmDialog, useToast } from './ui'

export function ProductRowActions({ id, slug, name, status, availability }: { id: string; slug: string; name: string; status: 'draft' | 'published'; availability: string }) {
  const [confirm, setConfirm] = useState(false)
  const [pending, start] = useTransition()
  const toast = useToast()
  const router = useRouter()
  const run = (fn: () => Promise<{ ok: boolean; error?: string; issues?: string[] }>, message: string) =>
    start(async () => {
      const res = await fn()
      if (res.ok) {
        toast('ok', message)
        router.refresh()
      } else toast('bad', res.error ?? 'Não foi possível concluir.', res.issues)
    })
  const iconClass = 'grid size-10 place-items-center rounded-md text-silver-2 hover:bg-ink-3 hover:text-silver-1'
  return (
    <div className={`flex flex-wrap items-center gap-1 ${pending ? 'opacity-50' : ''}`}>
      <select aria-label={`Disponibilidade de ${name}`} value={availability} onChange={(e) => run(() => quickUpdateProduct(id, { availability: e.target.value }), 'Disponibilidade atualizada.')} className="h-10 max-w-[130px] rounded-md border border-line bg-ink-2 px-1 text-[13px]">
        {Object.entries(AVAILABILITY).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <Link href={`/admin/produtos/${id}`} aria-label={`Editar ${name}`} className={iconClass}>
        <Pencil className="size-[18px]" strokeWidth={1.5} />
      </Link>
      <button type="button" aria-label={status === 'published' ? `Despublicar ${name}` : `Publicar ${name}`} title={status === 'published' ? 'Despublicar' : 'Publicar'} onClick={() => run(() => setProductStatus(id, status === 'published' ? 'draft' : 'published'), status === 'published' ? 'Produto retirado da vitrine.' : 'Produto publicado.')} className={iconClass}>
        {status === 'published' ? <EyeOff className="size-[18px]" strokeWidth={1.5} /> : <Eye className="size-[18px]" strokeWidth={1.5} />}
      </button>
      {status === 'published' && (
        <a href={`/celulares/${slug}`} target="_blank" rel="noreferrer" aria-label={`Abrir ${name} na vitrine`} className={iconClass}>
          <ExternalLink className="size-[18px]" strokeWidth={1.5} />
        </a>
      )}
      <button type="button" aria-label={`Excluir ${name}`} onClick={() => setConfirm(true)} className={iconClass}>
        <Trash2 className="size-[18px]" strokeWidth={1.5} />
      </button>
      <ConfirmDialog
        open={confirm}
        title={`Excluir ${name}?`}
        text="O produto sai da vitrine, do comparador e das recomendações. Esta ação não pode ser desfeita."
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false)
          run(() => deleteProduct(id), 'Produto excluído.')
        }}
      />
    </div>
  )
}
