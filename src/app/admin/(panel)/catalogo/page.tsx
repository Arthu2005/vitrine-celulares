import { asc, inArray } from 'drizzle-orm'
import { CatalogManager } from '@/components/admin/catalog-manager'
import { PageHeader } from '@/components/admin/ui'
import { db, schema } from '@/lib/db'
import { productOptions } from '../../actions'

export default async function CatalogAdminPage() {
  const [brands, categories, collections, products] = await Promise.all([
    db.select().from(schema.brands).orderBy(asc(schema.brands.sortOrder)),
    db.select().from(schema.categories).orderBy(asc(schema.categories.sortOrder)),
    db.select().from(schema.collections).orderBy(asc(schema.collections.sortOrder)),
    productOptions(),
  ])
  const ids = collections.map((c) => c.id)
  const links = ids.length ? await db.select().from(schema.collectionProducts).where(inArray(schema.collectionProducts.collectionId, ids)).orderBy(asc(schema.collectionProducts.sortOrder)) : []
  return (
    <>
      <PageHeader title="Marcas, categorias e coleções" description="Nada aqui é fixo no site. Marcas sem produto publicado não aparecem no menu." />
      <CatalogManager
        brands={brands.map(({ id, name, slug, showInNav }) => ({ id, name, slug, showInNav }))}
        categories={categories.map(({ id, name, slug, showInNav, isAccessory }) => ({ id, name, slug, showInNav, isAccessory }))}
        collections={collections.map(({ id, name, slug, description, visible }) => ({ id, name, slug, description, visible, productIds: links.filter((l) => l.collectionId === id).map((l) => l.productId) }))}
        products={products}
      />
    </>
  )
}
