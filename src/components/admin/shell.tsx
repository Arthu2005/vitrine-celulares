'use client'

import { BarChart3, Camera, FolderTree, Home, ImageIcon, LayoutTemplate, LogOut, Menu, Settings, Smartphone, Users, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { logoutAction } from '@/app/admin/actions'
import { ToastProvider } from './ui'

const NAV = [
  { href: '/admin', label: 'Resumo', icon: BarChart3 },
  { href: '/admin/produtos', label: 'Produtos', icon: Smartphone },
  { href: '/admin/midia', label: 'Mídia e 3D', icon: ImageIcon },
  { href: '/admin/guia-de-captura', label: 'Guia de captura', icon: Camera },
  { href: '/admin/catalogo', label: 'Marcas e coleções', icon: FolderTree },
  { href: '/admin/pagina-inicial', label: 'Página inicial', icon: LayoutTemplate },
  { href: '/admin/configuracoes', label: 'Configurações', icon: Settings },
  { href: '/admin/usuarios', label: 'Usuários', icon: Users },
]

export function AdminShell({ user, children }: { user: { name: string; role: string }; children: React.ReactNode }) {
  const path = usePathname()
  const [open, setOpen] = useState(false)
  const active = (href: string) => (href === '/admin' ? path === href : path.startsWith(href))
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setOpen(false)
  }, [path])

  const links = (
    <>
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined} className={`flex min-h-11 items-center gap-3 rounded-md px-3 text-[15px] ${active(href) ? 'bg-ink-3 text-silver-1' : 'text-silver-2 hover:text-silver-1'}`}>
          <Icon className="size-[18px]" strokeWidth={1.5} /> {label}
        </Link>
      ))}
      <div className="mt-auto pt-4">
        <Link href="/" target="_blank" className="flex min-h-11 items-center gap-3 rounded-md px-3 text-[15px] text-silver-2 hover:text-silver-1">
          <Home className="size-[18px]" strokeWidth={1.5} /> Ver a vitrine
        </Link>
        <form action={logoutAction}>
          <button className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-[15px] text-silver-2 hover:text-silver-1">
            <LogOut className="size-[18px]" strokeWidth={1.5} /> Sair
          </button>
        </form>
        <p className="mt-2 truncate px-3 text-[13px] text-silver-3">{user.name}</p>
      </div>
    </>
  )

  return (
    <ToastProvider>
      <div className="min-h-svh md:pl-[240px]">
        <aside className="fixed inset-y-0 left-0 hidden w-[240px] flex-col border-r border-line bg-ink-1 p-3 md:flex">
          <p className="title px-3 py-3 text-[18px]">Painel</p>
          <nav aria-label="Painel" className="flex flex-1 flex-col gap-0.5">
            {links}
          </nav>
        </aside>

        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-ink-0/95 px-3 backdrop-blur-md md:hidden">
          <p className="title text-[17px]">{NAV.find((n) => active(n.href))?.label ?? 'Painel'}</p>
          <button type="button" aria-label="Abrir menu" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="grid size-11 place-items-center">
            {open ? <X className="size-6" strokeWidth={1.5} /> : <Menu className="size-6" strokeWidth={1.5} />}
          </button>
        </header>
        {open && (
          <nav aria-label="Menu do painel" className="fixed inset-x-0 bottom-0 top-14 z-30 flex flex-col overflow-y-auto bg-ink-0 p-3 pb-6 md:hidden">
            {links}
          </nav>
        )}

        <main className="mx-auto max-w-[1120px] px-3 py-5 pb-28 md:px-8 md:py-8">{children}</main>
      </div>
    </ToastProvider>
  )
}
