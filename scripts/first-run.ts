import './env'
import { db, schema } from '../src/lib/db'

// Só a primeira inicialização carrega os dados. Repetir a carga traria de volta a demonstração que a loja já removeu.
const [user] = await db.select({ id: schema.users.id }).from(schema.users).limit(1)
if (user) process.exit(0)

if (!process.env.ADMIN_EMAIL || (process.env.ADMIN_PASSWORD ?? '').length < 12) {
  console.error('Primeira inicialização: defina ADMIN_EMAIL e ADMIN_PASSWORD (12 caracteres ou mais) nas variáveis da hospedagem.')
  process.exit(1)
}

await import('./seed')
