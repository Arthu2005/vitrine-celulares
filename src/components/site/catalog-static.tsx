'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { CatalogView } from './catalog-view'

type Props = Omit<React.ComponentProps<typeof CatalogView>, 'params'>

function Filtered(props: Props) {
  const search = useSearchParams()
  return <CatalogView {...props} params={Object.fromEntries(search)} />
}

/** Sem servidor, os filtros são aplicados no navegador sobre o catálogo já incluído na página. */
export function StaticCatalog(props: Props) {
  return (
    <Suspense fallback={<CatalogView {...props} params={{}} />}>
      <Filtered {...props} />
    </Suspense>
  )
}
