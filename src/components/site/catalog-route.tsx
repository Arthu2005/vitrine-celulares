import { STATIC_SITE } from '@/lib/site-mode'
import { StaticCatalog } from './catalog-static'
import { CatalogView } from './catalog-view'

type Props = Omit<React.ComponentProps<typeof CatalogView>, 'params'> & {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function CatalogRoute({ searchParams, ...props }: Props) {
  if (STATIC_SITE) return <StaticCatalog {...props} />
  return <CatalogView {...props} params={await searchParams} />
}
