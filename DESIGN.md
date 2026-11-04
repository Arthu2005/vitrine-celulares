# DESIGN.md — Estúdio Noturno

Direção baseada nas três referências enviadas (produto com luz de recorte sobre plataforma, fileira de aparelhos em superfície grafite, página de produto escura com variantes). Não foi feita comparação com outros sites reais.

## Conceito

**"Tecnologia que você sente antes de comprar."** A interface se comporta como um estúdio fotográfico às escuras: nada grita, tudo emerge do preto sob uma única luz. Três assinaturas repetem-se em toda a vitrine e substituem a decoração:

1. **Luz de recorte** — fio de luz na cor de acento que contorna o que está em foco (aparelho, botão, card selecionado).
2. **Plataforma** — todo aparelho repousa sobre um disco iluminado. É o que substitui o "card branco".
3. **Leitura técnica** — números de especificação em fonte mono com linhas-guia, como anotações de engenharia sobre o produto.

## Cor

| Token | Valor | Papel |
| --- | --- | --- |
| `--ink-0` | `#08090A` | Fundo da página |
| `--ink-1` | `#0F1113` | Superfície baixa, faixas |
| `--ink-2` | `#171A1D` | Superfície elevada, campos |
| `--ink-3` | `#23272B` | Hover, trilhas |
| `--line` | `rgb(255 255 255 / .10)` | Divisórias e contornos |
| `--silver-1` | `#F2F3F4` | Texto principal |
| `--silver-2` | `#B6BBC1` | Texto secundário |
| `--silver-3` | `#8B9299` | Texto terciário, legendas (5,9:1 sobre ink-0) |
| `--accent` | `#FFB454` | **Único acento**: ações, foco, luz de recorte |
| `--on-accent` | `#1A1204` | Texto sobre acento |
| `--ok` / `--warn` / `--bad` | `#5BD6A0` / `#F2C14E` / `#FF7A7A` | Estados (disponível, poucas unidades, indisponível/erro) |

O acento é configurável pelo painel, restrito a predefinições que passam em contraste: **Filamento** `#FFB454`, **Ciano** `#58DCEB`, **Lima** `#C6F24E`, **Prata** `#D5D9DE`. Nunca dois acentos juntos. O botão de WhatsApp usa o acento, não o verde da marca, para manter uma única luz em cena.

## Tipografia

- **Archivo** (variável, eixo de largura). Títulos em `wdth 118–125`, peso 500–640, entrelinha justa. Corpo em largura normal.
- **JetBrains Mono** apenas para leituras técnicas, preços pequenos, rótulos e selos.

Escala: 12 · 14 · 16 · 18 · 24 · 32 · 48 · `clamp(44px, 9vw, 128px)`. Corpo mínimo 16px; medida de 60–72 caracteres.

## Espaço e forma

- Escala de 4px; seções com `clamp(72px, 12vw, 160px)`; largura de conteúdo 1360px; margem lateral 16px no celular, 32px+ no desktop.
- Raios: 6px (selos, campos pequenos), 12px (campos, cards do painel), 20px (mídia), pílula (botões).
- Sem sombras genéricas. A profundidade vem de luz: gradiente radial sob o produto e fio de contorno.

## Componentes

- **Botões**: primário (acento preenchido), secundário (contorno prata), discreto (texto). Foco sempre com anel de acento de 2px. Altura mínima 44px em toque.
- **Peça de vitrine** (`ProductTile`): aparelho recortado sobre plataforma, sem caixa; hover inclina em perspectiva até 6° e acende o disco; no toque não há estado de hover.
- **Leitura** (`Readout`): rótulo mono pequeno + valor grande + linha-guia.
- **Bandeja de comparação**: fixa na base, mostra miniaturas dos selecionados.
- **Painel (`/admin`)**: mesma paleta, densidade de ferramenta, sem efeitos; listas viram cartões no celular.

## Movimento

Curva padrão `cubic-bezier(.2,.7,.2,1)`, 240–600ms. Só `transform` e `opacity`. Revelação ao rolar é sutil (12px). Com `prefers-reduced-motion`, sem rotação automática nem parallax.

## Imagens e ícones

- Ícones: `lucide-react`, traço 1.5.
- Aparelhos em PNG/WebP recortado com fundo transparente; a plataforma é da interface, não da imagem.
- Sem emoji, sem texto em gradiente, sem glassmorphism, sem três cards iguais em fila.
