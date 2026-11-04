import './env'
import { mkdirSync } from 'node:fs'
import { migrate } from 'drizzle-orm/libsql/migrator'

mkdirSync('data', { recursive: true })
const { db } = await import('../src/lib/db')
await migrate(db, { migrationsFolder: './drizzle' })
console.log('Banco de dados atualizado.')
process.exit(0)
