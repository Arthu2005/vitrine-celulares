'use server'

import { and, asc, desc, eq, inArray, like, ne, or, sql } from 'drizzle-orm'
import { updateTag } from 'next/cache'
import { randomBytes } from 'node:crypto'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { audit, clientIp, consumePasswordReset, createPasswordReset, hashPassword, isLimited, login, logout, newId, registerAttempt, requireOwner, requireUser, verifyPassword } from '@/lib/auth'
import { db, schema } from '@/lib/db'
import { deleteProductRows, writeProduct } from '@/lib/product-store'
import { homeSchema, productInputSchema, publishIssues, slugify, storeSchema, type ProductInput } from '@/lib/schemas'
import { getEditableProduct } from '@/lib/catalog'
import { writeSetting } from '@/lib/settings'
import { publicUrl, removeObject } from '@/lib/storage'
import { siteUrl } from '@/lib/whatsapp'
import type { ActionResult } from './types'

const fail = (error: string) => ({ ok: false as const, error })
const firstIssue = (e: z.ZodError) => e.issues[0]?.message ?? 'Dados inválidos.'

/* Acesso */

export async function loginAction(_: unknown, form: FormData) {
  const result = await login(String(form.get('email') ?? ''), String(form.get('password') ?? ''))
  if ('error' in result) return { error: result.error }
  redirect('/admin')
}

export async function logoutAction() {
  await logout()
  redirect('/admin/login')
}

export async function requestResetAction(_: unknown, form: FormData) {
  const email = String(form.get('email') ?? '')
  const key = `reset|${await clientIp()}`
  if (!(await isLimited(key))) {
    await registerAttempt(key)
    const reset = await createPasswordReset(email)
    if (reset) {
      const link = `${siteUrl()}/admin/redefinir/${reset.token}`
      if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
          body: JSON.stringify({ from: process.env.EMAIL_FROM, to: reset.user.email, subject: 'Redefinir sua senha', text: `Use este link em até 1 hora para criar uma nova senha:\n${link}` }),
        })
      } else {
        console.log(`[recuperação de senha] ${reset.user.email}: ${link}`)
      }
    }
  }
  // A resposta é sempre igual, para não revelar quais e-mails existem.
  return { sent: true }
}

export async function resetPasswordAction(_: unknown, form: FormData) {
  const password = String(form.get('password') ?? '')
  if (password.length < 10) return { error: 'Use pelo menos 10 caracteres.' }
  const ok = await consumePasswordReset(String(form.get('token') ?? ''), password)
  if (!ok) return { error: 'Link inválido ou expirado. Peça um novo.' }
  redirect('/admin/login')
}

/* Produtos */

export async function saveProduct(id: string | null, raw: unknown, mode: 'draft' | 'publish'): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser()
  const parsed = productInputSchema.safeParse(raw)
  if (!parsed.success) return fail(firstIssue(parsed.error))
  const input: ProductInput = { ...parsed.data, slug: slugify(parsed.data.slug || parsed.data.name) }
  if (!input.slug) return fail('Não foi possível criar o endereço a partir do nome.')

  if (mode === 'publish') {
    const issues = publishIssues(input)
    if (issues.length) return { ok: false, error: 'Faltam itens para publicar.', issues }
  }

  const conflict = await db.select({ id: schema.products.id }).from(schema.products).where(and(eq(schema.products.slug, input.slug), id ? ne(schema.products.id, id) : undefined))
  if (conflict.length) return fail('Já existe outro produto com este endereço. Altere o campo "Endereço".')

  const productId = id ?? newId()
  const [existing] = id ? await db.select().from(schema.products).where(eq(schema.products.id, id)) : []
  if (id && !existing) return fail('Este produto não existe mais.')

  if (existing?.status === 'published' && mode === 'draft') {
    // Publicado continua no ar sem mudanças; as edições ficam guardadas à parte.
    await db.update(schema.products).set({ draftJson: input }).where(eq(schema.products.id, productId))
  } else {
    const status = mode === 'publish' ? 'published' : 'draft'
    await writeProduct(productId, input, { status, isDemo: existing?.isDemo, publishedAt: mode === 'publish' ? (existing?.publishedAt ?? Date.now()) : existing?.publishedAt })
  }
  await audit(user.name, `${mode === 'publish' ? 'Publicou' : 'Salvou rascunho de'} ${input.name}`)
  updateTag('catalog')
  return { ok: true, id: productId }
}

export async function setProductStatus(id: string, status: 'draft' | 'published'): Promise<ActionResult> {
  const user = await requireUser()
  const data = await getEditableProduct(id)
  if (!data) return fail('Produto não encontrado.')
  if (status === 'published') {
    const issues = publishIssues(data.input)
    if (issues.length) return { ok: false, error: 'Faltam itens para publicar.', issues }
    await writeProduct(id, data.input, { status, isDemo: data.row.isDemo, publishedAt: data.row.publishedAt ?? Date.now() })
  } else {
    await db.update(schema.products).set({ status: 'draft' }).where(eq(schema.products.id, id))
  }
  await audit(user.name, `${status === 'published' ? 'Publicou' : 'Despublicou'} ${data.row.name}`)
  updateTag('catalog')
  return { ok: true }
}

export async function quickUpdateProduct(id: string, patch: { availability?: string; stock?: number | null }): Promise<ActionResult> {
  await requireUser()
  const value = z.object({ availability: z.enum(['disponivel', 'ultimas', 'encomenda', 'indisponivel']).optional(), stock: z.number().int().min(0).nullable().optional() }).safeParse(patch)
  if (!value.success) return fail('Valor inválido.')
  await db.update(schema.products).set(value.data).where(eq(schema.products.id, id))
  updateTag('catalog')
  return { ok: true }
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const user = await requireUser()
  const [row] = await db.select().from(schema.products).where(eq(schema.products.id, id))
  if (!row) return fail('Produto não encontrado.')
  await deleteProductRows(id)
  await audit(user.name, `Excluiu ${row.name}`)
  updateTag('catalog')
  return { ok: true }
}

/* Mídia */

export async function listMedia(kind?: 'image' | 'video' | 'model') {
  await requireUser()
  const rows = await db.select().from(schema.media).where(kind ? eq(schema.media.kind, kind) : undefined).orderBy(desc(schema.media.createdAt)).limit(300)
  return rows.map((m) => ({ id: m.id, kind: m.kind, name: m.name, size: m.size, url: publicUrl(m.variants?.['480'] ?? m.storageKey), fullUrl: publicUrl(m.storageKey), alt: m.alt, meta: m.meta, width: m.width, height: m.height }))
}

async function mediaUsage(id: string) {
  const [gallery, variants, models, drafts, settingRows] = await Promise.all([
    db.select({ id: schema.productMedia.productId }).from(schema.productMedia).where(eq(schema.productMedia.mediaId, id)),
    db.select({ id: schema.productVariants.id }).from(schema.productVariants).where(eq(schema.productVariants.modelMediaId, id)),
    db.select({ id: schema.products.id }).from(schema.products).where(eq(schema.products.modelMediaId, id)),
    db.select({ id: schema.products.id }).from(schema.products).where(like(sql`${schema.products.draftJson}`, `%${id}%`)),
    db.select({ key: schema.settings.key }).from(schema.settings).where(or(like(sql`${schema.settings.published}`, `%${id}%`), like(sql`${schema.settings.draft}`, `%${id}%`))),
  ])
  return gallery.length + variants.length + models.length + drafts.length + settingRows.length
}

export async function getMediaUsage(id: string) {
  await requireUser()
  return mediaUsage(id)
}

export async function updateMedia(id: string, patch: { alt: string; name: string }): Promise<ActionResult> {
  await requireUser()
  await db.update(schema.media).set({ alt: patch.alt.slice(0, 200), name: patch.name.slice(0, 120) || 'arquivo' }).where(eq(schema.media.id, id))
  updateTag('catalog')
  return { ok: true }
}

export async function deleteMedia(id: string): Promise<ActionResult> {
  const user = await requireUser()
  const [row] = await db.select().from(schema.media).where(eq(schema.media.id, id))
  if (!row) return fail('Arquivo não encontrado.')
  const used = await mediaUsage(id)
  if (used) return fail(`Este arquivo está em uso em ${used} ${used === 1 ? 'lugar' : 'lugares'}. Retire-o de lá antes de excluir.`)
  for (const key of new Set([row.storageKey, ...Object.values(row.variants ?? {})])) await removeObject(key)
  await db.delete(schema.media).where(eq(schema.media.id, id))
  await audit(user.name, `Excluiu o arquivo ${row.name}`)
  return { ok: true }
}

/* Marcas, categorias e coleções */

const nameSlug = z.object({ name: z.string().trim().min(1, 'Informe o nome.').max(80), slug: z.string().trim().max(80).default('') })

export async function saveBrand(id: string | null, raw: unknown): Promise<ActionResult> {
  const user = await requireUser()
  const parsed = nameSlug.extend({ showInNav: z.boolean().default(true) }).safeParse(raw)
  if (!parsed.success) return fail(firstIssue(parsed.error))
  const slug = slugify(parsed.data.slug || parsed.data.name)
  const clash = await db.select({ id: schema.brands.id }).from(schema.brands).where(and(eq(schema.brands.slug, slug), id ? ne(schema.brands.id, id) : undefined))
  if (clash.length) return fail('Já existe uma marca com este endereço.')
  if (id) await db.update(schema.brands).set({ ...parsed.data, slug }).where(eq(schema.brands.id, id))
  else {
    const count = await db.$count(schema.brands)
    await db.insert(schema.brands).values({ id: newId(), ...parsed.data, slug, sortOrder: count })
  }
  await audit(user.name, `Salvou a marca ${parsed.data.name}`)
  updateTag('catalog')
  return { ok: true }
}

export async function deleteBrand(id: string): Promise<ActionResult> {
  await requireUser()
  const used = await db.$count(schema.products, eq(schema.products.brandId, id))
  if (used) return fail(`Há ${used} ${used === 1 ? 'produto' : 'produtos'} nesta marca. Troque a marca deles antes de excluir.`)
  await db.delete(schema.brands).where(eq(schema.brands.id, id))
  updateTag('catalog')
  return { ok: true }
}

export async function saveCategory(id: string | null, raw: unknown): Promise<ActionResult> {
  const user = await requireUser()
  const parsed = nameSlug.extend({ showInNav: z.boolean().default(true), isAccessory: z.boolean().default(false) }).safeParse(raw)
  if (!parsed.success) return fail(firstIssue(parsed.error))
  const slug = slugify(parsed.data.slug || parsed.data.name)
  const clash = await db.select({ id: schema.categories.id }).from(schema.categories).where(and(eq(schema.categories.slug, slug), id ? ne(schema.categories.id, id) : undefined))
  if (clash.length) return fail('Já existe uma categoria com este endereço.')
  if (id) await db.update(schema.categories).set({ ...parsed.data, slug }).where(eq(schema.categories.id, id))
  else {
    const count = await db.$count(schema.categories)
    await db.insert(schema.categories).values({ id: newId(), ...parsed.data, slug, sortOrder: count })
  }
  await audit(user.name, `Salvou a categoria ${parsed.data.name}`)
  updateTag('catalog')
  return { ok: true }
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  await requireUser()
  const used = await db.$count(schema.products, eq(schema.products.categoryId, id))
  if (used) return fail(`Há ${used} ${used === 1 ? 'produto' : 'produtos'} nesta categoria. Mova-os antes de excluir.`)
  await db.delete(schema.categories).where(eq(schema.categories.id, id))
  updateTag('catalog')
  return { ok: true }
}

export async function saveCollection(id: string | null, raw: unknown): Promise<ActionResult> {
  const user = await requireUser()
  const parsed = nameSlug.extend({ description: z.string().trim().max(300).default(''), visible: z.boolean().default(true), productIds: z.array(z.string()).max(100).default([]) }).safeParse(raw)
  if (!parsed.success) return fail(firstIssue(parsed.error))
  const { productIds, ...fields } = parsed.data
  const slug = slugify(fields.slug || fields.name)
  const clash = await db.select({ id: schema.collections.id }).from(schema.collections).where(and(eq(schema.collections.slug, slug), id ? ne(schema.collections.id, id) : undefined))
  if (clash.length) return fail('Já existe uma coleção com este endereço.')
  const collectionId = id ?? newId()
  if (id) await db.update(schema.collections).set({ ...fields, slug }).where(eq(schema.collections.id, id))
  else await db.insert(schema.collections).values({ id: collectionId, ...fields, slug, sortOrder: await db.$count(schema.collections) })
  await db.delete(schema.collectionProducts).where(eq(schema.collectionProducts.collectionId, collectionId))
  if (productIds.length) await db.insert(schema.collectionProducts).values(productIds.map((productId, sortOrder) => ({ collectionId, productId, sortOrder })))
  await audit(user.name, `Salvou a coleção ${fields.name}`)
  updateTag('catalog')
  return { ok: true }
}

export async function deleteCollection(id: string): Promise<ActionResult> {
  await requireUser()
  await db.delete(schema.collectionProducts).where(eq(schema.collectionProducts.collectionId, id))
  await db.delete(schema.collections).where(eq(schema.collections.id, id))
  updateTag('catalog')
  return { ok: true }
}

export async function reorder(table: 'brands' | 'categories' | 'collections', ids: string[]): Promise<ActionResult> {
  await requireUser()
  const target = schema[table]
  await db.transaction(async (tx) => {
    for (const [sortOrder, id] of ids.entries()) await tx.update(target).set({ sortOrder }).where(eq(target.id, id))
  })
  updateTag('catalog')
  return { ok: true }
}

/* Página inicial e configurações */

export async function saveHome(raw: unknown, mode: 'draft' | 'publish'): Promise<ActionResult> {
  const user = await requireUser()
  const parsed = homeSchema.safeParse(raw)
  if (!parsed.success) return fail(firstIssue(parsed.error))
  await writeSetting('home', parsed.data, mode)
  await audit(user.name, mode === 'publish' ? 'Publicou a página inicial' : 'Salvou rascunho da página inicial')
  updateTag('settings')
  return { ok: true }
}

export async function saveStore(raw: unknown, mode: 'draft' | 'publish'): Promise<ActionResult> {
  const user = await requireUser()
  const parsed = storeSchema.safeParse(raw)
  if (!parsed.success) return fail(firstIssue(parsed.error))
  const digits = parsed.data.whatsapp.replace(/\D/g, '')
  if (parsed.data.whatsapp && (digits.length < 10 || digits.length > 15)) return fail('WhatsApp inválido. Use DDI, DDD e número, como 55 11 91234-5678.')
  await writeSetting('store', { ...parsed.data, whatsapp: digits }, mode)
  await audit(user.name, mode === 'publish' ? 'Publicou as configurações da loja' : 'Salvou rascunho das configurações')
  updateTag('settings')
  return { ok: true }
}

export async function removeDemoData(): Promise<ActionResult> {
  const user = await requireOwner()
  const demo = await db.select({ id: schema.products.id }).from(schema.products).where(eq(schema.products.isDemo, true))
  for (const { id } of demo) await deleteProductRows(id)
  const demoCollections = await db.select({ id: schema.collections.id }).from(schema.collections).where(eq(schema.collections.isDemo, true))
  if (demoCollections.length) {
    await db.delete(schema.collectionProducts).where(inArray(schema.collectionProducts.collectionId, demoCollections.map((c) => c.id)))
    await db.delete(schema.collections).where(eq(schema.collections.isDemo, true))
  }
  await db.delete(schema.brands).where(eq(schema.brands.isDemo, true))
  const media = await db.select().from(schema.media).where(eq(schema.media.isDemo, true))
  for (const row of media) {
    for (const key of new Set([row.storageKey, ...Object.values(row.variants ?? {})])) await removeObject(key)
  }
  await db.delete(schema.media).where(eq(schema.media.isDemo, true))

  const [store] = await db.select().from(schema.settings).where(eq(schema.settings.key, 'store'))
  if (store) {
    const clean = Object.fromEntries(Object.entries(store.published).map(([k, v]) => [k, typeof v === 'string' && v.startsWith('[Demonstração]') ? '' : v]))
    const hours = (clean.hours as { label: string }[] | undefined)?.filter((h) => !h.label.startsWith('[Demonstração]')) ?? []
    await writeSetting('store', { ...clean, hours, demoNotice: false }, 'publish')
  }
  const [home] = await db.select().from(schema.settings).where(eq(schema.settings.key, 'home'))
  if (home) {
    const value = home.published as { hero: Record<string, unknown>; blocks: { type: string; productId?: string; imageMediaId?: string }[] }
    const hero = { ...value.hero, productId: null, imageMediaId: null, specKeys: [] }
    await writeSetting('home', { ...value, hero, blocks: value.blocks.filter((b) => b.type !== 'banner' && b.type !== 'spotlight' && b.type !== 'compare') }, 'publish')
  }
  await audit(user.name, 'Removeu os dados de demonstração')
  updateTag('catalog')
  updateTag('settings')
  return { ok: true }
}

/* Usuários */

export async function createUser(raw: unknown): Promise<ActionResult<{ password: string }>> {
  const owner = await requireOwner()
  const parsed = z.object({ name: z.string().trim().min(2, 'Informe o nome.').max(80), email: z.email('E-mail inválido.'), role: z.enum(['owner', 'editor']) }).safeParse(raw)
  if (!parsed.success) return fail(firstIssue(parsed.error))
  const email = parsed.data.email.toLowerCase()
  const [exists] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email))
  if (exists) return fail('Já existe um usuário com este e-mail.')
  const password = randomBytes(9).toString('base64url')
  await db.insert(schema.users).values({ id: newId(), ...parsed.data, email, passwordHash: await hashPassword(password) })
  await audit(owner.name, `Criou o usuário ${parsed.data.name}`)
  return { ok: true, password }
}

export async function setUserActive(id: string, active: boolean): Promise<ActionResult> {
  const owner = await requireOwner()
  if (id === owner.id) return fail('Você não pode desativar a própria conta.')
  await db.update(schema.users).set({ active }).where(eq(schema.users.id, id))
  if (!active) await db.delete(schema.sessions).where(eq(schema.sessions.userId, id))
  return { ok: true }
}

export async function changePassword(current: string, next: string): Promise<ActionResult> {
  const user = await requireUser()
  if (next.length < 10) return fail('Use pelo menos 10 caracteres.')
  const [row] = await db.select().from(schema.users).where(eq(schema.users.id, user.id))
  if (!row || !(await verifyPassword(current, row.passwordHash))) return fail('A senha atual está incorreta.')
  await db.update(schema.users).set({ passwordHash: await hashPassword(next) }).where(eq(schema.users.id, user.id))
  return { ok: true }
}

export async function productOptions() {
  await requireUser()
  return db.select({ id: schema.products.id, name: schema.products.name, status: schema.products.status }).from(schema.products).orderBy(asc(schema.products.name))
}
