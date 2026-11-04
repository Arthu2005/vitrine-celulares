'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { track } from '@/lib/client/track'
import { recommend, type Answers } from '@/lib/finder'
import type { Product } from '@/lib/types'
import { waLink } from '@/lib/whatsapp'
import { WhatsAppIcon } from './icons'
import { ProductTile } from './product-tile'
import { useShelf } from './shelf'
import { useStorePublic } from './store-context'

type Option = { label: string; value: unknown }
type Step = { key: keyof Answers; title: string; options: Option[] }

const empty: Answers = { budget: null, priority: null, storage: null, brand: null, use: null, used: true }

export function Finder({ products, brands }: { products: Product[]; brands: { name: string; slug: string }[] }) {
  const store = useStorePublic()
  const { setCompare } = useShelf()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Answers>(empty)

  const steps: Step[] = [
    { key: 'budget', title: 'Qual é o seu orçamento?', options: [{ label: 'Até R$ 2.000', value: 2000 }, { label: 'Até R$ 3.500', value: 3500 }, { label: 'Até R$ 5.000', value: 5000 }, { label: 'Até R$ 8.000', value: 8000 }, { label: 'Sem limite definido', value: null }] },
    { key: 'priority', title: 'O que você prioriza?', options: [{ label: 'Câmera', value: 'camera' }, { label: 'Desempenho', value: 'desempenho' }, { label: 'Bateria', value: 'bateria' }, { label: 'Custo-benefício', value: 'custo' }] },
    { key: 'storage', title: 'Quanto armazenamento você precisa?', options: [{ label: '128 GB ou mais', value: 128 }, { label: '256 GB ou mais', value: 256 }, { label: '512 GB ou mais', value: 512 }, { label: 'Não sei', value: null }] },
    { key: 'brand', title: 'Prefere alguma marca?', options: [...brands.map((b) => ({ label: b.name, value: b.slug })), { label: 'Tanto faz', value: null }] },
    { key: 'use', title: 'Como você vai usar o aparelho?', options: [{ label: 'Jogos', value: 'jogos' }, { label: 'Fotografia', value: 'fotografia' }, { label: 'Trabalho', value: 'trabalho' }, { label: 'Uso cotidiano', value: 'cotidiano' }] },
    { key: 'used', title: 'Aceita aparelhos seminovos?', options: [{ label: 'Sim', value: true }, { label: 'Só novos', value: false }] },
  ]

  const done = step >= steps.length
  const results = useMemo(() => (done ? recommend(products, answers) : []), [done, products, answers])
  const current = steps[step]

  const answer = (value: unknown) => {
    const next = { ...answers, [current.key]: value }
    setAnswers(next)
    setStep(step + 1)
    if (step + 1 >= steps.length) track('finder_use', { label: [next.priority, next.use].filter(Boolean).join(' / ') })
  }

  if (done) {
    return (
      <div className="shell pt-8 md:pt-12">
        <p className="label mb-3">Resultado</p>
        <h1 className="display text-[38px] md:text-[64px]">{results.length ? 'Estes combinam com você.' : 'Nada atende a tudo isso agora.'}</h1>
        {results.length > 0 ? (
          <>
            <p className="mt-3 max-w-[56ch] text-silver-2">Recomendação feita apenas com os dados cadastrados pela loja.</p>
            <ul className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((r) => (
                <li key={r.product.id} className="min-w-0">
                  <ProductTile product={r.product} />
                  {r.reasons.length > 0 && (
                    <ul className="mt-3 space-y-1 border-t border-line pt-3 text-[14px] text-silver-2">
                      {r.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  )}
                  {r.priceUnknown && <p className="mt-2 text-[13px] text-silver-3">Preço sob consulta: confirme se cabe no orçamento.</p>}
                </li>
              ))}
            </ul>
            <div className="mt-10 flex flex-col gap-2 sm:flex-row">
              {results.length > 1 && (
                <Link href={`/comparar?m=${results.map((r) => r.product.slug).join(',')}`} onClick={() => setCompare(results.map((r) => r.product.slug))} className="btn btn-primary">
                  Comparar estes aparelhos
                </Link>
              )}
              <button type="button" onClick={() => { setStep(0); setAnswers(empty) }} className="btn btn-secondary">
                Refazer
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-3 max-w-[56ch] text-silver-2">Tente ampliar o orçamento ou aceitar outras marcas. A loja também pode ajudar diretamente.</p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => { setStep(0); setAnswers(empty) }} className="btn btn-primary">
                Refazer
              </button>
              <a href={waLink(store.whatsapp, 'Olá! Estou procurando um celular e gostaria de ajuda para escolher.')} target="_blank" rel="noreferrer" className="btn btn-secondary">
                <WhatsAppIcon /> Falar com a loja
              </a>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="shell flex min-h-[70svh] flex-col justify-center py-10">
      <div className="mx-auto w-full max-w-[760px]">
        <div className="mb-8 flex items-center gap-3">
          {step > 0 && (
            <button type="button" aria-label="Voltar" onClick={() => setStep(step - 1)} className="grid size-10 place-items-center rounded-full border border-line text-silver-2">
              <ArrowLeft className="size-4" strokeWidth={1.5} />
            </button>
          )}
          <span className="font-mono text-[12px] text-silver-3">
            {step + 1} / {steps.length}
          </span>
          <div className="h-px flex-1 bg-ink-3">
            <div className="h-px bg-accent transition-all duration-500" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
          </div>
        </div>
        <h1 className="display text-[36px] md:text-[60px]">{current.title}</h1>
        <div className="mt-8 grid gap-2 sm:grid-cols-2">
          {current.options.map((o) => (
            <button key={o.label} type="button" onClick={() => answer(o.value)} className="flex min-h-16 items-center rounded-md border border-line px-5 text-left text-[17px] transition-colors hover:border-accent">
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
