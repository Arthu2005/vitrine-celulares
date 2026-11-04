export const CONDITIONS = { novo: 'Novo', seminovo: 'Seminovo', recondicionado: 'Recondicionado' } as const
export type Condition = keyof typeof CONDITIONS

export const AVAILABILITY = {
  disponivel: 'Disponível',
  ultimas: 'Últimas unidades',
  encomenda: 'Sob encomenda',
  indisponivel: 'Indisponível',
} as const
export type Availability = keyof typeof AVAILABILITY

export const GOOD_FOR = {
  camera: 'Câmera',
  desempenho: 'Desempenho',
  bateria: 'Bateria',
  custo: 'Custo-benefício',
  jogos: 'Jogos',
  fotografia: 'Fotografia',
  trabalho: 'Trabalho',
  cotidiano: 'Uso cotidiano',
} as const
export type GoodFor = keyof typeof GOOD_FOR

export const ACCENTS = {
  filamento: { label: 'Filamento', value: '#FFB454' },
  ciano: { label: 'Ciano', value: '#58DCEB' },
  lima: { label: 'Lima', value: '#C6F24E' },
  prata: { label: 'Prata', value: '#D5D9DE' },
} as const
export type AccentKey = keyof typeof ACCENTS

export type SpecField = {
  key: string
  label: string
  unit?: string
  numeric?: boolean
  /** Direção em que o número é objetivamente maior ou menor. Só assim o comparador destaca diferença. */
  better?: 'higher' | 'lower'
  compare?: boolean
  hint?: string
}

export type SpecGroup = { id: string; title: string; fields: SpecField[] }

export const SPEC_GROUPS: SpecGroup[] = [
  {
    id: 'geral',
    title: 'Identificação',
    fields: [
      { key: 'fabricante', label: 'Fabricante' },
      { key: 'codigo', label: 'Modelo e código de identificação' },
      { key: 'ano', label: 'Ano de lançamento' },
      { key: 'sistema', label: 'Sistema operacional', compare: true },
    ],
  },
  {
    id: 'desempenho',
    title: 'Desempenho',
    fields: [
      { key: 'processador', label: 'Processador', compare: true },
      { key: 'gpu', label: 'GPU' },
      { key: 'ram', label: 'Memória RAM', unit: 'GB', numeric: true, better: 'higher', compare: true },
      { key: 'armazenamento', label: 'Armazenamento interno', unit: 'GB', numeric: true, better: 'higher', compare: true, hint: 'Maior capacidade disponível.' },
    ],
  },
  {
    id: 'tela',
    title: 'Tela',
    fields: [
      { key: 'telaTamanho', label: 'Tamanho da tela', unit: 'pol', numeric: true, compare: true },
      { key: 'telaTipo', label: 'Tipo de tela', compare: true, hint: 'Exemplo: AMOLED, OLED, IPS LCD.' },
      { key: 'resolucao', label: 'Resolução', compare: true },
      { key: 'taxa', label: 'Taxa de atualização', unit: 'Hz', numeric: true, better: 'higher', compare: true },
      { key: 'painel', label: 'Tecnologia do painel' },
    ],
  },
  {
    id: 'cameras',
    title: 'Câmeras',
    fields: [
      { key: 'camPrincipal', label: 'Câmera principal', unit: 'MP', numeric: true, compare: true },
      { key: 'camQuantidade', label: 'Quantidade de câmeras traseiras', numeric: true, compare: true },
      { key: 'camAdicionais', label: 'Câmeras adicionais', compare: true },
      { key: 'camFrontal', label: 'Câmera frontal', unit: 'MP', numeric: true, compare: true },
      { key: 'camRecursos', label: 'Recursos de fotografia e vídeo' },
    ],
  },
  {
    id: 'bateria',
    title: 'Bateria e carregamento',
    fields: [
      { key: 'bateria', label: 'Capacidade da bateria', unit: 'mAh', numeric: true, better: 'higher', compare: true },
      { key: 'cargaFio', label: 'Carregamento com fio', unit: 'W', numeric: true, better: 'higher', compare: true },
      { key: 'cargaSemFio', label: 'Carregamento sem fio', compare: true },
    ],
  },
  {
    id: 'conectividade',
    title: 'Conectividade',
    fields: [
      { key: 'rede', label: 'Rede móvel', compare: true, hint: 'Exemplo: 5G.' },
      { key: 'wifi', label: 'Wi-Fi', compare: true },
      { key: 'bluetooth', label: 'Bluetooth' },
      { key: 'nfc', label: 'NFC', compare: true },
      { key: 'entrada', label: 'Tipo de entrada' },
    ],
  },
  {
    id: 'construcao',
    title: 'Segurança e construção',
    fields: [
      { key: 'biometria', label: 'Biometria e reconhecimento facial' },
      { key: 'resistencia', label: 'Resistência à água e poeira', compare: true },
      { key: 'dimensoes', label: 'Dimensões', compare: true },
      { key: 'peso', label: 'Peso', unit: 'g', numeric: true, better: 'lower', compare: true },
    ],
  },
  {
    id: 'caixa',
    title: 'Na caixa',
    fields: [{ key: 'embalagem', label: 'Conteúdo da embalagem' }],
  },
]

export const SPEC_FIELDS = SPEC_GROUPS.flatMap((g) => g.fields)
export const specField = (key: string) => SPEC_FIELDS.find((f) => f.key === key)

export const EVENT_TYPES = ['product_view', 'whatsapp_click', 'filter_use', 'compare', 'search', 'finder_use', 'share'] as const
export type EventType = (typeof EVENT_TYPES)[number]

export const LIMITS = {
  image: 15 * 1024 * 1024,
  video: 100 * 1024 * 1024,
  model: 30 * 1024 * 1024,
  modelSoft: 8 * 1024 * 1024,
  modelTriangles: 300_000,
}
