# Proposta criativa e técnica

## Conceito: Estúdio Noturno

"Tecnologia que você sente antes de comprar." A vitrine se comporta como um estúdio de fotografia às escuras: tudo emerge do preto sob uma única luz. Foi a resposta às três referências enviadas: o recorte de luz sobre a plataforma, a fileira de aparelhos em superfície grafite e a página de produto escura com variantes.

Três assinaturas substituem a decoração:

1. **Luz de recorte**: um fio de luz marca o que está em foco.
2. **Plataforma**: todo aparelho repousa em um disco iluminado, em vez de um card branco.
3. **Leitura técnica**: números em fonte mono com linhas-guia, como anotações de engenharia.

Paleta: preto grafite, prata e um único acento (Filamento, âmbar) trocável no painel por Ciano, Lima ou Prata. Tipografia: Archivo com eixo de largura para títulos e corpo; JetBrains Mono para dados. Detalhes em [DESIGN.md](../DESIGN.md).

## Estrutura de páginas

| Rota | Conteúdo |
| --- | --- |
| `/` | Destaque com 3D e blocos configuráveis |
| `/celulares` | Catálogo com busca e filtros |
| `/celulares/[slug]` | Aparelho: 3D, 360°, fotos, vídeo, variantes, ficha técnica |
| `/marca`, `/categoria`, `/colecao` | Catálogo já recortado |
| `/comparar` | Dois ou três aparelhos lado a lado |
| `/encontre` | Assistente de seis perguntas |
| `/favoritos`, `/loja`, `/privacidade`, `/termos` | Apoio |
| `/admin` | Resumo, produtos, mídia, catálogo, página inicial, configurações, usuários |

## Estratégia 3D

- Modelos GLB/glTF reais, exibidos com Three.js e React Three Fiber, com iluminação de estúdio local, sem baixar HDR externo.
- Cada produto usa o melhor recurso que realmente tem: modelo 3D, sequência 360° por fotos ou galeria. A interface só oferece o que existe.
- Modelos sem fidelidade comprovada exibem "Modelo ilustrativo". A marcação vem ligada por padrão e só deve ser desligada para modelos fiéis.
- Pontos interativos são colocados com um clique sobre o modelo, no painel, e ficam presos à geometria real.
- Troca de cor por material do GLB ou por um arquivo específico da variante.
- Desktop: o modelo abre direto. Celular: a foto vem primeiro e o 3D carrega quando o cliente pede, o que levou a página de 1,9 MB para cerca de 400 KB.
- Sem WebGL, com economia de dados, em aparelho fraco ou em erro de carregamento, a vitrine cai na galeria sem quebrar a página.

Os três aparelhos da demonstração foram gerados por código e têm desenho próprio: não copiam nenhum celular existente.

## Decisões técnicas

| Decisão | Motivo |
| --- | --- |
| Next.js 16, React 19, TypeScript | URLs estáveis, renderização no servidor para SEO e ações de servidor para o painel |
| Tailwind CSS 4 com tokens | Design system simples de manter |
| SQLite via libSQL e Drizzle | Banco relacional real, sem custo fixo, em um único arquivo. O mesmo código aceita Turso se a loja crescer |
| Autenticação própria com scrypt | Sem mensalidade e sem dependência externa. Sessões no banco, com bloqueio de tentativas |
| Armazenamento local ou S3 | Um servidor simples resolve hoje; o driver S3 fica pronto para depois |
| Sharp no upload | Gera WebP em três tamanhos e remove metadados |
| Métricas sem cookies | Eventos agregados, sem identificar visitantes |

## Fluxo de publicação

Editar → salvar rascunho → pré-visualizar → publicar. Um produto publicado continua no ar sem mudanças enquanto o rascunho é preparado. Despublicar ou excluir o retira do catálogo, do comparador, das recomendações e da seleção guardada no navegador do visitante.

## Fora do escopo desta versão

Checkout, pagamento online, carrinho, frete, pedidos e cadastro de visitantes, conforme o briefing.

## Próximos passos sugeridos

1. Informar os dados reais da loja.
2. Cadastrar os aparelhos reais, com fotos próprias.
3. Adquirir ou produzir modelos 3D dos aparelhos mais procurados, aos poucos.
4. Testar em iPhone e Android reais antes de divulgar.
