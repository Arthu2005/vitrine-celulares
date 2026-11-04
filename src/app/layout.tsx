import type { Metadata, Viewport } from 'next'
import { Archivo, JetBrains_Mono } from 'next/font/google'
import { connection } from 'next/server'
import { ACCENTS } from '@/lib/constants'
import { getStore } from '@/lib/settings'
import { siteUrl } from '@/lib/whatsapp'
import { mediaUrl } from '@/lib/media-lookup'
import { STATIC_SITE } from '@/lib/site-mode'
import './globals.css'

const archivo = Archivo({ subsets: ['latin'], axes: ['wdth'], variable: '--font-archivo', display: 'swap' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono-face', display: 'swap' })

export const viewport: Viewport = { themeColor: '#08090A', width: 'device-width', initialScale: 1, viewportFit: 'cover' }

export async function generateMetadata(): Promise<Metadata> {
  if (!STATIC_SITE) await connection()
  const store = await getStore()
  const [favicon, og] = await Promise.all([mediaUrl(store.faviconMediaId), mediaUrl(store.ogMediaId)])
  const title = store.seoTitle || store.name
  return {
    metadataBase: new URL(new URL(siteUrl()).origin),
    title: { default: title, template: `%s | ${store.name}` },
    description: store.seoDescription || undefined,
    icons: favicon ? { icon: favicon } : undefined,
    openGraph: { siteName: store.name, locale: 'pt_BR', type: 'website', images: og ? [og] : undefined },
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Com servidor, tudo é renderizado por requisição; na versão estática, uma vez no build.
  if (!STATIC_SITE) await connection()
  const store = await getStore()
  return (
    <html lang="pt-BR" className={`${archivo.variable} ${mono.variable}`} style={{ '--accent': ACCENTS[store.accent].value } as React.CSSProperties}>
      <body>{children}</body>
    </html>
  )
}
