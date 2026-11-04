'use client'

import { GitCompareArrows, Heart } from 'lucide-react'
import Link from 'next/link'
import { AVAILABILITY, CONDITIONS } from '@/lib/constants'
import { track } from '@/lib/client/track'
import { colors, isAvailable, priceInfo, primaryImage, rams, storages } from '@/lib/product-utils'
import type { Product } from '@/lib/types'
import { productMessage, waLink } from '@/lib/whatsapp'
import { WhatsAppIcon } from './icons'
import { Picture } from './picture'
import { Price } from './price'
import { useShelf } from './shelf'
import { useStorePublic } from './store-context'

export function ProductTile({ product, sizes = '(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw', priority }: { product: Product; sizes?: string; priority?: boolean }) {
  const shelf = useShelf()
  const store = useStorePublic()
  const image = primaryImage(product)
  const info = priceInfo(product)
  const specLine = [storages(product).slice(0, 2).join(' / '), rams(product)[0]].filter(Boolean).join(' · ')
  const swatches = colors(product).slice(0, 4)
  const available = isAvailable(product)
  const favorite = shelf.favorites.includes(product.slug)
  const comparing = shelf.compare.includes(product.slug)
  const accessory = product.category?.isAccessory

  return (
    <article className="tile group relative flex min-w-0 flex-col">
      <div className="absolute right-0 top-0 z-10 flex flex-col gap-1">
        <button type="button" aria-label={favorite ? 'Remover dos favoritos' : 'Salvar nos favoritos'} aria-pressed={favorite} onClick={() => shelf.toggleFavorite(product.slug)} className="grid size-10 place-items-center rounded-full text-silver-2 hover:text-silver-1">
          <Heart className={`size-[18px] ${favorite ? 'fill-accent text-accent' : ''}`} strokeWidth={1.5} />
        </button>
        {!accessory && (
          <button type="button" aria-label={comparing ? 'Remover da comparação' : 'Adicionar à comparação'} aria-pressed={comparing} onClick={() => shelf.toggleCompare(product.slug)} className="grid size-10 place-items-center rounded-full text-silver-2 hover:text-silver-1">
            <GitCompareArrows className={`size-[18px] ${comparing ? 'text-accent' : ''}`} strokeWidth={1.5} />
          </button>
        )}
      </div>

      <Link href={`/celulares/${product.slug}`} className="block focus-visible:outline-offset-4">
        <div className="absolute left-0 top-1 z-10 flex flex-col items-start gap-1">
          {product.isNew && <span className="badge badge-accent">Lançamento</span>}
          {info.onSale && <span className="badge badge-accent">Oferta</span>}
          {product.condition !== 'novo' && <span className="badge">{CONDITIONS[product.condition]}</span>}
          {product.isDemo && <span className="badge">Demonstração</span>}
        </div>
        <div className="platform aspect-[4/5] w-full">
          {image && (
            <div className={`tile-device absolute inset-x-[14%] bottom-[12%] top-[15%] sm:top-[6%] ${available ? '' : 'opacity-45 grayscale'}`}>
              <Picture item={image} alt={image.alt || product.name} sizes={sizes} priority={priority} className="size-full object-contain object-bottom" />
            </div>
          )}
        </div>
        <div className="mt-3 min-w-0">
          <p className="label truncate">{product.brand?.name ?? ' '}</p>
          <h3 className="title mt-1 text-[18px] md:text-[20px]">{product.name}</h3>
          {specLine && <p className="mt-1 truncate font-mono text-[12px] text-silver-3">{specLine}</p>}
        </div>
      </Link>

      {swatches.length > 1 && (
        <div className="mt-2 flex items-center gap-1.5" aria-label={`Cores: ${swatches.map((c) => c.name).join(', ')}`}>
          {swatches.map((c) => (
            <span key={c.name} title={c.name} className="size-3 rounded-full border border-white/25" style={{ background: c.hex || '#555' }} />
          ))}
        </div>
      )}

      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <Price info={info} />
          {product.availability !== 'disponivel' && <p className={`mt-0.5 text-[13px] ${product.availability === 'indisponivel' ? 'text-bad' : 'text-warn'}`}>{AVAILABILITY[product.availability]}</p>}
        </div>
        <a
          href={waLink(store.whatsapp, productMessage(store, product))}
          target="_blank"
          rel="noreferrer"
          aria-label={`Consultar ${product.name} pelo WhatsApp`}
          onClick={() => track('whatsapp_click', { productId: product.id, label: 'card' })}
          className="grid size-10 shrink-0 place-items-center rounded-full border border-line text-silver-2 transition-colors hover:border-accent hover:text-accent"
        >
          <WhatsAppIcon />
        </a>
      </div>
      <Link href={`/celulares/${product.slug}`} className="mt-1 inline-flex min-h-9 items-center text-[14px] text-silver-2 underline-offset-4 hover:text-silver-1 hover:underline">
        Ver aparelho
      </Link>
    </article>
  )
}
