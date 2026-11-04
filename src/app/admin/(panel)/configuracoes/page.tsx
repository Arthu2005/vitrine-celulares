import { SettingsForm } from '@/components/admin/settings-form'
import { PageHeader } from '@/components/admin/ui'
import { mediaItems } from '@/lib/media-lookup'
import { getStoreDraft } from '@/lib/settings'

export default async function SettingsPage() {
  const { value, pending } = await getStoreDraft()
  const images = await mediaItems([value.logoMediaId, value.faviconMediaId, value.ogMediaId])
  return (
    <>
      <PageHeader title="Configurações" description="Dados da loja exibidos na vitrine. Nada aqui é inventado: o que ficar vazio simplesmente não aparece." />
      <SettingsForm initial={value} pending={pending} imageUrls={Object.fromEntries([...images].map(([id, m]) => [id, m.url]))} />
    </>
  )
}
