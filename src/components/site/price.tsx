import { brl } from '@/lib/format'
import type { PriceInfo } from '@/lib/product-utils'

export function Price({ info, size = 'sm' }: { info: PriceInfo; size?: 'sm' | 'lg' }) {
  if (info.hidden || info.current == null) {
    return <span className={size === 'lg' ? 'title text-[28px]' : 'text-[15px] text-silver-2'}>Consulte o preço</span>
  }
  return (
    <span className="flex flex-wrap items-baseline gap-x-2">
      {info.from && <span className="text-[13px] text-silver-3">a partir de</span>}
      <span className={size === 'lg' ? 'title text-[36px] md:text-[44px]' : 'text-[17px] font-[560]'}>{brl(info.current)}</span>
      {info.original != null && <s className={`text-silver-3 ${size === 'lg' ? 'text-[16px]' : 'text-[13px]'}`}>{brl(info.original)}</s>}
    </span>
  )
}
