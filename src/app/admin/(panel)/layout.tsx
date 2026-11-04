import type { Metadata } from 'next'
import { AdminShell } from '@/components/admin/shell'
import { requireUser } from '@/lib/auth'

export const metadata: Metadata = { title: 'Painel', robots: { index: false, follow: false } }

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  return <AdminShell user={{ name: user.name, role: user.role }}>{children}</AdminShell>
}
