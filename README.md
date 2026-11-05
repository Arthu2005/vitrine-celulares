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
| `npm run start:prod` | Atualiza o banco, prepara a primeira inicialização e inicia o servidor de produção |
| `npm run db:migrate` | Aplica migrações do banco |
| `npm run db:generate` | Gera migração após alterar `src/lib/db/schema.ts` |
| `npm run db:seed` | Carga inicial (`-- --reset` apaga tudo e recomeça) |
| `npm run admin:create -- email "senha" "Nome"` | Cria proprietário ou redefine a senha |
| `npm run test:e2e` | Testes de ponta a ponta (rode `npm run build` antes; usa o Microsoft Edge instalado) |
| `npm run demo:models` e `npm run demo:render` | Regeneram os modelos e imagens fictícios |

## Publicar

O passo a passo está em [docs/PUBLICAR-PAINEL.md](docs/PUBLICAR-PAINEL.md).

### Grátis: Render + Turso

O servidor roda na Render, e o banco e as fotos ficam no Turso (`STORAGE_DRIVER=database`), porque o disco da Render grátis é apagado a cada reinício. O servidor dorme depois de 15 minutos sem visitas e leva cerca de 1 minuto para acordar. O arquivo `render.yaml` já descreve o serviço.

A Vercel não é uma opção grátis aqui: o plano Hobby proíbe uso comercial, e ela recusa envios acima de 4,5 MB.

### Pago: um servidor com disco persistente

Banco SQLite e arquivos no mesmo disco, sem espera no primeiro acesso. Serve para Railway (`railway.json`) ou outro serviço com contêiner.

1. Monte um disco persistente em `/data`.
2. Defina `ADMIN_EMAIL` e `ADMIN_PASSWORD` (12 caracteres ou mais). Elas só são usadas na primeira inicialização, que também carrega a demonstração.
3. Fora da Railway e da Render, defina `SITE_URL=https://seudominio.com.br`. Ele é usado em links, SEO e e-mails, e o cookie de sessão passa a exigir HTTPS quando começa com `https`.
4. Para a recuperação de senha por e-mail, defina `RESEND_API_KEY` e `EMAIL_FROM`.
5. Rode uma cópia do servidor por vez e faça backup periódico do disco.

Sem Docker, use `npm ci`, `npm run build` e `npm run start:prod`, com `DATABASE_URL` e `STORAGE_LOCAL_DIR` apontando para o disco.

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

A imagem de produção é construída e testada pelo workflow `.github/workflows/docker.yml`: recusa iniciar sem senha, inicia em disco novo, serve páginas e arquivos, usa o endereço público e mantém os dados em um novo contêiner.

**Não testado:**

- aparelhos físicos: a parte móvel foi validada por emulação no navegador, sem iPhone ou Android reais;
- driver S3: o código existe, mas não foi executado contra um serviço real;
- envio real de e-mail pelo Resend: sem a chave, o link de recuperação aparece no log do servidor, e foi assim que o fluxo foi testado;
- domínio próprio e publicação na Railway.

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
