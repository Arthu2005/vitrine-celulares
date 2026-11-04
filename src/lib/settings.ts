import { eq } from 'drizzle-orm'
import { unstable_cache } from 'next/cache'
import { db, schema } from './db'
import { STATIC_SITE } from './site-mode'
import { defaultHome, defaultStore, homeSchema, storeSchema, type HomeConfig, type StoreConfig } from './schemas'

async function read(key: string) {
  const [row] = await db.select().from(schema.settings).where(eq(schema.settings.key, key))
  return row ?? null
}

const parseStore = (value: unknown): StoreConfig => {
  const parsed = storeSchema.safeParse(value)
  return parsed.success ? parsed.data : defaultStore
}

const parseHome = (value: unknown): HomeConfig => {
  const parsed = homeSchema.safeParse(value)
  return parsed.success ? parsed.data : defaultHome
}

export const getStore = unstable_cache(async () => parseStore((await read('store'))?.published), ['store-v1'], { tags: ['settings'], revalidate: STATIC_SITE ? false : 60 })
export const getHome = unstable_cache(async () => parseHome((await read('home'))?.published), ['home-v1'], { tags: ['settings'], revalidate: STATIC_SITE ? false : 60 })

/** Versões de trabalho, usadas apenas no painel e na pré-visualização. */
export async function getStoreDraft() {
  const row = await read('store')
  return { value: parseStore(row?.draft ?? row?.published), pending: !!row?.draft }
}

export async function getHomeDraft() {
  const row = await read('home')
  return { value: parseHome(row?.draft ?? row?.published), pending: !!row?.draft }
}

export async function writeSetting(key: 'store' | 'home', value: Record<string, unknown>, mode: 'draft' | 'publish') {
  const patch = mode === 'publish' ? { published: value, draft: null } : { draft: value }
  await db.insert(schema.settings).values({ key, published: value, draft: mode === 'draft' ? value : null }).onConflictDoUpdate({ target: schema.settings.key, set: patch })
}
