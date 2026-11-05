import './env'
import { randomBytes, randomUUID } from 'node:crypto'
import { readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { db, schema } from '../src/lib/db'
import { hashPassword } from '../src/lib/auth'
import { ingest } from '../src/lib/media-ingest'
import { writeProduct } from '../src/lib/product-store'
import { defaultStore, homeSchema, productInputSchema, slugify, storeSchema } from '../src/lib/schemas'

/**
 * Carga de demonstração. Todos os aparelhos, marcas, preços e especificações abaixo são FICTÍCIOS
 * e ficam marcados como demonstração, para que a loja possa removê-los com um clique no painel.
 */

const reset = process.argv.includes('--reset')
const noDemo = process.argv.includes('--sem-demo')

if (reset) {
  for (const table of [schema.products, schema.productVariants, schema.productMedia, schema.accessoryLinks, schema.collectionProducts, schema.media, schema.mediaChunks, schema.brands, schema.categories, schema.collections, schema.settings, schema.events, schema.auditLog]) {
    await db.delete(table)
  }
  rmSync(process.env.STORAGE_LOCAL_DIR || './storage', { recursive: true, force: true })
}

const [firstUser] = await db.select().from(schema.users).limit(1)
if (!firstUser) {
  const email = (process.env.ADMIN_EMAIL || 'admin@loja.test').toLowerCase()
  const generated = !process.env.ADMIN_PASSWORD
  const password = process.env.ADMIN_PASSWORD || randomBytes(12).toString('base64url')
  await db.insert(schema.users).values({ id: randomUUID(), email, name: 'Proprietário', role: 'owner', passwordHash: await hashPassword(password) })
  console.log(`Administrador criado: ${email}`)
  if (generated) console.log(`Senha gerada (anote agora, ela não será exibida de novo): ${password}`)
}

const existing = await db.select({ id: schema.products.id }).from(schema.products).limit(1)
if (existing.length && !reset) {
  console.log('O banco já tem produtos; carga de demonstração ignorada. Use --reset para recomeçar.')
  process.exit(0)
}

if (noDemo) {
  await db.insert(schema.categories).values([
    { id: randomUUID(), name: 'Celulares', slug: 'celulares', sortOrder: 0, showInNav: false },
    { id: randomUUID(), name: 'Acessórios', slug: 'acessorios', sortOrder: 1, isAccessory: true },
  ]).onConflictDoNothing()
  await db.insert(schema.settings).values({ key: 'store', published: storeSchema.parse({ name: 'Sua Loja' }) }).onConflictDoNothing()
  await db.insert(schema.settings).values({ key: 'home', published: homeSchema.parse({ hero: { title: 'Tecnologia que você sente antes de comprar.', primaryLabel: 'Explorar celulares', secondaryLabel: 'Encontrar meu próximo celular' }, blocks: [] }) }).onConflictDoNothing()
  console.log('Banco preparado sem dados de demonstração.')
  process.exit(0)
}

const image = async (file: string, alt: string) => (await ingest(readFileSync(join('demo-assets/images', `${file}.webp`)), `demo-${file}.webp`, { isDemo: true, alt })).id
const model = async (id: string) => (await ingest(readFileSync(join('demo-assets/models', `demo-${id}.glb`)), `demo-${id}.glb`, { isDemo: true })).id

const brandIds: Record<string, string> = {}
for (const [i, name] of ['Aurora', 'Vértice', 'Trama'].entries()) {
  brandIds[name] = randomUUID()
  await db.insert(schema.brands).values({ id: brandIds[name], name: `${name} (demo)`, slug: slugify(name), sortOrder: i, isDemo: true })
}

const catPhones = randomUUID()
const catAcc = randomUUID()
await db.insert(schema.categories).values([
  { id: catPhones, name: 'Celulares', slug: 'celulares', sortOrder: 0, showInNav: false },
  { id: catAcc, name: 'Acessórios', slug: 'acessorios', sortOrder: 1, isAccessory: true },
])

const colPhoto = randomUUID()
const colGame = randomUUID()
await db.insert(schema.collections).values([
  { id: colPhoto, name: 'Para quem fotografa', slug: 'para-quem-fotografa', description: 'Coleção de demonstração, montada pelo painel.', sortOrder: 0, isDemo: true },
  { id: colGame, name: 'Para quem joga', slug: 'para-quem-joga', description: 'Coleção de demonstração, montada pelo painel.', sortOrder: 1, isDemo: true },
])

const specsBase = { fabricante: 'Fictício (demonstração)', ano: '2026', rede: '5G', wifi: 'Wi-Fi 6E', bluetooth: '5.3', nfc: 'Sim', entrada: 'USB-C', biometria: 'Leitor sob a tela', embalagem: 'Aparelho e cabo USB-C' }

const hotspots = (cameraX: number, cameraY: number, height: number, depth: number) => [
  { id: 'cameras', label: 'Conjunto de câmeras', text: 'Ponto de exemplo. No painel, cada ponto é posicionado com um clique sobre o modelo.', position: [cameraX, cameraY, -depth / 2 - 0.0024] as [number, number, number], normal: [0, 0, -1] as [number, number, number] },
  { id: 'tela', label: 'Tela', text: 'Ponto de exemplo: descreva aqui o que diferencia a tela deste aparelho.', position: [0, 0.01, depth / 2 + 0.0004] as [number, number, number], normal: [0, 0, 1] as [number, number, number] },
  { id: 'conector', label: 'Conector USB-C', text: 'Ponto de exemplo: conector e alto-falantes ficam na base.', position: [0, -height / 2, 0] as [number, number, number], normal: [0, -1, 0] as [number, number, number] },
]

type Seed = Partial<Parameters<typeof productInputSchema.parse>[0]> & Record<string, unknown>

const ids: Record<string, string> = {}
async function add(key: string, data: Seed, publishedDaysAgo: number) {
  const id = randomUUID()
  ids[key] = id
  const input = productInputSchema.parse({ categoryId: catPhones, warranty: 'Demonstração: informe a garantia real no painel', slug: slugify(String(data.name)), ...data })
  await writeProduct(id, input, { status: 'published', isDemo: true, publishedAt: Date.now() - publishedDaysAgo * 86_400_000 })
}

const v = (color: string, colorHex: string, storage: string, ram: string, price: number, extra: object = {}) => ({ color, colorHex, storage, ram, price: price * 100, ...extra })

const auroraModel = await model('aurora')
const verticeModel = await model('vertice')
const tramaModel = await model('trama')

const gallery = async (id: string, label: string, colors: string[] = []) => {
  const out = []
  for (const shot of ['frente', 'costas', 'angulo', 'lateral']) out.push({ mediaId: await image(`${id}-${shot}`, `${label}, vista ${shot}`), role: 'gallery' as const, color: colors[0] ?? '' })
  return out
}
const colorShots = async (id: string, label: string, name: string, color: string) => [
  { mediaId: await image(`${id}-frente-${name}`, `${label} na cor ${color}, frente`), role: 'gallery' as const, color },
  { mediaId: await image(`${id}-angulo-${name}`, `${label} na cor ${color}, costas`), role: 'gallery' as const, color },
]

await add('auroraPro', {
  name: 'Aurora X1 Pro',
  brandId: brandIds.Aurora,
  model: 'DEMO-AX1P',
  shortDescription: 'Aparelho fictício usado para demonstrar a vitrine. Tela grande, duas câmeras e modelo 3D explorável.',
  description: 'Este é um aparelho de demonstração: não existe no mercado e todas as informações são fictícias. Ele serve para mostrar como a página de produto se comporta com modelo 3D, variantes, pontos interativos e ficha técnica completa.\n\nSubstitua pelos seus aparelhos no painel e remova os dados de demonstração com um clique.',
  highlights: ['Modelo 3D com pontos interativos', 'Três cores com troca em tempo real', 'Ficha técnica completa de exemplo'],
  specs: { ...specsBase, codigo: 'DEMO-AX1P', sistema: 'Fictício OS 14', processador: 'Demo Core 9', gpu: 'Demo Graphics', ram: '12', armazenamento: '512', telaTamanho: '6,8', telaTipo: 'AMOLED', resolucao: '2868 x 1320', taxa: '120', painel: 'LTPO', camPrincipal: '200', camQuantidade: '2', camAdicionais: 'Teleobjetiva de 50 MP', camFrontal: '32', camRecursos: 'Vídeo 4K', bateria: '5200', cargaFio: '65', cargaSemFio: '15 W', resistencia: 'IP68', dimensoes: '162 x 76 x 8,2 mm', peso: '214' },
  goodFor: ['camera', 'desempenho', 'fotografia', 'trabalho'],
  isNew: true,
  isFeatured: true,
  variants: [
    v('Grafite', '#2a2c2f', '256 GB', '12 GB', 6999),
    v('Grafite', '#2a2c2f', '512 GB', '12 GB', 7799),
    v('Prata', '#c9ccd1', '256 GB', '12 GB', 6999),
    v('Prata', '#c9ccd1', '512 GB', '12 GB', 7799, { availability: 'ultimas', stock: 2 }),
    v('Bronze', '#6d5238', '256 GB', '12 GB', 7199, { availability: 'indisponivel', stock: 0 }),
  ],
  media: [...(await gallery('aurora', 'Aurora X1 Pro', ['Grafite'])), ...(await colorShots('aurora', 'Aurora X1 Pro', 'prata', 'Prata')), ...(await colorShots('aurora', 'Aurora X1 Pro', 'bronze', 'Bronze'))],
  modelMediaId: auroraModel,
  modelTintMaterial: 'Corpo,Modulo',
  modelIllustrative: true,
  hotspots: hotspots(-0.019, 0.0594, 0.162, 0.0082),
}, 1)

await add('vertice', {
  name: 'Vértice 8',
  brandId: brandIds['Vértice'],
  model: 'DEMO-V8',
  shortDescription: 'Aparelho fictício compacto, para demonstrar filtros e comparação.',
  description: 'Aparelho de demonstração. Não existe no mercado e todas as informações são fictícias.',
  highlights: ['Tela compacta', 'Três câmeras traseiras', 'Carregamento rápido'],
  specs: { ...specsBase, codigo: 'DEMO-V8', sistema: 'Fictício OS 14', processador: 'Demo Core 8', ram: '8', armazenamento: '256', telaTamanho: '6,1', telaTipo: 'OLED', resolucao: '2400 x 1080', taxa: '120', camPrincipal: '50', camQuantidade: '3', camAdicionais: 'Ultra-angular de 12 MP e teleobjetiva de 10 MP', camFrontal: '12', bateria: '4400', cargaFio: '45', cargaSemFio: 'Não', resistencia: 'IP67', dimensoes: '152 x 72 x 7,6 mm', peso: '172' },
  goodFor: ['camera', 'cotidiano', 'trabalho'],
  isFeatured: true,
  variants: [
    v('Azul-petróleo', '#1c2a33', '128 GB', '8 GB', 4299),
    v('Azul-petróleo', '#1c2a33', '256 GB', '8 GB', 4799, { promoPrice: 439900 }),
    v('Gelo', '#b9d3df', '256 GB', '8 GB', 4799, { promoPrice: 439900 }),
    v('Grafite', '#26282b', '128 GB', '8 GB', 4299),
  ],
  media: [...(await gallery('vertice', 'Vértice 8', ['Azul-petróleo'])), ...(await colorShots('vertice', 'Vértice 8', 'gelo', 'Gelo')), ...(await colorShots('vertice', 'Vértice 8', 'grafite', 'Grafite'))],
  modelMediaId: verticeModel,
  modelTintMaterial: 'Corpo,Modulo',
  hotspots: hotspots(-0.02, 0.054, 0.152, 0.0076),
}, 4)

await add('trama', {
  name: 'Trama One',
  brandId: brandIds.Trama,
  model: 'DEMO-T1',
  shortDescription: 'Aparelho fictício de bateria grande, para demonstrar o assistente de escolha.',
  description: 'Aparelho de demonstração. Não existe no mercado e todas as informações são fictícias.',
  highlights: ['Bateria de longa duração', 'Tela de 120 Hz', 'Bom equilíbrio para o dia a dia'],
  specs: { ...specsBase, codigo: 'DEMO-T1', sistema: 'Fictício OS 13', processador: 'Demo Core 7', ram: '8', armazenamento: '256', telaTamanho: '6,5', telaTipo: 'AMOLED', resolucao: '2400 x 1080', taxa: '120', camPrincipal: '64', camQuantidade: '3', camAdicionais: 'Ultra-angular e macro', camFrontal: '16', bateria: '6000', cargaFio: '33', cargaSemFio: 'Não', resistencia: 'IP54', dimensoes: '158 x 74 x 8,8 mm', peso: '198' },
  goodFor: ['bateria', 'custo', 'jogos', 'cotidiano'],
  isFeatured: true,
  variants: [
    v('Musgo', '#4d5a3e', '128 GB', '6 GB', 2699),
    v('Musgo', '#4d5a3e', '256 GB', '8 GB', 2999),
    v('Areia', '#b9ad97', '256 GB', '8 GB', 2999),
  ],
  media: [...(await colorShots('trama', 'Trama One', 'musgo', 'Musgo')), ...(await colorShots('trama', 'Trama One', 'areia', 'Areia')), { mediaId: await image('trama-lateral', 'Trama One, lateral'), role: 'gallery' as const, color: '' }],
  modelMediaId: tramaModel,
  modelTintMaterial: 'Corpo,Modulo',
  hotspots: hotspots(0, 0.041, 0.158, 0.0088),
}, 9)

// Sem modelo 3D: demonstra a visualização em 360° baseada em imagens.
const spin = []
for (let i = 0; i < 24; i++) spin.push({ mediaId: await image(`vertice-spin-${String(i).padStart(2, '0')}`, `Vértice 7, quadro ${i + 1}`), role: 'spin' as const, color: '' })
await add('vertice7', {
  name: 'Vértice 7 Seminovo',
  brandId: brandIds['Vértice'],
  model: 'DEMO-V7',
  shortDescription: 'Aparelho fictício seminovo. Sem modelo 3D: usa visualização em 360° feita com fotos.',
  description: 'Aparelho de demonstração. Mostra como a página se comporta quando existe sequência de 360° em vez de modelo 3D.',
  condition: 'seminovo',
  conditionNotes: 'Exemplo: pequenas marcas de uso na moldura; bateria com 91% de saúde.',
  highlights: ['Visualização em 360° por fotos', 'Condição descrita pela loja'],
  specs: { ...specsBase, codigo: 'DEMO-V7', sistema: 'Fictício OS 13', processador: 'Demo Core 7', ram: '8', armazenamento: '128', telaTamanho: '6,1', telaTipo: 'OLED', resolucao: '2400 x 1080', taxa: '90', camPrincipal: '50', camQuantidade: '3', camFrontal: '12', bateria: '4300', cargaFio: '33', resistencia: 'IP67', dimensoes: '152 x 72 x 7,9 mm', peso: '176' },
  goodFor: ['custo', 'cotidiano'],
  price: 269900,
  promoPrice: 239900,
  variants: [{ color: 'Azul-petróleo', colorHex: '#1c2a33', storage: '128 GB', ram: '8 GB', condition: 'seminovo' }],
  media: [{ mediaId: await image('vertice-angulo', 'Vértice 7, costas'), role: 'gallery' as const, color: '' }, { mediaId: await image('vertice-frente', 'Vértice 7, frente'), role: 'gallery' as const, color: '' }, ...spin],
}, 12)

// Sem 3D e sem 360°: apenas galeria. Preço oculto: mostra "Consulte o preço".
await add('auroraLite', {
  name: 'Aurora S',
  brandId: brandIds.Aurora,
  model: 'DEMO-AS',
  shortDescription: 'Aparelho fictício com preço oculto: a vitrine mostra "Consulte o preço".',
  description: 'Aparelho de demonstração. Mostra a página sem modelo 3D, apenas com galeria de fotos.',
  hidePrice: true,
  highlights: ['Somente galeria de fotos', 'Preço sob consulta'],
  specs: { ...specsBase, codigo: 'DEMO-AS', sistema: 'Fictício OS 13', processador: 'Demo Core 6', ram: '6', armazenamento: '128', telaTamanho: '6,7', telaTipo: 'IPS LCD', resolucao: '2400 x 1080', taxa: '90', camPrincipal: '48', camQuantidade: '2', camFrontal: '8', bateria: '5000', cargaFio: '18', nfc: 'Não', dimensoes: '162 x 76 x 8,4 mm', peso: '205' },
  goodFor: ['cotidiano', 'custo'],
  variants: [{ color: 'Prata', colorHex: '#c9ccd1', storage: '128 GB', ram: '6 GB' }],
  media: [{ mediaId: await image('aurora-frente-prata', 'Aurora S, frente'), role: 'gallery' as const, color: '' }, { mediaId: await image('aurora-angulo-prata', 'Aurora S, costas'), role: 'gallery' as const, color: '' }],
}, 20)

await add('tramaEsgotado', {
  name: 'Trama Mini',
  brandId: brandIds.Trama,
  model: 'DEMO-TM',
  shortDescription: 'Aparelho fictício indisponível: demonstra o estado sem estoque.',
  description: 'Aparelho de demonstração.',
  availability: 'indisponivel',
  price: 199900,
  specs: { ...specsBase, codigo: 'DEMO-TM', sistema: 'Fictício OS 13', processador: 'Demo Core 5', ram: '4', armazenamento: '128', telaTamanho: '6,0', telaTipo: 'IPS LCD', resolucao: '1600 x 720', taxa: '60', camPrincipal: '13', camQuantidade: '1', camFrontal: '5', bateria: '4000', cargaFio: '15', nfc: 'Não', dimensoes: '146 x 70 x 8,9 mm', peso: '162' },
  variants: [{ color: 'Areia', colorHex: '#b9ad97', storage: '128 GB', ram: '4 GB', availability: 'indisponivel' }],
  media: [{ mediaId: await image('trama-frente', 'Trama Mini, frente'), role: 'gallery' as const, color: '' }],
}, 30)

// Acessórios com imagem ilustrativa simples.
async function accessoryImage(label: string, shape: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1100" viewBox="0 0 900 1100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4b4f55"/><stop offset="1" stop-color="#16181b"/></linearGradient></defs>${shape}</svg>`
  const buffer = await sharp(Buffer.from(svg)).webp({ quality: 88 }).toBuffer()
  return (await ingest(buffer, `demo-${label}.webp`, { isDemo: true, alt: label })).id
}

await add('capa', {
  name: 'Capa protetora (demonstração)',
  categoryId: catAcc,
  brandId: brandIds.Aurora,
  shortDescription: 'Acessório fictício compatível com o Aurora X1 Pro.',
  description: 'Acessório de demonstração. A compatibilidade é cadastrada pelo administrador.',
  price: 12900,
  media: [{ mediaId: await accessoryImage('Capa protetora', '<rect x="220" y="110" width="460" height="880" rx="70" fill="url(#g)"/><rect x="250" y="140" width="400" height="820" rx="50" fill="#0c0d0f"/><rect x="290" y="180" width="120" height="240" rx="60" fill="#25282c"/>'), role: 'gallery' as const, color: '' }],
}, 6)

await add('carregador', {
  name: 'Carregador USB-C 65 W (demonstração)',
  categoryId: catAcc,
  brandId: brandIds.Trama,
  shortDescription: 'Acessório fictício.',
  description: 'Acessório de demonstração.',
  price: 19900,
  media: [{ mediaId: await accessoryImage('Carregador USB-C', '<rect x="280" y="300" width="340" height="420" rx="48" fill="url(#g)"/><rect x="370" y="210" width="26" height="100" fill="#8d9197"/><rect x="504" y="210" width="26" height="100" fill="#8d9197"/><rect x="400" y="600" width="100" height="26" rx="13" fill="#050506"/>'), role: 'gallery' as const, color: '' }],
}, 6)

const link = async (product: string, accessories: string[]) => db.insert(schema.accessoryLinks).values(accessories.map((a) => ({ productId: ids[product], accessoryId: ids[a] })))
await link('auroraPro', ['capa', 'carregador'])
await link('trama', ['carregador'])

await db.insert(schema.collectionProducts).values([
  { collectionId: colPhoto, productId: ids.auroraPro, sortOrder: 0 },
  { collectionId: colPhoto, productId: ids.vertice, sortOrder: 1 },
  { collectionId: colGame, productId: ids.trama, sortOrder: 0 },
  { collectionId: colGame, productId: ids.auroraPro, sortOrder: 1 },
])

const heroImage = await image('aurora-par', 'Dois aparelhos fictícios sobre a plataforma do estúdio')
const bannerImage = await image('trama-angulo-areia', 'Aparelho fictício')

await db.insert(schema.settings).values({
  key: 'store',
  published: storeSchema.parse({
    ...defaultStore,
    demoNotice: true,
    address: '[Demonstração] Endereço da loja',
    hours: [{ label: '[Demonstração] Segunda a sábado', value: 'Informe no painel' }],
    commercialTerms: '[Demonstração] Descreva aqui as condições comerciais autorizadas pela loja.',
    warrantyInfo: '[Demonstração] Descreva aqui as regras de garantia.',
    usedPolicy: '[Demonstração] Descreva aqui como os seminovos são avaliados.',
    pickupInfo: '[Demonstração] Descreva aqui como funciona a retirada ou o atendimento presencial.',
    privacyPolicy: 'Modelo inicial, a ser revisado pela loja antes de publicar.\n\nEste site registra de forma agregada e sem identificar visitantes: páginas de produto vistas, cliques para o WhatsApp, pesquisas, uso de filtros, comparações, uso do assistente e compartilhamentos. Não usamos cookies de rastreamento. Favoritos e comparações ficam salvos apenas no seu navegador.',
  }),
})

await db.insert(schema.settings).values({
  key: 'home',
  published: homeSchema.parse({
    hero: {
      eyebrow: 'Vitrine digital',
      title: 'Tecnologia que você sente antes de comprar.',
      subtitle: 'Gire, aproxime e compare cada aparelho. Quando decidir, fale com a loja.',
      productId: ids.auroraPro,
      imageMediaId: heroImage,
      primaryLabel: 'Explorar celulares',
      primaryHref: '/celulares',
      secondaryLabel: 'Encontrar meu próximo celular',
      secondaryHref: '/encontre',
      specKeys: ['telaTamanho', 'camPrincipal', 'bateria'],
    },
    blocks: [
      { id: randomUUID(), type: 'rail', eyebrow: 'Em destaque', title: 'Escolhidos pela loja', source: 'destaques', limit: 8 },
      { id: randomUUID(), type: 'spotlight', eyebrow: 'Explore os detalhes', title: 'Toque nas câmeras. Vire o aparelho.', text: 'Quando existe modelo 3D, o aparelho inteiro fica na sua mão: frente, costas, laterais e acabamento.', productId: ids.trama, specKeys: ['bateria', 'taxa', 'camPrincipal', 'peso'] },
      { id: randomUUID(), type: 'collections', eyebrow: 'Coleções', title: 'Comece pelo que importa para você' },
      { id: randomUUID(), type: 'rail', eyebrow: 'Ofertas', title: 'Preço especial agora', source: 'ofertas', limit: 6 },
      { id: randomUUID(), type: 'finder', title: 'Não sabe por onde começar?', text: 'Responda seis perguntas e veja os aparelhos da loja que combinam com o seu uso.' },
      { id: randomUUID(), type: 'compare', title: 'Duas opções, uma decisão.', text: 'Coloque os aparelhos lado a lado e veja o que realmente muda.', productIds: [ids.auroraPro, ids.trama] },
      { id: randomUUID(), type: 'rail', eyebrow: 'Recém-chegados', title: 'Adicionados recentemente', source: 'recentes', limit: 6 },
      { id: randomUUID(), type: 'banner', title: 'Seminovos com condição descrita', text: 'Exemplo de banner editável: troque texto, imagem e destino no painel.', imageMediaId: bannerImage, ctaLabel: 'Ver seminovos', ctaHref: '/celulares?condicao=seminovo' },
      { id: randomUUID(), type: 'store', title: 'Venha conhecer a loja' },
    ],
  }),
})

console.log('Carga de demonstração concluída.')
process.exit(0)
