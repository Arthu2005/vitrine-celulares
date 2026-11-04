# Vitrine digital para loja de celulares

Vitrine pública com exploração 3D, comparador, assistente de escolha e contato pelo WhatsApp, mais um painel em `/admin` para a loja cuidar de tudo sem programador. Não há checkout: a venda acontece na conversa ou na loja.

**Demonstração no ar:** https://arthu2005.github.io/vitrine-celulares/ (dados fictícios, sem o painel)

- Proposta criativa e arquitetura: [docs/PROPOSTA.md](docs/PROPOSTA.md)
- Identidade visual: [DESIGN.md](DESIGN.md)
- Guia para o proprietário: [docs/GUIA-DO-PROPRIETARIO.md](docs/GUIA-DO-PROPRIETARIO.md)

## Rodar no computador

Requer Node.js 20.9 ou mais recente.

```bash
npm install
```

```bash
cp .env.example .env.local
```

Edite `.env.local` e defina `ADMIN_EMAIL` e `ADMIN_PASSWORD`. Depois:

```bash
npm run setup
```

```bash
npm run dev
```

Vitrine em `http://localhost:3000`, painel em `http://localhost:3000/admin`.

`npm run setup` prepara o banco e carrega a **demonstração**: aparelhos, marcas e preços fictícios, identificados como tal na vitrine. O painel tem um botão para apagar tudo isso de uma vez. Para começar sem nada, use `npm run db:migrate` e `npx tsx scripts/seed.ts --sem-demo`.

## Comandos

| Comando | Para quê |
| --- | --- |
| `npm run dev` | Desenvolvimento |
| `npm run build` e `npm start` | Versão de produção |
| `npm run db:migrate` | Aplica migrações do banco |
| `npm run db:generate` | Gera migração após alterar `src/lib/db/schema.ts` |
| `npm run db:seed` | Carga inicial (`-- --reset` apaga tudo e recomeça) |
| `npm run admin:create -- email "senha" "Nome"` | Cria proprietário ou redefine a senha |
| `npm run test:e2e` | Testes de ponta a ponta (rode `npm run build` antes; usa o Microsoft Edge instalado) |
| `npm run demo:models` e `npm run demo:render` | Regeneram os modelos e imagens fictícios |

## Publicar

### Recomendado: um servidor com disco persistente

É o caminho mais simples e barato para uma loja: banco SQLite e arquivos no mesmo disco. Serve qualquer VPS ou plataforma com volume persistente (Railway, Render, Fly.io).

1. Use o `Dockerfile` do projeto, ou rode `npm ci`, `npm run build`, `npm run db:migrate` e `npm start`.
2. Monte volumes persistentes em `/app/data` (banco) e `/app/storage` (arquivos).
3. Defina as variáveis de ambiente:
   - `NEXT_PUBLIC_SITE_URL=https://seudominio.com.br` **antes do build**, pois ela é gravada no código do navegador e aparece nos links do WhatsApp;
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD`;
   - `RESEND_API_KEY` e `EMAIL_FROM` para a recuperação de senha por e-mail.
4. Na primeira publicação, sem dados de demonstração:
   ```bash
   npx tsx scripts/seed.ts --sem-demo
   ```
5. Aponte o domínio e ative HTTPS na plataforma. O cookie de sessão passa a exigir HTTPS automaticamente quando `NEXT_PUBLIC_SITE_URL` começa com `https`.
6. Faça backup periódico das pastas `data/` e `storage/`.

### Alternativa: Vercel + Turso + armazenamento S3

Defina `DATABASE_URL=libsql://...`, `DATABASE_AUTH_TOKEN`, `STORAGE_DRIVER=s3` e as variáveis `S3_*` (Cloudflare R2, Supabase Storage ou AWS S3). Limitação: a Vercel recusa requisições acima de 4,5 MB, o que impede enviar fotos grandes, vídeos e modelos 3D pelo painel. Por isso esta não é a opção recomendada.

## Demonstração no GitHub Pages

O domínio `github.io` só entrega arquivos estáticos, sem servidor. Por isso existem duas versões do mesmo código:

| | Com servidor | GitHub Pages |
| --- | --- | --- |
| Vitrine, 3D, filtros, comparador, assistente, favoritos, WhatsApp | Sim | Sim |
| Painel `/admin`, login e upload | Sim | **Não** |
| Alterar produtos sem refazer o site | Sim | **Não** |
| Métricas | Sim | **Não** |

A versão do Pages mostra os dados congelados no momento do build e serve para apresentar o projeto. A loja real, com painel, precisa de uma hospedagem com servidor (veja "Publicar").

Cada envio para a branch `main` publica automaticamente pelo workflow `.github/workflows/pages.yml`. Para gerar e testar localmente:

```bash
npm run build:pages
```

```bash
npm run serve:pages
```

## O que foi testado e o que não foi

`npm run test:e2e` roda sobre o build de produção, com banco e arquivos isolados: catálogo, filtros, busca, variantes, mensagens de WhatsApp, 3D, 360°, comparador, assistente, favoritos, login, bloqueio de tentativas, recuperação de senha, perfis, upload, recusa de arquivos falsos, rascunho, prévia, publicação, despublicação, exclusão, persistência após reiniciar o servidor, remoção da demonstração e ausência de rolagem horizontal em 320, 390, 768 e 1280 px.

**Não testado:**

- aparelhos físicos: a parte móvel foi validada por emulação no navegador, sem iPhone ou Android reais;
- driver S3 e banco Turso: o código existe, mas não foi executado contra serviços reais;
- envio real de e-mail pelo Resend: sem a chave, o link de recuperação aparece no log do servidor, e foi assim que o fluxo foi testado;
- `Dockerfile`: o Docker não estava disponível no ambiente de desenvolvimento;
- publicação com servidor em domínio próprio: só a demonstração estática foi publicada, no GitHub Pages.

**Limitações conhecidas:**

- os modelos 3D incluídos são aparelhos fictícios. Modelos fiéis de celulares reais precisam ser adquiridos ou produzidos e enviados pelo painel;
- fotos HEIC são recusadas com mensagem clara. No iPhone, o seletor de arquivos normalmente já converte para JPG;
- no celular, um dedo sobre o modelo 3D gira o aparelho em vez de rolar a página. A rolagem continua pelas áreas ao redor;
- a loja precisa revisar a política de privacidade inicial antes de publicar.

## Estrutura

```
src/app/(site)/      Vitrine pública
src/app/admin/       Painel e ações do servidor
src/app/api/         Eventos, busca e upload
src/app/media/       Entrega de arquivos no modo local
src/components/      site, admin e three (3D)
src/lib/             Banco, autenticação, catálogo, filtros, upload
scripts/             Migração, carga, modelos demo e testes
drizzle/             Migrações do banco
demo-assets/         Modelos e imagens fictícios
```
