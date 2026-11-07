'use client'

import { AlertTriangle, CheckCircle2, CircleSlash } from 'lucide-react'
import Link from 'next/link'
import { sequenceReport, type FrameQuality } from '@/lib/capture-quality'

const VERDICT = {
  boa: { title: 'Sequência aprovada', text: 'As fotos estão boas para o giro 360°.', tone: 'text-ok border-ok/40' },
  atencao: { title: 'Dá para publicar, mas pode melhorar', text: 'Corrigir os pontos abaixo deixa o giro mais fiel à unidade.', tone: 'text-warn border-warn/40' },
  refazer: { title: 'Refaça antes de publicar', text: 'Do jeito que está, o giro vai mostrar o aparelho pior do que ele é.', tone: 'text-bad border-bad/40' },
  'sem-dados': { title: '', text: '', tone: '' },
} as const

/** Parecer do analista de captura sobre a sequência 360°, atualizado a cada quadro enviado. */
export function CaptureReport({ frames }: { frames: (FrameQuality | null | undefined)[] }) {
  const report = sequenceReport(frames)
  if (report.verdict === 'sem-dados') return null
  const v = VERDICT[report.verdict]
  return (
    <div role="status" aria-label="Análise da sequência 360°" className={`mt-3 rounded-md border p-3 ${v.tone}`}>
      <p className="text-[15px] font-medium">{v.title}</p>
      <p className="text-[13px] text-silver-3">{v.text}</p>
      <ul className="mt-2 space-y-1">
        {report.items.map((item) => (
          <li key={item.text} className="flex gap-2 text-[13px] text-silver-2">
            {item.level === 'ok' ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" strokeWidth={1.5} aria-label="OK" />
            ) : item.level === 'atencao' ? (
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" strokeWidth={1.5} aria-label="Atenção" />
            ) : (
              <CircleSlash className="mt-0.5 size-4 shrink-0 text-bad" strokeWidth={1.5} aria-label="Refazer" />
            )}
            <span>{item.text}</span>
          </li>
        ))}
      </ul>
      {report.verdict !== 'boa' && (
        <Link href="/admin/guia-de-captura#giro-360" className="mt-2 inline-block text-[13px] underline">
          Ver como fotografar
        </Link>
      )}
    </div>
  )
}
