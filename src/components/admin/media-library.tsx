'use client'

import { Trash2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { deleteMedia, getMediaUsage, updateMedia } from '@/app/admin/actions'
import { ModelBoundary } from '@/components/three/boundary'
import type { MediaRow } from '@/app/admin/types'
import { bytes } from '@/lib/format'
import { MediaThumb, UploadButton } from './media-picker'
import { ConfirmDialog, EmptyState, Field, Modal, useToast } from './ui'

const ViewerCanvas = dynamic(() => import('@/components/three/viewer-canvas'), { ssr: false })

const FILTERS = [
  ['', 'Tudo'],
  ['image', 'Imagens'],
  ['video', 'Vídeos'],
  ['model', 'Modelos 3D'],
] as const

function Detail({ row, onClose, onChange, onDelete }: { row: MediaRow; onClose: () => void; onChange: (row: MediaRow) => void; onDelete: () => void }) {
  const toast = useToast()
  const [alt, setAlt] = useState(row.alt)
  const [name, setName] = useState(row.name)
  const [usage, setUsage] = useState<number | null>(null)
  const [confirm, setConfirm] = useState(false)
  const meta = row.meta as { triangles?: number; meshes?: number; materials?: string[]; warnings?: string[] } | null

  const ask = async () => {
    setUsage(await getMediaUsage(row.id))
    setConfirm(true)
  }

  return (
    <Modal title={row.name} onClose={onClose}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid h-[320px] place-items-center overflow-hidden rounded-md border border-line bg-ink-0">
          {row.kind === 'model' ? (
            <div className="size-full touch-none">
              <ModelBoundary fallback={<p className="grid h-full place-items-center p-6 text-center text-bad">Erro ao carregar este modelo. O arquivo pode estar incompatível.</p>}>
                <ViewerCanvas url={row.fullUrl} />
              </ModelBoundary>
            </div>
          ) : row.kind === 'video' ? (
            <video src={row.fullUrl} controls playsInline className="max-h-full" />
          ) : (
            <MediaThumb row={{ ...row, url: row.fullUrl }} />
          )}
        </div>
        <div className="space-y-3">
          <p className="font-mono text-[12px] text-silver-3">
            {bytes(row.size)}
            {row.width ? ` · ${row.width} × ${row.height}` : ''}
            {meta?.triangles ? ` · ${meta.triangles.toLocaleString('pt-BR')} triângulos · ${meta.meshes} malhas` : ''}
          </p>
          {meta?.materials && meta.materials.length > 0 && <p className="text-[13px] text-silver-3">Materiais: {meta.materials.join(', ')}</p>}
          {meta?.warnings?.map((w) => (
            <p key={w} className="text-[13px] text-warn">
              {w}
            </p>
          ))}
          <Field label="Nome do arquivo">
            <input value={name} onChange={(e) => setName(e.target.value)} className="field" />
          </Field>
          <Field label="Descrição para acessibilidade">
            <input value={alt} onChange={(e) => setAlt(e.target.value)} className="field" />
          </Field>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                await updateMedia(row.id, { alt, name })
                onChange({ ...row, alt, name })
                toast('ok', 'Arquivo atualizado.')
              }}
              className="btn btn-primary"
            >
              Salvar
            </button>
            <UploadButton
              kind={row.kind}
              multiple={false}
              replaceId={row.id}
              label="Substituir"
              onUploaded={(next) => {
                onChange(next)
                toast('ok', 'Arquivo substituído em todos os lugares onde é usado.')
              }}
            />
            <button type="button" onClick={ask} className="btn btn-quiet">
              <Trash2 className="size-4" strokeWidth={1.5} /> Excluir
            </button>
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={confirm}
        title={usage ? 'Arquivo em uso' : 'Excluir este arquivo?'}
        text={usage ? `Este arquivo é usado em ${usage} ${usage === 1 ? 'lugar' : 'lugares'}. Retire-o de lá antes de excluir.` : 'Esta ação não pode ser desfeita.'}
        confirmLabel={usage ? 'Entendi' : 'Excluir'}
        onClose={() => setConfirm(false)}
        onConfirm={async () => {
          setConfirm(false)
          if (usage) return
          const res = await deleteMedia(row.id)
          if (res.ok) onDelete()
          else toast('bad', res.error)
        }}
      />
    </Modal>
  )
}

export function MediaLibrary({ initial }: { initial: MediaRow[] }) {
  const [rows, setRows] = useState(initial)
  const [filter, setFilter] = useState<string>('')
  const [open, setOpen] = useState<MediaRow | null>(null)
  const shown = filter ? rows.filter((r) => r.kind === filter) : rows

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <UploadButton onUploaded={(row) => setRows((list) => [row, ...list])} />
        <div className="flex gap-1">
          {FILTERS.map(([value, label]) => (
            <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className="chip !min-h-9 !text-[13px]">
              {label}
            </button>
          ))}
        </div>
      </div>
      {shown.length === 0 ? (
        <EmptyState title="Nenhum arquivo aqui." text="Envie fotos do aparelho, vídeos ou modelos GLB." />
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {shown.map((row) => (
            <li key={row.id}>
              <button type="button" onClick={() => setOpen(row)} className="block w-full rounded-md border border-line p-1.5 text-left hover:border-white/30">
                <span className="grid aspect-square place-items-center overflow-hidden">
                  <MediaThumb row={row} />
                </span>
                <span className="mt-1 block truncate text-[12px]">{row.name}</span>
                <span className="block font-mono text-[11px] text-silver-3">{bytes(row.size)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && (
        <Detail
          key={open.id}
          row={open}
          onClose={() => setOpen(null)}
          onChange={(row) => {
            setRows((list) => list.map((r) => (r.id === row.id ? row : r)))
            setOpen(row)
          }}
          onDelete={() => {
            setRows((list) => list.filter((r) => r.id !== open.id))
            setOpen(null)
          }}
        />
      )}
    </>
  )
}
