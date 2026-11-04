'use client'

import { AlertTriangle, CheckCircle2, X } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

type Toast = { id: number; tone: 'ok' | 'bad'; text: string; details?: string[] }
const ToastCtx = createContext<(tone: Toast['tone'], text: string, details?: string[]) => void>(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)
  const push = useCallback((tone: Toast['tone'], text: string, details?: string[]) => {
    const id = ++counter.current
    setToasts((list) => [...list, { id, tone, text, details }])
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), details ? 9000 : tone === 'bad' ? 6000 : 3000)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div aria-live="polite" className="fixed inset-x-3 bottom-20 z-[70] flex flex-col items-center gap-2 md:bottom-6">
        {toasts.map((t) => (
          <div key={t.id} role="status" className="flex w-full max-w-[420px] gap-2 rounded-md border border-line bg-ink-3 px-3 py-2.5 text-[14px] shadow-lg">
            {t.tone === 'ok' ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0 text-bad" />}
            <div className="min-w-0">
              <p>{t.text}</p>
              {t.details?.map((d) => (
                <p key={d} className="mt-0.5 text-silver-2">
                  {d}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function Field({ label, hint, children, className = '' }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="mb-1 block text-[14px] text-silver-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[13px] text-silver-3">{hint}</span>}
    </label>
  )
}

export function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[15px]">{label}</p>
        {hint && <p className="text-[13px] text-silver-3">{hint}</p>}
      </div>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-ink-3'}`}>
        <span className={`absolute top-1 size-5 rounded-full bg-silver-1 transition-all ${checked ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  )
}

export function Section({ title, description, children, id }: { title: string; description?: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="card scroll-mt-28 p-4 md:p-6">
      <h2 className="text-[18px] font-[560]">{title}</h2>
      {description && <p className="mt-0.5 text-[14px] text-silver-3">{description}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  )
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="title text-[28px] md:text-[34px]">{title}</h1>
        {description && <p className="mt-1 max-w-[62ch] text-silver-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  )
}

export function ConfirmDialog({ open, title, text, confirmLabel = 'Excluir', onConfirm, onClose }: { open: boolean; title: string; text?: string; confirmLabel?: string; onConfirm: () => void; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[80] grid place-items-end bg-black/70 p-3 sm:place-items-center" onClick={onClose}>
      <div role="alertdialog" aria-modal="true" aria-label={title} className="card w-full max-w-[420px] p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-[18px] font-[560]">{title}</h2>
        {text && <p className="mt-1 text-silver-2">{text}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancelar
          </button>
          <button type="button" onClick={onConfirm} className="btn bg-bad text-ink-0">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[75] flex items-end justify-center bg-black/70 sm:items-center sm:p-6" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="flex max-h-[92svh] w-full max-w-[860px] flex-col rounded-t-lg border border-line bg-ink-1 sm:rounded-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
          <h2 className="truncate font-[560]">{title}</h2>
          <button type="button" aria-label="Fechar" onClick={onClose} className="grid size-10 place-items-center text-silver-2">
            <X className="size-5" strokeWidth={1.5} />
          </button>
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  )
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-line p-6 text-center">
      <p className="font-[560]">{title}</p>
      {text && <p className="mt-1 text-[14px] text-silver-3">{text}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

/** Aviso ao sair com alterações não salvas: cobre fechar a aba e cliques em links internos. */
export function useDirtyGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return
    const before = (e: BeforeUnloadEvent) => e.preventDefault()
    const click = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest('a')
      if (!link || link.target === '_blank' || !link.href.startsWith(window.location.origin)) return
      if (!window.confirm('Há alterações não salvas. Sair mesmo assim?')) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('beforeunload', before)
    document.addEventListener('click', click, true)
    return () => {
      window.removeEventListener('beforeunload', before)
      document.removeEventListener('click', click, true)
    }
  }, [dirty])
}
