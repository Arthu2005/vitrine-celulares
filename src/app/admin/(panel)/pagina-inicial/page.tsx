import { asc, eq } from 'drizzle-orm'
import { HomeEditor } from '@/components/admin/home-editor'
import { PageHeader } from '@/components/admin/ui'
import { db, schema } from '@/lib/db'
import { getHomeDraft } from '@/lib/settings'
import { mediaItems } from '@/lib/media-lookup'

export default async function HomeEditorPage() {
  const [{ value, pending }, products, collections] = await Promise.all([
    getHomeDraft(),
    db.select({ id: schema.products.id, name: schema.products.name }).from(schema.products).where(eq(schema.products.status, 'published')).orderBy(asc(schema.products.name)),
    db.select({ id: schema.collections.id, name: schema.collections.name }).from(schema.collections),
  ])
  const images = await mediaItems([value.hero.imageMediaId, ...value.blocks.map((b) => (b.type === 'banner' ? b.imageMediaId : null))])
  return (
    <>
      <PageHeader title="Página inicial" description="Blocos prontos: ligue, desligue, reordene e edite. Seções sem produtos não aparecem na vitrine." />
      <HomeEditor initial={value} pending={pending} products={products} collections={collections} imageUrls={Object.fromEntries([...images].map(([id, m]) => [id, m.url]))} />
    </>
  )
}
