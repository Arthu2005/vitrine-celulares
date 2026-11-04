import { notFound } from 'next/navigation'
import { ProductEditor } from '@/components/admin/product-editor'
import { PageHeader } from '@/components/admin/ui'
import { editorOptions, mediaLookup } from '@/lib/admin-data'
import { getEditableProduct } from '@/lib/catalog'

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getEditableProduct(id)
  if (!data) notFound()
  const [options, media] = await Promise.all([editorOptions(), mediaLookup(data.input)])
  return (
    <>
      <PageHeader title={data.input.name} />
      <ProductEditor key={data.row.updatedAt} id={id} initial={data.input} status={data.row.status} pendingDraft={data.hasPendingDraft} media={media} {...options} />
    </>
  )
}
