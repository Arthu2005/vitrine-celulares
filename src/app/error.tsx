'use client'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="shell py-24">
      <p className="label">Algo deu errado</p>
      <h1 className="display mt-3 text-[36px] md:text-[60px]">Não foi possível carregar esta página.</h1>
      <button type="button" onClick={reset} className="btn btn-primary mt-6">
        Tentar de novo
      </button>
    </div>
  )
}
