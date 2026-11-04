import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="shell py-24">
      <p className="label">Aparelho não encontrado</p>
      <h1 className="display mt-3 text-[40px] md:text-[72px]">Este aparelho saiu da vitrine.</h1>
      <p className="mt-4 text-silver-2">Ele pode ter sido vendido ou despublicado pela loja.</p>
      <Link href="/celulares" className="btn btn-primary mt-6">
        Ver todos os celulares
      </Link>
    </div>
  )
}
