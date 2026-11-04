import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="shell py-24">
      <p className="label">Página não encontrada</p>
      <h1 className="display mt-3 text-[40px] md:text-[72px]">Nada neste endereço.</h1>
      <Link href="/" className="btn btn-primary mt-6">
        Voltar ao início
      </Link>
    </div>
  )
}
