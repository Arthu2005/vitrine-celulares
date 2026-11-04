import { createClient } from '@libsql/client'
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql'
import * as schema from './schema'

type DB = LibSQLDatabase<typeof schema>

const store = globalThis as unknown as { __db?: DB }

store.__db ??= drizzle(
  createClient({
    url: process.env.DATABASE_URL || 'file:./data/vitrine.db',
    authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
  }),
  { schema },
)

export const db = store.__db
export { schema }
