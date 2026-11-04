import { and, count, desc, eq, gte, isNotNull, sql } from 'drizzle-orm'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { RemoveDemoButton } from '@/components/admin/remove-demo'
import { PageHeader } from '@/components/admin/ui'
import { requireUser } from '@/lib/auth'
import { db, schema } from '@/lib/db'
import { dateTime } from '@/lib/format'
import { getStore } from '@/lib/settings'

const DAYS = 30

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-[13px] text-silver-3">{label}</p>
      <p className="title mt-1 text-[30px]">{value}</p>
      {hint && <p className="text-[13px] text-silver-3">{hint}</p>}
    </div>
  )
}

function Ranking({ title, rows, empty, unit }: { title: string; rows: { label: string; value: number }[]; empty: string; unit?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <section className="card p-4">
      <h2 className="font-[560]">{title}</h2>
      {rows.length ? (
        <ol className="mt-3 space-y-2.5">
          {rows.map((r) => (
            <li key={r.label}>
              <div className="flex justify-between gap-3 text-[14px]">
                <span className="min-w-0 truncate">{r.label}</span>
                <span className="shrink-0 font-mono text-silver-2">
                  {r.value}
                  {unit ? ` ${unit}` : ''}
                </span>
              </div>
              <div className="mt-1 h-1 rounded-full bg-ink-3">
                <div className="h-1 rounded-full bg-accent" style={{ width: `${(r.value / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-2 text-[14px] text-silver-3">{empty}</p>
      )}
    </section>
  )
}

export default async function Dashboard() {
  const user = await requireUser()
  const since = Date.now() - DAYS * 86_400_000
  const [products, store, demoCount] = await Promise.all([
    db.select({ id: schema.products.id, name: schema.products.name, status: schema.products.status, availability: schema.products.availability, isFeatured: schema.products.isFeatured, draft: schema.products.draftJson }).from(schema.products),
    getStore(),
    db.$count(schema.products, eq(schema.products.isDemo, true)),
  ])
  const names = new Map(products.map((p) => [p.id, p.name]))

  const byProduct = (type: string) =>
    db
      .select({ productId: schema.events.productId, value: count() })
      .from(schema.events)
      .where(and(eq(schema.events.type, type), gte(schema.events.createdAt, since), isNotNull(schema.events.productId)))
      .groupBy(schema.events.productId)
      .orderBy(desc(count()))
      .limit(6)
  const byLabel = (type: string, extra?: ReturnType<typeof eq>) =>
    db
      .select({ label: schema.events.label, value: count() })
      .from(schema.events)
      .where(and(eq(schema.events.type, type), gte(schema.events.createdAt, since), extra))
      .groupBy(schema.events.label)
      .orderBy(desc(count()))
      .limit(6)

  const [views, clicks, emptySearches, comparisons, totals, activity] = await Promise.all([
    byProduct('product_view'),
    byProduct('whatsapp_click'),
    byLabel('search', eq(schema.events.results, 0)),
    byLabel('compare'),
    db.select({ type: schema.events.type, value: count() }).from(schema.events).where(gte(schema.events.createdAt, since)).groupBy(schema.events.type),
    db.select().from(schema.auditLog).orderBy(desc(schema.auditLog.createdAt)).limit(8),
  ])
  const total = (type: string) => totals.find((t) => t.type === type)?.value ?? 0
  const toRows = (list: { productId: string | null; value: number }[]) => list.flatMap((r) => (names.has(r.productId!) ? [{ label: names.get(r.productId!)!, value: r.value }] : []))

  const published = products.filter((p) => p.status === 'published')
  const warnings = [!store.whatsapp && 'WhatsApp da loja não configurado: os botões abrem o WhatsApp sem destinatário.', store.name === 'Sua Loja' && 'Defina o nome da loja.', !store.address && 'Endereço da loja não informado.'].filter(Boolean) as string[]

  return (
    <>
      <PageHeader title={`Olá, ${user.name.split(' ')[0]}`} description={`Números dos últimos ${DAYS} dias, medidos pela própria vitrine.`} actions={<Link href="/admin/produtos/novo" className="btn btn-primary">Novo aparelho</Link>} />

      {(warnings.length > 0 || demoCount > 0) && (
        <section className="mb-6 rounded-md border border-warn/40 p-4">
          {warnings.map((w) => (
            <Link key={w} href="/admin/configuracoes" className="flex items-center gap-2 py-1 text-[14px]">
              <AlertTriangle className="size-4 shrink-0 text-warn" strokeWidth={1.5} /> <span className="min-w-0 flex-1">{w}</span> <ArrowRight className="size-4 shrink-0 text-silver-3" strokeWidth={1.5} />
            </Link>
          ))}
          {demoCount > 0 && (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
              <p className="text-[14px] text-silver-2">Há {demoCount} produtos de demonstração, com dados fictícios, publicados na vitrine.</p>
              {user.role === 'owner' && <RemoveDemoButton />}
            </div>
          )}
        </section>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Produtos cadastrados" value={products.length} />
        <Stat label="Publicados" value={published.length} hint={`${products.length - published.length} em rascunho`} />
        <Stat label="Disponíveis" value={published.filter((p) => p.availability !== 'indisponivel').length} hint={`${published.filter((p) => p.availability === 'indisponivel').length} sem disponibilidade`} />
        <Stat label="Em destaque" value={published.filter((p) => p.isFeatured).length} />
        <Stat label="Visualizações de produto" value={total('product_view')} />
        <Stat label="Cliques no WhatsApp" value={total('whatsapp_click')} />
        <Stat label="Comparações" value={total('compare')} />
        <Stat label="Pesquisas" value={total('search')} />
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <Ranking title="Aparelhos mais vistos" rows={toRows(views)} empty="Ainda não há visualizações registradas." />
        <Ranking title="Mais consultados no WhatsApp" rows={toRows(clicks)} empty="Nenhum clique registrado ainda." />
        <Ranking title="Pesquisas sem resultado" rows={emptySearches.map((r) => ({ label: r.label || '(vazio)', value: r.value }))} empty="Nenhuma pesquisa ficou sem resposta." />
        <Ranking title="Comparações mais usadas" rows={comparisons.map((r) => ({ label: r.label, value: r.value }))} empty="Nenhuma comparação registrada ainda." />
      </div>

      <section className="card mt-6 p-4">
        <h2 className="font-[560]">Atividade recente</h2>
        {activity.length ? (
          <ul className="mt-2 divide-y divide-line">
            {activity.map((a) => (
              <li key={a.id} className="flex flex-wrap justify-between gap-x-4 py-2 text-[14px]">
                <span className="min-w-0">
                  <span className="text-silver-2">{a.userName}:</span> {a.summary}
                </span>
                <span className="font-mono text-[12px] text-silver-3">{dateTime(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[14px] text-silver-3">Nenhuma alteração feita no painel até agora.</p>
        )}
      </section>
    </>
  )
}
