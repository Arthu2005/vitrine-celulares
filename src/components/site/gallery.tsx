'use client'

import { Play, X, ZoomIn } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { MediaItem } from '@/lib/types'
import { Picture } from './picture'

export function Lightbox({ item, onClose }: { item: MediaItem; onClose: () => void }) {
  const [zoomed, setZoomed] = useState(false)
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', esc)
      document.body.style.overflow = ''
    }
  }, [onClose])
  return (
    <div role="dialog" aria-modal="true" aria-label="Imagem ampliada" className="fixed inset-0 z-[60] overflow-auto bg-ink-0" style={{ touchAction: 'pinch-zoom pan-x pan-y' }}>
      <button type="button" aria-label="Fechar imagem" onClick={onClose} className="fixed right-3 top-3 z-10 grid size-11 place-items-center rounded-full bg-ink-3">
        <X className="size-5" strokeWidth={1.5} />
      </button>
      <button type="button" aria-label={zoomed ? 'Reduzir imagem' : 'Ampliar imagem'} onClick={() => setZoomed((z) => !z)} className={`block min-h-full ${zoomed ? 'w-[220%] max-w-none' : 'w-full'} cursor-zoom-in`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.url} alt={item.alt} className={`mx-auto object-contain ${zoomed ? 'w-full' : 'h-svh'}`} />
      </button>
    </div>
  )
}

export function Gallery({ items, name }: { items: MediaItem[]; name: string }) {
  const [index, setIndex] = useState(0)
  const [zoom, setZoom] = useState(false)
  const safe = Math.min(index, Math.max(items.length - 1, 0))
  const current = items[safe]

  if (!current) return null
  return (
    <div className="flex h-full flex-col">
      <div className="platform relative min-h-0 flex-1">
        {current.kind === 'video' ? (
          <video src={current.url} controls playsInline preload="metadata" className="absolute inset-0 m-auto max-h-full max-w-full rounded-lg" />
        ) : (
          <button type="button" aria-label="Ampliar imagem" onClick={() => setZoom(true)} className="group absolute inset-x-[8%] bottom-[11%] top-0 cursor-zoom-in">
            <Picture key={current.id} item={current} alt={current.alt || name} sizes="(min-width: 1024px) 50vw, 100vw" priority={safe === 0} className="size-full object-contain object-bottom" />
            <ZoomIn className="absolute right-0 top-0 size-5 text-silver-3 opacity-0 transition-opacity group-hover:opacity-100" strokeWidth={1.5} />
          </button>
        )}
      </div>
      {items.length > 1 && (
        <ul className="no-scrollbar mt-3 flex shrink-0 gap-2 overflow-x-auto pb-1">
          {items.map((item, i) => (
            <li key={item.id} className="shrink-0">
              <button
                type="button"
                aria-label={`Ver imagem ${i + 1}`}
                aria-current={i === safe}
                onClick={() => setIndex(i)}
                className={`relative grid h-[68px] w-[56px] place-items-center rounded-md border bg-ink-1 p-1 transition-colors ${i === safe ? 'border-accent' : 'border-line'}`}
              >
                {item.kind === 'video' ? <Play className="size-5 text-silver-2" strokeWidth={1.5} /> : <Picture item={item} alt="" sizes="56px" className="size-full object-contain" />}
              </button>
            </li>
          ))}
        </ul>
      )}
      {zoom && current.kind === 'image' && <Lightbox item={current} onClose={() => setZoom(false)} />}
    </div>
  )
}
