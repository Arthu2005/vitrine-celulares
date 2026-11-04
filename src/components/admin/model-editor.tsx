'use client'

import { Crosshair, X } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import type { MediaRow } from '@/app/admin/types'
import { ModelBoundary } from '@/components/three/boundary'
import type { ViewerCommand } from '@/components/three/viewer-canvas'
import { bytes } from '@/lib/format'
import type { Hotspot } from '@/lib/types'
import { Field, Toggle } from './ui'

const ViewerCanvas = dynamic(() => import('@/components/three/viewer-canvas'), { ssr: false })

type Props = {
  media: MediaRow
  tintMaterial: string
  illustrative: boolean
  hotspots: Hotspot[]
  colorHex?: string
  onTint: (value: string) => void
  onIllustrative: (value: boolean) => void
  onHotspots: (value: Hotspot[]) => void
}

export function ModelEditor({ media, tintMaterial, illustrative, hotspots, colorHex, onTint, onIllustrative, onHotspots }: Props) {
  const [ready, setReady] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [command] = useState<ViewerCommand | null>(null)
  const [materials, setMaterials] = useState<string[]>(((media.meta?.materials as string[]) ?? []))
  const selected = tintMaterial.split(',').filter(Boolean)
  const meta = media.meta as { triangles?: number; warnings?: string[] } | null

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <div>
        <div className={`relative h-[380px] overflow-hidden rounded-md border bg-ink-0 ${placing ? 'border-accent' : 'border-line'}`}>
          <ModelBoundary fallback={<p className="grid h-full place-items-center p-6 text-center text-bad">Não foi possível abrir este modelo neste navegador. Verifique o arquivo e envie novamente.</p>}>
            <div className="size-full touch-none">
              <ViewerCanvas key={media.id} url={media.fullUrl} tint={colorHex} tintMaterial={tintMaterial} hotspots={hotspots} command={command} onReady={() => setReady(true)} onMaterials={setMaterials} onPick={placing ? (position, normal) => {
                onHotspots([...hotspots, { id: crypto.randomUUID(), label: `Ponto ${hotspots.length + 1}`, text: '', position, normal }])
                setPlacing(false)
              } : undefined} />
            </div>
          </ModelBoundary>
          {!ready && <div className="loading-line absolute inset-x-[20%] top-3" />}
          {placing && <p className="absolute inset-x-2 top-2 rounded-md bg-accent px-2 py-1 text-center text-[13px] text-on-accent">Toque no ponto do aparelho</p>}
        </div>
        <p className="mt-1 text-[13px] text-silver-3">
          {media.name} · {bytes(media.size)}
          {meta?.triangles ? ` · ${meta.triangles.toLocaleString('pt-BR')} triângulos` : ''}
        </p>
        {meta?.warnings?.map((w) => (
          <p key={w} className="mt-1 text-[13px] text-warn">
            {w}
          </p>
        ))}
      </div>
      <div className="space-y-4">
        <Toggle label="Modelo ilustrativo" hint="Avisa o cliente de que o modelo pode diferir do aparelho real. Desligue somente para modelos fiéis." checked={illustrative} onChange={onIllustrative} />
        {materials.length > 0 && (
          <div>
            <p className="mb-1 text-[14px] text-silver-2">Partes que mudam de cor com a variante</p>
            <div className="flex flex-wrap gap-1.5">
              {materials.map((m) => (
                <button key={m} type="button" aria-pressed={selected.includes(m)} onClick={() => onTint((selected.includes(m) ? selected.filter((x) => x !== m) : [...selected, m]).join(','))} className="chip !min-h-9 !text-[13px]">
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}
        <div>
          <p className="mb-1 text-[14px] text-silver-2">Pontos interativos</p>
          <button type="button" onClick={() => setPlacing((v) => !v)} className="btn btn-secondary">
            <Crosshair className="size-4" strokeWidth={1.5} /> {placing ? 'Cancelar' : 'Adicionar ponto'}
          </button>
          <ul className="mt-2 space-y-2">
            {hotspots.map((h, i) => (
              <li key={h.id} className="rounded-md border border-line p-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12px] text-accent">{i + 1}</span>
                  <input aria-label="Título do ponto" value={h.label} onChange={(e) => onHotspots(hotspots.map((x) => (x.id === h.id ? { ...x, label: e.target.value } : x)))} className="field !min-h-10" />
                  <button type="button" aria-label="Remover ponto" onClick={() => onHotspots(hotspots.filter((x) => x.id !== h.id))} className="grid size-10 shrink-0 place-items-center text-silver-2">
                    <X className="size-4" strokeWidth={1.5} />
                  </button>
                </div>
                <Field label="Texto" className="mt-2">
                  <textarea rows={2} value={h.text} onChange={(e) => onHotspots(hotspots.map((x) => (x.id === h.id ? { ...x, text: e.target.value } : x)))} className="field" />
                </Field>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
