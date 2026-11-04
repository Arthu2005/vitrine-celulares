import { asc } from 'drizzle-orm'
import { UsersManager } from '@/components/admin/users-manager'
import { PageHeader } from '@/components/admin/ui'
import { requireUser } from '@/lib/auth'
import { db, schema } from '@/lib/db'

export default async function UsersPage() {
  const me = await requireUser()
  const users = me.role === 'owner' ? await db.select({ id: schema.users.id, name: schema.users.name, email: schema.users.email, role: schema.users.role, active: schema.users.active }).from(schema.users).orderBy(asc(schema.users.createdAt)) : []
  return (
    <>
      <PageHeader title="Usuários" description="Proprietários gerenciam usuários e podem remover dados de demonstração. Editores cuidam do catálogo." />
      <UsersManager users={users} me={{ id: me.id, role: me.role }} />
    </>
  )
}
