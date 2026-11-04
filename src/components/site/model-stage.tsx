'use client'

import { Minus, Plus, RotateCcw, X } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import type { Hotspot, MediaItem } from '@/lib/types'
import { ModelBoundary } from '@/components/three/boundary'
import type { ViewerCommand, ViewName } from '@/components/three/viewer-canvas'
import { Picture } from './picture'

const ViewerCanvas = dynamic(() => import('@/components/three/viewer-canvas'), { ssr: false })

const VIEW_LABELS: [ViewName, string][] = [
  ['frente', 'Frente'],
  ['costas', 'Costas'],
  ['lateral', 'Lateral'],
]

export function ModelStage({ url, tint, tintMaterial, hotspots, poster, illustrative, onFail }: { url: string; tint?: string; tintMaterial?: string; hotspots: Hotspot[]; poster: MediaItem | null; illustrative: boolean; onFail: () => void }) {
  const [ready, setReady] = useState(false)
  const [command, setCommand] = useState<ViewerCommand | null>(null)
  const [active, setActive] = useState<string | null>(null)
  const [count, setCount] = useState(1)
  const send = (cmd: { type: 'view'; view: ViewName } | { type: 'zoom'; dir: 1 | -1 } | { type: 'face'; normal: [number, number, number] }) => {
    setCommand({ ...cmd, n: count } as ViewerCommand)
    setCount((c) => c + 1)
  }
  const selected = hotspots.find((h) => h.id === active)

  return (
    <div className="platform relative h-full">
      {!ready && poster && (
        <div className="absolute inset-x-[8%] bottom-[11%] top-0 opacity-60">
          <Picture item={poster} alt="" sizes="50vw" className="size-full object-contain object-bottom" />
        </div>
      )}
      <div className="absolute inset-0 touch-none">
        <ModelBoundary onError={onFail}>
          <ViewerCanvas
            url={url}
            tint={tint}
            tintMaterial={tintMaterial}
            hotspots={hotspots}
            activeHotspot={active}
            command={command}
            onReady={() => setReady(true)}
            onSelectHotspot={(id) => {
              setActive(id)
              const h = hotspots.find((x) => x.id === id)
              if (h) send({ type: 'face', normal: h.normal })
            }}
          />
        </ModelBoundary>
      </div>

      {!ready && (
        <div className="absolute inset-x-[25%] top-3" role="status" aria-label="Carregando modelo 3D">
          <div className="loading-line" />
          <p className="mt-2 text-center font-mono text-[12px] text-silver-3">Preparando o aparelho</p>
        </div>
      )}

      {ready && (
        <>
          <div className="absolute left-0 top-0 flex gap-1">
            {VIEW_LABELS.map(([view, label]) => (
              <button key={view} type="button" onClick={() => send({ type: 'view', view })} className="h-9 rounded-md bg-ink-0/70 px-2.5 font-mono text-[12px] text-silver-2 backdrop-blur-sm hover:text-silver-1">
                {label}
              </button>
            ))}
          </div>
          <div className="absolute right-0 top-0 flex flex-col gap-1">
            <button type="button" aria-label="Aproximar" onClick={() => send({ type: 'zoom', dir: 1 })} className="grid size-10 place-items-center rounded-md bg-ink-0/70 text-silver-2 hover:text-silver-1">
              <Plus className="size-4" strokeWidth={1.5} />
            </button>
            <button type="button" aria-label="Afastar" onClick={() => send({ type: 'zoom', dir: -1 })} className="grid size-10 place-items-center rounded-md bg-ink-0/70 text-silver-2 hover:text-silver-1">
              <Minus className="size-4" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              aria-label="Voltar à posição inicial"
              onClick={() => {
                setActive(null)
                send({ type: 'view', view: 'inicio' })
              }}
              className="grid size-10 place-items-center rounded-md bg-ink-0/70 text-silver-2 hover:text-silver-1"
            >
              <RotateCcw className="size-4" strokeWidth={1.5} />
            </button>
          </div>
        </>
      )}

      {selected && (
        <div className="absolute inset-x-0 bottom-2 z-10 mx-auto max-w-[420px] rounded-md border border-line bg-ink-0/90 p-3 pr-10 backdrop-blur-sm">
          <p className="font-[560]">{selected.label}</p>
          <p className="mt-0.5 text-[14px] text-silver-2">{selected.text}</p>
          <button type="button" aria-label="Fechar detalhe" onClick={() => setActive(null)} className="absolute right-1 top-1 grid size-9 place-items-center text-silver-3">
            <X className="size-4" strokeWidth={1.5} />
          </button>
        </div>
      )}
      {illustrative && !selected && ready && <p className="absolute bottom-0 left-1/2 w-max max-w-full -translate-x-1/2 text-center font-mono text-[11px] text-silver-3">Modelo ilustrativo: formas e acabamento podem diferir do aparelho real</p>}
    </div>
  )
}
