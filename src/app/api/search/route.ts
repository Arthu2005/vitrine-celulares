import { NextResponse } from 'next/server'
import { getCatalog } from '@/lib/catalog'
import { applyQuery, parseQuery } from '@/lib/filters'
import { primaryImage } from '@/lib/product-utils'

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q') ?? ''
  const { products } = await getCatalog()
  const hits = applyQuery(products, parseQuery({ q })).slice(0, 6)
  return NextResponse.json(hits.map((p) => ({ slug: p.slug, name: p.name, brand: p.brand?.name ?? '', image: primaryImage(p)?.url ?? null })))
}
