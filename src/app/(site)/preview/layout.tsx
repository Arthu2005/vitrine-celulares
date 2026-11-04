import { requireUser } from '@/lib/auth'

export default async function PreviewLayout({ children }: { children: React.ReactNode }) {
  await requireUser()
  return (
    <>
      <p className="sticky top-16 z-30 bg-accent px-4 py-1.5 text-center text-[13px] font-[560] text-on-accent">Pré-visualização: só você vê esta versão. Nada foi publicado.</p>
      {children}
    </>
  )
}
