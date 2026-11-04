import { MediaLibrary } from '@/components/admin/media-library'
import { PageHeader } from '@/components/admin/ui'
import { listMedia } from '../../actions'

export default async function MediaPage() {
  const rows = await listMedia()
  return (
    <>
      <PageHeader title="Mídia e modelos 3D" description="Imagens são otimizadas automaticamente. Limites: imagem 15 MB, vídeo 100 MB, modelo 3D 30 MB (recomendado até 8 MB)." />
      <MediaLibrary initial={rows} />
    </>
  )
}
