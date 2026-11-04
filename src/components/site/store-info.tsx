import type { StoreConfig } from '@/lib/schemas'
import { WhatsAppIcon } from './icons'
import { waLink } from '@/lib/whatsapp'

export const hasStoreInfo = (s: StoreConfig) => !!(s.address || s.hours.length || s.phone || s.mapQuery)

export function StoreInfo({ store, compact }: { store: StoreConfig; compact?: boolean }) {
  const texts = compact
    ? []
    : [
        ['Condições comerciais', store.commercialTerms],
        ['Garantia', store.warrantyInfo],
        ['Política de seminovos', store.usedPolicy],
        ['Retirada e atendimento', store.pickupInfo],
      ].filter(([, v]) => v)
  return (
    <>
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-6">
          {store.address && (
            <div>
              <p className="label mb-1">Endereço</p>
              <p className="text-[18px]">{store.address}</p>
            </div>
          )}
          {store.hours.length > 0 && (
            <div>
              <p className="label mb-1">Horário de atendimento</p>
              <dl>
                {store.hours.map((h) => (
                  <div key={h.label} className="flex justify-between gap-4 border-b border-line py-2">
                    <dt className="text-silver-2">{h.label}</dt>
                    <dd>{h.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          {store.phone && (
            <div>
              <p className="label mb-1">Telefone</p>
              <a href={`tel:${store.phone.replace(/[^\d+]/g, '')}`} className="text-[18px] underline underline-offset-4">
                {store.phone}
              </a>
            </div>
          )}
          <a href={waLink(store.whatsapp, `Olá! Vim pelo site da ${store.name}.`)} target="_blank" rel="noreferrer" className="btn btn-primary">
            <WhatsAppIcon /> Falar com a loja
          </a>
        </div>
        {store.mapQuery && (
          <iframe
            title="Localização da loja no mapa"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.google.com/maps?q=${encodeURIComponent(store.mapQuery)}&output=embed`}
            className="h-[320px] w-full rounded-lg border border-line grayscale"
          />
        )}
      </div>
      {texts.length > 0 && (
        <div className="mt-14 grid gap-10 md:grid-cols-2">
          {texts.map(([title, text]) => (
            <section key={title}>
              <h2 className="title text-[24px]">{title}</h2>
              <p className="mt-2 whitespace-pre-line text-silver-2">{text}</p>
            </section>
          ))}
        </div>
      )}
    </>
  )
}
