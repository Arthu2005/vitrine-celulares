'use client'

import { Box, Check, Film, UploadCloud } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { listMedia } from '@/app/admin/actions'
import type { MediaRow } from '@/app/admin/types'
import { uploadFile } from '@/lib/client/upload'
import { bytes } from '@/lib/format'
import { EmptyState, Modal, useToast } from './ui'

const ACCEPT = {
  image: 'image/jpeg,image/png,image/webp,image/avif',
  video: 'video/mp4,video/webm',
  model: '.glb,.gltf,model/gltf-binary,model/gltf+json',
  all: 'image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,.glb,.gltf',
}

type Kind = 'image' | 'video' | 'model'

export function UploadButton({ kind = 'all', multiple = true, onUploaded, label = 'Enviar arquivos', replaceId }: { kind?: Kind | 'all'; multiple?: boolean; onUploaded: (row: MediaRow) => void; label?: string; replaceId?: string }) {
  const input = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const [status, setStatus] = useState<string | null>(null)

  const handle = async (files: FileList | null) => {
    if (!files?.length) return
    const list = [...files]
    for (const [i, file] of list.entries()) {
      const prefix = list.length > 1 ? `${i + 1} de ${list.length}: ` : ''
      try {
        setStatus(`${prefix}0%`)
        const row = await uploadFile(file, {
          replaceId,
          onProgress: (p) => setStatus(p < 100 ? `${prefix}${p}%` : `${prefix}processando…`),
        })
        onUploaded(row)
        const warnings = (row.meta?.warnings as string[] | undefined) ?? []
        if (warnings.length) toast('bad', `${file.name} enviado com avisos.`, warnings)
      } catch (error) {
        toast('bad', `${file.name}: ${error instanceof Error ? error.message : 'falha no envio.'}`)
      }
    }
    setStatus(null)
    if (input.current) input.current.value = ''
  }

  return (
    <>
      <input ref={input} type="file" accept={ACCEPT[kind]} multiple={multiple} hidden aria-label={label} onChange={(e) => handle(e.target.files)} />
      <button type="button" disabled={!!status} onClick={() => input.current?.click()} className="btn btn-secondary">
        <UploadCloud className="size-4" strokeWidth={1.5} /> {status ?? label}
      </button>
    </>
  )
}

export function MediaThumb({ row }: { row: Pick<MediaRow, 'kind' | 'url' | 'alt' | 'name'> }) {
  if (row.kind === 'image') {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={row.url} alt={row.alt || row.name} className="size-full object-contain" />
  }
  const Icon = row.kind === 'video' ? Film : Box
  return <Icon className="size-7 text-silver-3" strokeWidth={1.25} />
}

export function MediaPicker({ kind, multiple, selected = [], onPick, onClose }: { kind: Kind; multiple?: boolean; selected?: string[]; onPick: (rows: MediaRow[]) => void; onClose: () => void }) {
  const [rows, setRows] = useState<MediaRow[] | null>(null)
  const [chosen, setChosen] = useState<MediaRow[]>([])

  const load = useCallback(async () => setRows(await listMedia(kind)), [kind])
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    void load()
  }, [load])

  const toggle = (row: MediaRow) => {
    if (!multiple) return onPick([row])
    setChosen((list) => (list.some((r) => r.id === row.id) ? list.filter((r) => r.id !== row.id) : [...list, row]))
  }

  return (
    <Modal title={kind === 'model' ? 'Escolher modelo 3D' : kind === 'video' ? 'Escolher vídeo' : 'Escolher imagens'} onClose={onClose}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <UploadButton kind={kind} multiple={multiple} onUploaded={(row) => setRows((list) => [row, ...(list ?? [])])} label="Enviar do dispositivo" />
        {multiple && (
          <button type="button" disabled={!chosen.length} onClick={() => onPick(chosen)} className="btn btn-primary">
            Adicionar {chosen.length || ''}
          </button>
        )}
      </div>
      {rows === null ? (
        <div className="loading-line" />
      ) : rows.length === 0 ? (
        <EmptyState title="A biblioteca está vazia." text="Envie um arquivo para começar." />
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {rows.map((row) => {
            const on = chosen.some((r) => r.id === row.id)
            const already = selected.includes(row.id)
            return (
              <li key={row.id}>
                <button type="button" disabled={already} aria-pressed={on} onClick={() => toggle(row)} className={`relative block w-full rounded-md border p-1 text-left disabled:opacity-40 ${on ? 'border-accent' : 'border-line'}`}>
                  <span className="grid aspect-square place-items-center overflow-hidden">
                    <MediaThumb row={row} />
                  </span>
                  <span className="mt-1 block truncate text-[11px] text-silver-3">{row.name}</span>
                  {row.kind !== 'image' && <span className="block text-[11px] text-silver-3">{bytes(row.size)}</span>}
                  {on && <Check className="absolute right-1 top-1 size-4 rounded-full bg-accent text-on-accent" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Modal>
  )
}
