'use client'

import { GitCompareArrows, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useShelf } from './shelf'

export type TrayItem = { slug: string; name: string; image: string | null }

export function CompareTray({ items }: { items: TrayItem[] }) {
  const { compare, toggleCompare, message } = useShelf()
  const path = usePathname()
  const picked = compare.map((slug) => items.find((i) => i.slug === slug)).filter((i): i is TrayItem => !!i)

  return (
    <>
      {message && (
        <div role="status" className="fixed inset-x-4 bottom-36 z-50 mx-auto w-fit rounded-md bg-ink-3 px-4 py-2 text-[14px] lg:bottom-24">
          {message}
        </div>
      )}
      {picked.length > 0 && !path.startsWith('/comparar') && (
        <div className={`fixed inset-x-0 z-30 border-t border-line bg-ink-1/95 backdrop-blur-md lg:bottom-0 ${path.startsWith('/celulares/') ? 'bottom-[76px]' : 'bottom-14'}`}>
          <div className="shell flex h-16 items-center gap-3">
            <GitCompareArrows className="hidden size-5 shrink-0 text-accent sm:block" strokeWidth={1.5} />
            <ul className="flex min-w-0 flex-1 gap-2">
              {picked.map((item) => (
                <li key={item.slug} className="flex min-w-0 items-center gap-2 rounded-md bg-ink-2 py-1 pl-1 pr-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {item.image && <img src={item.image} alt="" className="h-9 w-7 object-contain" />}
                  <span className="hidden max-w-[150px] truncate text-[14px] md:block">{item.name}</span>
                  <button type="button" aria-label={`Remover ${item.name}`} onClick={() => toggleCompare(item.slug)} className="grid size-7 place-items-center text-silver-3 hover:text-silver-1">
                    <X className="size-4" strokeWidth={1.5} />
                  </button>
                </li>
              ))}
            </ul>
            <Link href={`/comparar?m=${compare.join(',')}`} className="btn btn-primary !min-h-10 !px-4 !text-[14px]">
              Comparar{picked.length > 1 ? ` ${picked.length}` : ''}
            </Link>
          </div>
        </div>
      )}
    </>
  )
}
