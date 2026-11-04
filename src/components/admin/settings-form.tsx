'use client'

import { Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { saveStore } from '@/app/admin/actions'
import { ACCENTS, type AccentKey } from '@/lib/constants'
import type { StoreConfig } from '@/lib/schemas'
import { DEFAULT_TEMPLATE } from '@/lib/whatsapp'
import { MediaPicker } from './media-picker'
import { Field, Section, Toggle, useDirtyGuard, useToast } from './ui'

type ImageKey = 'logoMediaId' | 'faviconMediaId' | 'ogMediaId'

function ImageField({ label, id, url, onPick, onClear }: { label: string; id: string | null; url?: string; onPick: () => void; onClear: () => void }) {
  return (
    <div>
      <p className="mb-1 text-[14px] text-silver-2">{label}</p>
      <div className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {id && url && <img src={url} alt="" className="h-12 w-12 rounded-md bg-ink-2 object-contain" />}
        <button type="button" onClick={onPick} className="btn btn-secondary !min-h-10 !text-[14px]">
          Escolher
        </button>
        {id && (
          <button type="button" onClick={onClear} className="btn btn-quiet !min-h-10 !text-[14px]">
            Retirar
          </button>
        )}
      </div>
    </div>
  )
}

export function SettingsForm({ initial, pending: hasDraft, imageUrls }: { initial: StoreConfig; pending: boolean; imageUrls: Record<string, string> }) {
  const toast = useToast()
  const router = useRouter()
  const [form, setForm] = useState(initial)
  const [dirty, setDirty] = useState(false)
  const [pending, start] = useTransition()
  const [picker, setPicker] = useState<ImageKey | null>(null)
  const [images, setImages] = useState(imageUrls)
  useDirtyGuard(dirty)

  const set = <K extends keyof StoreConfig>(key: K, value: StoreConfig[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setDirty(true)
  }
  const text = (key: keyof StoreConfig, label: string, hint?: string, type = 'text') => (
    <Field label={label} hint={hint}>
      <input type={type} value={form[key] as string} onChange={(e) => set(key, e.target.value as never)} className="field" />
    </Field>
  )
  const area = (key: keyof StoreConfig, label: string, rows = 3, hint?: string) => (
    <Field label={label} hint={hint}>
      <textarea rows={rows} value={form[key] as string} onChange={(e) => set(key, e.target.value as never)} className="field" />
    </Field>
  )

  const save = (mode: 'draft' | 'publish') =>
    start(async () => {
      const res = await saveStore(form, mode)
      if (!res.ok) return toast('bad', res.error)
      setDirty(false)
      toast('ok', mode === 'publish' ? 'Configurações publicadas.' : 'Rascunho salvo.')
      router.refresh()
    })

  return (
    <div className="space-y-4 pb-24">
      {hasDraft && <p className="rounded-md border border-warn/40 p-3 text-[14px]">Há um rascunho ainda não publicado. A vitrine mostra a versão anterior.</p>}

      <Section title="Identidade">
        {text('name', 'Nome da loja')}
        <div className="grid gap-4 sm:grid-cols-3">
          <ImageField label="Logotipo" id={form.logoMediaId} url={form.logoMediaId ? images[form.logoMediaId] : undefined} onPick={() => setPicker('logoMediaId')} onClear={() => set('logoMediaId', null)} />
          <ImageField label="Favicon" id={form.faviconMediaId} url={form.faviconMediaId ? images[form.faviconMediaId] : undefined} onPick={() => setPicker('faviconMediaId')} onClear={() => set('faviconMediaId', null)} />
          <ImageField label="Imagem de compartilhamento" id={form.ogMediaId} url={form.ogMediaId ? images[form.ogMediaId] : undefined} onPick={() => setPicker('ogMediaId')} onClear={() => set('ogMediaId', null)} />
        </div>
        <div>
          <p className="mb-2 text-[14px] text-silver-2">Cor de destaque</p>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Cor de destaque">
            {(Object.keys(ACCENTS) as AccentKey[]).map((key) => (
              <button key={key} type="button" role="radio" aria-checked={form.accent === key} onClick={() => set('accent', key)} className="chip">
                <span className="size-4 rounded-full" style={{ background: ACCENTS[key].value }} /> {ACCENTS[key].label}
              </button>
            ))}
          </div>
        </div>
        {area('about', 'Sobre a loja')}
        {text('notice', 'Aviso no topo do site', 'Exemplo: horário especial de feriado. Deixe vazio para ocultar.')}
        <Toggle label="Aviso de ambiente de demonstração" hint="Mantenha ligado enquanto houver dados fictícios." checked={form.demoNotice} onChange={(v) => set('demoNotice', v)} />
      </Section>

      <Section title="Contato">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="WhatsApp" hint="Com DDI e DDD. Exemplo: 55 11 91234-5678">
            <input type="tel" inputMode="tel" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} className="field" />
          </Field>
          {text('phone', 'Telefone', undefined, 'tel')}
          {text('email', 'E-mail', undefined, 'email')}
        </div>
        <Field label="Mensagem automática do WhatsApp" hint="Use {produto} e {link}. Se ficar vazio, usamos a mensagem padrão.">
          <textarea rows={3} value={form.whatsappTemplate} placeholder={DEFAULT_TEMPLATE} onChange={(e) => set('whatsappTemplate', e.target.value)} className="field" />
        </Field>
        <div>
          <p className="mb-2 text-[14px] text-silver-2">Redes sociais</p>
          {form.socials.map((s, i) => (
            <div key={i} className="mb-2 flex gap-2">
              <input aria-label="Nome da rede" placeholder="Instagram" value={s.label} onChange={(e) => set('socials', form.socials.map((x, n) => (n === i ? { ...x, label: e.target.value } : x)))} className="field !w-[40%]" />
              <input aria-label="Endereço da rede" type="url" placeholder="https://" value={s.url} onChange={(e) => set('socials', form.socials.map((x, n) => (n === i ? { ...x, url: e.target.value } : x)))} className="field" />
              <button type="button" aria-label="Remover rede" onClick={() => set('socials', form.socials.filter((_, n) => n !== i))} className="grid size-11 shrink-0 place-items-center text-silver-2">
                <X className="size-4" strokeWidth={1.5} />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => set('socials', [...form.socials, { label: '', url: '' }])} className="btn btn-secondary !min-h-10 !text-[14px]">
            <Plus className="size-4" strokeWidth={1.5} /> Adicionar rede
          </button>
        </div>
      </Section>

      <Section title="Endereço e horários">
        {text('address', 'Endereço')}
        {text('mapQuery', 'Localização no mapa', 'Endereço completo ou nome da loja no Google Maps.')}
        <div>
          <p className="mb-2 text-[14px] text-silver-2">Horários</p>
          {form.hours.map((h, i) => (
            <div key={i} className="mb-2 flex gap-2">
              <input aria-label="Dias" placeholder="Segunda a sexta" value={h.label} onChange={(e) => set('hours', form.hours.map((x, n) => (n === i ? { ...x, label: e.target.value } : x)))} className="field" />
              <input aria-label="Horário" placeholder="9h às 18h" value={h.value} onChange={(e) => set('hours', form.hours.map((x, n) => (n === i ? { ...x, value: e.target.value } : x)))} className="field" />
              <button type="button" aria-label="Remover horário" onClick={() => set('hours', form.hours.filter((_, n) => n !== i))} className="grid size-11 shrink-0 place-items-center text-silver-2">
                <X className="size-4" strokeWidth={1.5} />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => set('hours', [...form.hours, { label: '', value: '' }])} className="btn btn-secondary !min-h-10 !text-[14px]">
            <Plus className="size-4" strokeWidth={1.5} /> Adicionar horário
          </button>
        </div>
      </Section>

      <Section title="Condições e políticas">
        {area('commercialTerms', 'Condições comerciais autorizadas')}
        {area('warrantyInfo', 'Informações de garantia')}
        {area('usedPolicy', 'Política de seminovos')}
        {area('pickupInfo', 'Retirada e atendimento presencial')}
        {area('privacyPolicy', 'Política de privacidade', 8, 'Revise com um profissional antes de publicar.')}
        {area('terms', 'Termos de uso', 5)}
      </Section>

      <Section title="Busca e compartilhamento">
        {text('seoTitle', 'Título do site')}
        {area('seoDescription', 'Descrição do site', 2)}
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink-1/95 px-3 py-2 pb-[max(8px,env(safe-area-inset-bottom))] backdrop-blur-md md:left-[240px] md:px-8">
        <div className="mx-auto flex max-w-[1056px] justify-end gap-2">
          <button type="button" disabled={pending} onClick={() => save('draft')} className="btn btn-secondary flex-1 sm:flex-none">
            Salvar rascunho
          </button>
          <button type="button" disabled={pending} onClick={() => save('publish')} className="btn btn-primary flex-1 sm:flex-none">
            Publicar
          </button>
        </div>
      </div>

      {picker && (
        <MediaPicker
          kind="image"
          onClose={() => setPicker(null)}
          onPick={([row]) => {
            setImages((m) => ({ ...m, [row.id]: row.url }))
            set(picker, row.id)
            setPicker(null)
          }}
        />
      )}
    </div>
  )
}
