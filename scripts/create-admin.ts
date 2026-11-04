import './env'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db, schema } from '../src/lib/db'
import { hashPassword } from '../src/lib/auth'

const [email, password, name = 'Proprietário'] = process.argv.slice(2)
if (!email || !password || password.length < 10) {
  console.error('Uso: npm run admin:create -- email@loja.com "senha com 10+ caracteres" "Nome"')
  process.exit(1)
}
const address = email.toLowerCase()
const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, address))
const passwordHash = await hashPassword(password)
if (existing) {
  await db.update(schema.users).set({ passwordHash, active: true }).where(eq(schema.users.id, existing.id))
  console.log(`Senha de ${address} atualizada.`)
} else {
  await db.insert(schema.users).values({ id: randomUUID(), email: address, name, role: 'owner', passwordHash })
  console.log(`Proprietário ${address} criado.`)
}
process.exit(0)
