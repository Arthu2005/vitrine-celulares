import type { MediaRow } from '@/app/admin/types'

/** Envia um arquivo com progresso. Usa XHR porque fetch não informa o progresso do envio. */
export function uploadFile(file: File, opts: { replaceId?: string; onProgress?: (percent: number) => void } = {}) {
  return new Promise<MediaRow>((resolve, reject) => {
    const form = new FormData()
    form.append('file', file)
    if (opts.replaceId) form.append('replaceId', opts.replaceId)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/admin/media')
    xhr.upload.onprogress = (e) => e.lengthComputable && opts.onProgress?.(Math.round((e.loaded / e.total) * 100))
    xhr.onerror = () => reject(new Error('Falha de conexão. Verifique a internet e tente de novo.'))
    xhr.onload = () => {
      let body: { error?: string } & Partial<MediaRow> = {}
      try {
        body = JSON.parse(xhr.responseText)
      } catch {
        // resposta sem JSON cai na mensagem padrão
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body as MediaRow)
      else reject(new Error(body.error ?? 'Falha ao enviar o arquivo.'))
    }
    xhr.send(form)
  })
}
