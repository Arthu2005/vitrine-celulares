import { ProductEditor } from '@/components/admin/product-editor'
import { PageHeader } from '@/components/admin/ui'
import { editorOptions } from '@/lib/admin-data'
import { productInputSchema } from '@/lib/schemas'

export default async function NewProductPage() {
  const options = await editorOptions()
  const initial = productInputSchema.parse({ name: 'xx', categoryId: options.categories.find((c) => !c.isAccessory)?.id ?? null })
  return (
    <>
      <PageHeader title="Novo aparelho" />
      <ProductEditor id={null} initial={{ ...initial, name: '' }} status={null} pendingDraft={false} media={{}} {...options} />
    </>
  )
}
