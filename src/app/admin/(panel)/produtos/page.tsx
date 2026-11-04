import { and, asc, count, desc, eq, inArray, like, or } from 'drizzle-orm'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { ProductRowActions } from '@/components/admin/product-row'
import { EmptyState, PageHeader } from '@/components/admin/ui'
import { db, schema } from '@/lib/db'
import { brl } from '@/lib/format'
import { publicUrl } from '@/lib/storage'

const PER_PAGE = 20

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; pagina?: string }> }) {
  const { q = '', status = '', pagina = '1' } = await searchParams
  const page = Math.max(1, parseInt(pagina) || 1)
  const term = `%${q.trim()}%`
  const where = and(
    q.trim() ? or(like(schema.products.name, term), like(schema.products.model, term), like(schema.products.sku, term)) : undefined,
    status === 'draft' || status === 'published' ? eq(schema.products.status, status) : undefined,
  )
  const [rows, [{ total }], brands] = await Promise.all([
    db.select().from(schema.products).where(where).orderBy(desc(schema.products.updatedAt)).limit(PER_PAGE).offset((page - 1) * PER_PAGE),
    db.select({ total: count() }).from(schema.products).where(where),
    db.select().from(schema.brands),
  ])
  const ids = rows.map((r) => r.id)
  const links = ids.length ? await db.select().from(schema.productMedia).where(and(inArray(schema.productMedia.productId, ids), eq(schema.productMedia.role, 'gallery'))).orderBy(asc(schema.productMedia.sortOrder)) : []
  const mediaIds = [...new Set(links.map((l) => l.mediaId))]
  const media = mediaIds.length ? await db.select().from(schema.media).where(inArray(schema.media.id, mediaIds)) : []
  const thumb = (id: string) => {
    const link = links.find((l) => l.productId === id)
    const row = media.find((m) => m.id === link?.mediaId)
    return row ? publicUrl(row.variants?.['480'] ?? row.storageKey) : null
  }
  const pages = Math.ceil(total / PER_PAGE)
  const query = (next: number) => `?${new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}), pagina: String(next) })}`

  return (
    <>
      <PageHeader
        title="Produtos"
        description={`${total} ${total === 1 ? 'produto' : 'produtos'}`}
        actions={
          <Link href="/admin/produtos/novo" className="btn btn-primary">
            <Plus className="size-4" strokeWidth={1.5} /> Novo aparelho
          </Link>
        }
      />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Buscar por nome, modelo ou código" aria-label="Buscar produtos" className="field min-w-[200px] flex-1" />
        <select name="status" defaultValue={status} aria-label="Filtrar por situação" className="field !w-auto">
          <option value="">Todos</option>
          <option value="published">Publicados</option>
          <option value="draft">Rascunhos</option>
        </select>
        <button className="btn btn-secondary">Filtrar</button>
      </form>

      {rows.length === 0 ? (
        <EmptyState title="Nenhum produto encontrado." text={q ? 'Tente outro termo de busca.' : 'Cadastre o primeiro aparelho da loja.'} action={<Link href="/admin/produtos/novo" className="btn btn-primary">Novo aparelho</Link>} />
      ) : (
        <ul className="space-y-2">
          {rows.map((p) => {
            const image = thumb(p.id)
            return (
              <li key={p.id} className="card flex flex-wrap items-center gap-3 p-3">
                <Link href={`/admin/produtos/${p.id}`} className="flex min-w-0 flex-1 basis-[240px] items-center gap-3">
                  <span className="grid h-16 w-12 shrink-0 place-items-center overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {image && <img src={image} alt="" className="size-full object-contain" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-[560]">{p.name}</span>
                    <span className="block truncate text-[13px] text-silver-3">
                      {brands.find((b) => b.id === p.brandId)?.name ?? 'Sem marca'}
                      {p.hidePrice ? ' · preço oculto' : p.price != null ? ` · ${brl(p.promoPrice ?? p.price)}` : ''}
                    </span>
                    <span className="mt-1 flex flex-wrap gap-1">
                      <span className={`badge ${p.status === 'published' ? '!text-ok' : ''}`}>{p.status === 'published' ? 'Publicado' : 'Rascunho'}</span>
                      {p.draftJson && <span className="badge !text-warn">Alterações pendentes</span>}
                      {p.isDemo && <span className="badge">Demonstração</span>}
                    </span>
                  </span>
                </Link>
                <ProductRowActions id={p.id} slug={p.slug} name={p.name} status={p.status} availability={p.availability} />
              </li>
            )
          })}
        </ul>
      )}

      {pages > 1 && (
        <nav aria-label="Páginas" className="mt-5 flex items-center justify-center gap-3 text-[14px]">
          {page > 1 && <Link href={query(page - 1)} className="btn btn-secondary">Anterior</Link>}
          <span className="font-mono text-silver-3">
            {page} / {pages}
          </span>
          {page < pages && <Link href={query(page + 1)} className="btn btn-secondary">Próxima</Link>}
        </nav>
      )}
    </>
  )
}
