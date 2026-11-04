import type { MediaItem } from '@/lib/types'

type Props = {
  item: MediaItem
  alt?: string
  sizes: string
  className?: string
  priority?: boolean
}

export function Picture({ item, alt, sizes, className, priority }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.url}
      srcSet={item.srcSet}
      sizes={sizes}
      alt={alt ?? item.alt}
      width={item.width}
      height={item.height}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      className={className}
    />
  )
}
