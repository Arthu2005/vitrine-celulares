'use client'

import { MoveHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

/** Visualização em 360° feita com fotos: gira apenas na horizontal, como as imagens permitem. */
export function SpinViewer({ frames, name }: { frames: string[]; name: string }) {
  const [frame, setFrame] = useState(0)
  const [loaded, setLoaded] = useState(0)
  const drag = useRef<{ x: number; frame: number } | null>(null)
  const area = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    frames.forEach((src) => {
      const img = new Image()
      img.onload = img.onerror = () => !cancelled && setLoaded((n) => n + 1)
      img.src = src
    })
    return () => {
      cancelled = true
    }
  }, [frames])

  const wrap = (n: number) => ((n % frames.length) + frames.length) % frames.length

  return (
    <div
      ref={area}
      role="slider"
      tabIndex={0}
      aria-label={`Girar ${name}`}
      aria-valuemin={1}
      aria-valuemax={frames.length}
      aria-valuenow={frame + 1}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') setFrame((f) => wrap(f - 1))
        if (e.key === 'ArrowRight') setFrame((f) => wrap(f + 1))
      }}
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, frame }
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        if (!drag.current) return
        const width = area.current?.clientWidth ?? 400
        setFrame(wrap(drag.current.frame + Math.round(((e.clientX - drag.current.x) / width) * frames.length * 1.4)))
      }}
      onPointerUp={() => {
        drag.current = null
      }}
      className="platform relative h-full cursor-grab touch-pan-y select-none active:cursor-grabbing"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={frames[frame]} alt={`${name}, ângulo ${frame + 1} de ${frames.length}`} draggable={false} className="absolute inset-x-[8%] bottom-[11%] top-0 size-auto h-[89%] w-[84%] object-contain object-bottom" />
      <p className="absolute left-1/2 top-1 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap font-mono text-[12px] text-silver-3">
        <MoveHorizontal className="size-4" strokeWidth={1.5} /> {loaded < frames.length ? `Carregando ${Math.round((loaded / frames.length) * 100)}%` : 'Arraste para girar'}
      </p>
    </div>
  )
}
