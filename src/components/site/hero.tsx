'use client'

import { useMotionValueEvent, useScroll, useTransform, motion } from 'motion/react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ModelBoundary } from '@/components/three/boundary'
import { canUse3D } from '@/lib/client/capabilities'
import type { MediaItem } from '@/lib/types'
import { Picture } from './picture'

const HeroCanvas = dynamic(() => import('@/components/three/hero-canvas'), { ssr: false })

type Props = {
  eyebrow: string
  title: string
  subtitle: string
  primary: { label: string; href: string } | null
  secondary: { label: string; href: string } | null
  poster: MediaItem | null
  model: { url: string; tint?: string; tintMaterial?: string } | null
  readouts: { label: string; value: string }[]
  demoLabel?: boolean
}

export function Hero({ eyebrow, title, subtitle, primary, secondary, poster, model, readouts, demoLabel }: Props) {
  const section = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end start'] })
  const scrollRef = useRef(0)
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    scrollRef.current = v
  })
  const stageY = useTransform(scrollYProgress, [0, 1], [0, 90])
  const textY = useTransform(scrollYProgress, [0, 1], [0, -40])
  const [start3D, setStart3D] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!model) return
    // No celular, a primeira tela fica leve: o 3D carrega quando o cliente abre um aparelho.
    if (!canUse3D().auto || window.innerWidth < 768) return
    // O modelo só entra depois de a página terminar de carregar.
    const idle = window.requestIdleCallback ?? ((fn: () => void) => window.setTimeout(fn, 400))
    const id = idle(() => setStart3D(true))
    return () => (window.cancelIdleCallback ?? window.clearTimeout)(id as number)
  }, [model])

  return (
    <section ref={section} className="relative isolate overflow-hidden">
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(46%_56%_at_64%_52%,color-mix(in_srgb,var(--accent)_17%,transparent),transparent_72%)]" />
      <div className="shell relative grid min-h-[calc(100svh-96px)] grid-cols-1 content-start pb-20 pt-6 lg:grid-cols-12 lg:content-center lg:pb-10">
        <motion.div style={{ y: textY }} className="relative z-10 lg:col-span-8 lg:col-start-1 lg:row-start-1 lg:self-center">
          {eyebrow && <p className="label mb-4">{eyebrow}</p>}
          <h1 className="display max-w-[12ch] text-[clamp(40px,7.6vw,112px)]">{title}</h1>
          {subtitle && <p className="mt-5 max-w-[34ch] text-[17px] text-silver-2 md:text-[19px]">{subtitle}</p>}
          <div className="mt-7 flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-3">
            {primary && (
              <Link href={primary.href} className="btn btn-primary">
                {primary.label}
              </Link>
            )}
            {secondary && (
              <Link href={secondary.href} className="btn btn-quiet underline underline-offset-4">
                {secondary.label}
              </Link>
            )}
          </div>
        </motion.div>

        <motion.div style={{ y: stageY }} className="relative -mt-6 h-[58svh] min-h-[400px] lg:col-span-6 lg:col-start-7 lg:row-start-1 lg:mt-0 lg:h-[min(84svh,860px)]">
          <div className="platform absolute inset-y-0 left-0 right-0 xl:right-[150px]">
          {poster && (
            <div className={`absolute inset-x-[4%] bottom-[11%] top-[1%] transition-opacity duration-700 ${ready ? 'opacity-0' : 'opacity-100'}`}>
              <Picture item={poster} sizes="(min-width: 1024px) 50vw, 100vw" priority className="size-full object-contain object-bottom" />
            </div>
          )}
          {start3D && model && (
            <div className={`absolute inset-x-[-10%] bottom-[4%] top-[-4%] transition-opacity duration-700 ${ready ? 'opacity-100' : 'opacity-0'}`} aria-hidden>
              <ModelBoundary onError={() => setReady(false)}>
                <HeroCanvas url={model.url} tint={model.tint} tintMaterial={model.tintMaterial} scrollRef={scrollRef} onReady={() => setReady(true)} />
              </ModelBoundary>
            </div>
          )}
          </div>
          {readouts.length > 0 && (
            <dl className="absolute bottom-[16%] right-0 hidden w-[150px] space-y-5 xl:block">
              {readouts.map((r) => (
                <div key={r.label} className="readout">
                  <dt className="label">{r.label}</dt>
                  <dd className="title mt-0.5 text-[24px]">{r.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {demoLabel && <p className="absolute bottom-0 left-1/2 w-max -translate-x-1/2 font-mono text-[11px] text-silver-3 xl:left-[calc(50%-75px)]">Aparelho fictício · modelo ilustrativo</p>}
        </motion.div>
      </div>
    </section>
  )
}
