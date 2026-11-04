import type { Metadata } from 'next'
import { CatalogRoute } from '@/components/site/catalog-route'
import { getCatalog, phones } from '@/lib/catalog'

export const metadata: Metadata = { title: 'Todos os celulares', description: 'Catálogo completo de celulares: filtre por marca, preço, armazenamento, tela, bateria e câmera.' }

export default async function CatalogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const catalog = await getCatalog()
  return <CatalogRoute eyebrow="Catálogo" title="Todos os celulares" base={phones(catalog)} searchParams={searchParams} />
}
