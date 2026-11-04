import { notFound } from 'next/navigation'
import { ProductPage } from '@/components/site/product-page'
import { getCatalog, getPreviewProduct } from '@/lib/catalog'

export default async function ProductPreview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await getPreviewProduct(id)
  if (!product) notFound()
  const catalog = await getCatalog()
  return <ProductPage product={product} accessories={product.accessoryIds.flatMap((a) => catalog.products.find((p) => p.id === a) ?? [])} related={[]} preview />
}
