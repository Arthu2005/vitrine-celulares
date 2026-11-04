'use client'

import { Box, Check, GitCompareArrows, Heart, Images, Rotate3d, Share2, Video } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AVAILABILITY, CONDITIONS, type Availability } from '@/lib/constants'
import { canUse3D } from '@/lib/client/capabilities'
import { track } from '@/lib/client/track'
import { colors, priceInfo, primaryImage, unique } from '@/lib/product-utils'
import type { Product, Variant } from '@/lib/types'
import { productMessage, waLink } from '@/lib/whatsapp'
import { Gallery } from './gallery'
import { WhatsAppIcon } from './icons'
import { ModelStage } from './model-stage'
import { Price } from './price'
import { useShelf } from './shelf'
import { SpinViewer } from './spin-viewer'
import { useStorePublic } from './store-context'

type Mode = '3d' | 'fotos' | '360' | 'video'

const STOCK_TONE: Record<Availability, string> = {
  disponivel: 'text-ok',
  ultimas: 'text-warn',
  encomenda: 'text-silver-2',
  indisponivel: 'text-bad',
}

function pickInitial(p: Product) {
  return p.variants.find((v) => v.availability !== 'indisponivel') ?? p.variants[0] ?? null
}

export function ProductExperience({ product, preview }: { product: Product; preview?: boolean }) {
  const store = useStorePublic()
  const shelf = useShelf()
  const initial = pickInitial(product)
  const [color, setColor] = useState(initial?.color ?? '')
  const [storage, setStorage] = useState(initial?.storage ?? '')
  const [ram, setRam] = useState(initial?.ram ?? '')
  const [mode, setMode] = useState<Mode>('fotos')
  const [model3dOk, setModel3dOk] = useState(false)
  const [shared, setShared] = useState(false)

  useEffect(() => {
    if (!preview) track('product_view', { productId: product.id, label: product.name })
    const caps = canUse3D()
    if (product.model3d && caps.supported) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setModel3dOk(true)
      // No computador o modelo abre direto; no celular, a foto vem primeiro e o 3D é escolha do cliente.
      if (caps.auto && window.innerWidth >= 768) setMode('3d')
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [product, preview])

  const list = product.variants
  const allColors = colors(product)
  const allStorages = unique(list.map((v) => v.storage))
  const allRams = unique(list.map((v) => v.ram))

  const match = (c: string, s: string, r: string) => list.find((v) => (!c || v.color === c) && (!s || v.storage === s) && (!r || v.ram === r))
  const variant: Variant | null = match(color, storage, ram) ?? null
  const usable = (v: Variant | undefined) => !!v && v.availability !== 'indisponivel'

  const chooseColor = (c: string) => {
    setColor(c)
    if (!match(c, storage, ram)) {
      const next = list.find((v) => v.color === c)
      if (next) {
        setStorage(next.storage)
        setRam(next.ram)
      }
    }
  }
  const chooseStorage = (s: string) => {
    setStorage(s)
    if (!match(color, s, ram)) {
      const next = list.find((v) => v.storage === s && v.color === color) ?? list.find((v) => v.storage === s)
      if (next) {
        setColor(next.color)
        setRam(next.ram)
      }
    }
  }
  const chooseRam = (r: string) => {
    setRam(r)
    if (!match(color, storage, r)) {
      const next = list.find((v) => v.ram === r)
      if (next) {
        setColor(next.color)
        setStorage(next.storage)
      }
    }
  }

  const info = priceInfo(product, variant)
  const availability = variant?.availability ?? product.availability
  const condition = variant?.condition ?? product.condition
  const detail = [color, storage, ram && ram !== storage ? ram : ''].filter(Boolean).join(', ')
  const whatsapp = waLink(store.whatsapp, productMessage(store, product, detail))

  const images = useMemo(() => {
    const matching = product.media.filter((m) => !m.color || m.color === color)
    return matching.length ? matching : product.media
  }, [product.media, color])
  const hasVideo = product.media.some((m) => m.kind === 'video')
  const stills = images.filter((m) => m.kind === 'image')
  const videos = product.media.filter((m) => m.kind === 'video')
  const poster = stills[0] ?? primaryImage(product)
  const activeHex = allColors.find((c) => c.name === color)?.hex
  const modelUrl = variant?.modelUrl ?? product.model3d?.url

  const modes: { id: Mode; label: string; icon: React.ReactNode }[] = [
    ...(model3dOk ? [{ id: '3d' as const, label: 'Girar em 3D', icon: <Box className="size-4" strokeWidth={1.5} /> }] : []),
    ...(product.spin.length > 1 ? [{ id: '360' as const, label: '360°', icon: <Rotate3d className="size-4" strokeWidth={1.5} /> }] : []),
    ...(stills.length ? [{ id: 'fotos' as const, label: 'Fotos', icon: <Images className="size-4" strokeWidth={1.5} /> }] : []),
    ...(hasVideo ? [{ id: 'video' as const, label: 'Vídeo', icon: <Video className="size-4" strokeWidth={1.5} /> }] : []),
  ]

  const share = async () => {
    const url = window.location.href
    track('share', { productId: product.id, label: product.name })
    try {
      if (navigator.share) await navigator.share({ title: product.name, url })
      else {
        await navigator.clipboard.writeText(url)
        setShared(true)
        setTimeout(() => setShared(false), 2200)
      }
    } catch {
      // O visitante cancelou o compartilhamento.
    }
  }

  const favorite = shelf.favorites.includes(product.slug)
  const comparing = shelf.compare.includes(product.slug)
  const accessory = product.category?.isAccessory

  return (
    <>
      <div className="grid gap-x-12 lg:grid-cols-12">
        <div className="lg:sticky lg:top-20 lg:col-span-7 lg:self-start">
          <div className="h-[58svh] min-h-[380px] lg:h-[calc(100svh-170px)] lg:max-h-[780px]">
            {mode === '3d' && model3dOk && modelUrl ? (
              <ModelStage
                key={modelUrl}
                url={modelUrl}
                tint={activeHex}
                tintMaterial={product.model3d?.tintMaterial}
                hotspots={product.hotspots}
                poster={poster}
                illustrative={!!product.model3d?.illustrative}
                onFail={() => {
                  setModel3dOk(false)
                  setMode('fotos')
                }}
              />
            ) : mode === '360' ? (
              <SpinViewer frames={product.spin} name={product.name} />
            ) : mode === 'video' ? (
              <Gallery items={videos} name={product.name} />
            ) : (
              <Gallery items={stills.length ? stills : images} name={product.name} />
            )}
          </div>
          {modes.length > 1 && (
            <div role="tablist" aria-label="Forma de visualização" className="mt-3 flex flex-wrap justify-center gap-1.5">
              {modes.map((m) => (
                <button key={m.id} role="tab" type="button" aria-selected={mode === m.id} onClick={() => setMode(m.id)} className="chip !min-h-9 !text-[13px]">
                  {m.icon} {m.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 min-w-0 lg:col-span-5 lg:mt-0">
          <p className="label">{product.brand?.name}{product.model ? ` · ${product.model}` : ''}</p>
          <h1 className="title mt-2 text-[36px] md:text-[52px]">{product.name}</h1>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {product.isNew && <span className="badge badge-accent">Lançamento</span>}
            {info.onSale && <span className="badge badge-accent">Oferta</span>}
            <span className="badge">{CONDITIONS[condition]}</span>
            {product.isDemo && <span className="badge">Demonstração</span>}
          </div>
          {product.shortDescription && <p className="mt-4 text-silver-2">{product.shortDescription}</p>}

          <div className="mt-6">
            <Price info={info} size="lg" />
            <p className={`mt-1 text-[15px] ${STOCK_TONE[availability]}`}>
              {AVAILABILITY[availability]}
              {variant?.stock != null && availability !== 'indisponivel' && variant.stock <= 5 ? ` · ${variant.stock} ${variant.stock === 1 ? 'unidade' : 'unidades'}` : ''}
            </p>
          </div>

          {allColors.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-[14px] text-silver-2">
                Cor: <span className="text-silver-1">{color}</span>
              </p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cor">
                {allColors.map((c) => {
                  const on = list.some((v) => v.color === c.name && usable(v))
                  return (
                    <button key={c.name} type="button" role="radio" aria-checked={c.name === color} aria-label={`${c.name}${on ? '' : ', indisponível'}`} onClick={() => chooseColor(c.name)} className={`relative size-11 rounded-full p-1 ring-1 transition-all ${c.name === color ? 'ring-2 ring-accent' : 'ring-line'}`}>
                      <span className="block size-full rounded-full border border-white/20" style={{ background: c.hex || '#555' }} />
                      {!on && <span className="absolute left-1/2 top-1/2 h-px w-[70%] -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-silver-1" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {allStorages.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-[14px] text-silver-2">Armazenamento</p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Armazenamento">
                {allStorages.map((s) => (
                  <button key={s} type="button" role="radio" aria-checked={s === storage} data-off={!usable(list.find((v) => v.storage === s && (!color || v.color === color)))} onClick={() => chooseStorage(s)} className="chip">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {allRams.length > 1 && (
            <div className="mt-5">
              <p className="mb-2 text-[14px] text-silver-2">Memória RAM</p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Memória RAM">
                {allRams.map((r) => (
                  <button key={r} type="button" role="radio" aria-checked={r === ram} data-off={!usable(list.find((v) => v.ram === r))} onClick={() => chooseRam(r)} className="chip">
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          <a href={whatsapp} target="_blank" rel="noreferrer" onClick={() => track('whatsapp_click', { productId: product.id, label: 'página do aparelho' })} className="btn btn-primary mt-7 w-full">
            <WhatsAppIcon /> Consultar pelo WhatsApp
          </a>
          <div className="mt-2 flex flex-wrap gap-1">
            {!accessory && (
              <button type="button" aria-pressed={comparing} onClick={() => shelf.toggleCompare(product.slug)} className="btn btn-quiet flex-1">
                <GitCompareArrows className={`size-4 ${comparing ? 'text-accent' : ''}`} strokeWidth={1.5} /> {comparing ? 'Na comparação' : 'Comparar'}
              </button>
            )}
            <button type="button" aria-pressed={favorite} onClick={() => shelf.toggleFavorite(product.slug)} className="btn btn-quiet flex-1">
              <Heart className={`size-4 ${favorite ? 'fill-accent text-accent' : ''}`} strokeWidth={1.5} /> {favorite ? 'Salvo' : 'Salvar'}
            </button>
            <button type="button" onClick={share} className="btn btn-quiet flex-1">
              {shared ? <Check className="size-4 text-accent" strokeWidth={1.5} /> : <Share2 className="size-4" strokeWidth={1.5} />} {shared ? 'Link copiado' : 'Compartilhar'}
            </button>
          </div>

          <dl className="mt-6 border-t border-line text-[15px]">
            {product.warranty && (
              <div className="flex justify-between gap-6 border-b border-line py-3">
                <dt className="shrink-0 text-silver-3">Garantia</dt>
                <dd className="text-right">{product.warranty}</dd>
              </div>
            )}
            {product.conditionNotes && (
              <div className="flex justify-between gap-6 border-b border-line py-3">
                <dt className="shrink-0 text-silver-3">Estado do aparelho</dt>
                <dd className="text-right">{product.conditionNotes}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink-0/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        <div className="flex h-[76px] items-center gap-3 px-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] text-silver-3">{product.name}</p>
            <Price info={info} />
          </div>
          <a href={whatsapp} target="_blank" rel="noreferrer" onClick={() => track('whatsapp_click', { productId: product.id, label: 'barra de compra' })} className="btn btn-primary shrink-0 !px-4">
            <WhatsAppIcon /> Consultar
          </a>
        </div>
      </div>
    </>
  )
}
