# Publicar o site com o painel

Este guia coloca o site completo, com `/admin`, em um endereço público usando dois serviços com plano grátis:

- [Render](https://render.com/docs/free): roda o servidor;
- [Turso](https://turso.tech/pricing): guarda o banco e as fotos.

Os limites dos planos grátis mudam com o tempo. Confira as páginas acima antes de contar com eles.

## O que esperar do plano grátis

- **Primeiro acesso lento:** depois de 15 minutos sem visitas, o servidor dorme. O próximo visitante espera cerca de 1 minuto até o site abrir.
- **Limite de horas:** são 750 horas por mês. Se acabarem, o site fica fora do ar até o mês seguinte.
- **Limite de dados:** o plano grátis do Turso tem cerca de 5 GB. Ao passar dos limites, é preciso assinar um plano pago.

Serve para testar e mostrar o painel. Para uma loja recebendo clientes, a espera do primeiro acesso costuma compensar um plano pago.

## 1. Criar o banco no Turso

1. Entre em turso.tech com a sua conta do GitHub.
2. Crie um banco de dados.
3. Copie o endereço dele, que começa com `libsql://`.
4. Gere um token de acesso e copie o valor. Trate esse token como uma senha.

## 2. Criar o serviço na Render

1. Entre em render.com com a sua conta do GitHub e autorize o repositório `Arthu2005/vitrine-celulares`.
2. Crie um **Blueprint** a partir desse repositório. Ele lê o arquivo `render.yaml`.
3. Preencha os valores pedidos:

| Variável | Valor |
| --- | --- |
| `DATABASE_URL` | O endereço `libsql://` do Turso |
| `DATABASE_AUTH_TOKEN` | O token do Turso |
| `ADMIN_EMAIL` | O e-mail que você vai usar para entrar |
| `ADMIN_PASSWORD` | Uma senha com 12 caracteres ou mais |

Sem a senha, o site se recusa a iniciar pela primeira vez. Não use uma senha que você já usa em outro lugar.

## 3. Abrir o painel

Aguarde o deploy terminar e abra o endereço mostrado pela Render, acrescentando `/admin`:

```text
https://SEU-ENDERECO.onrender.com/admin
```

Entre com o e-mail e a senha da etapa 2. Depois do primeiro acesso, apague `ADMIN_PASSWORD` das variáveis: ela só é usada para criar o administrador.

## Depois de publicar

- **Dados de demonstração:** o site começa com aparelhos fictícios para você ver tudo funcionando. Veja em [GUIA-DO-PROPRIETARIO.md](GUIA-DO-PROPRIETARIO.md) como revisar a loja e removê-los antes de divulgar.
- **Novas versões:** cada envio para a branch configurada publica o site de novo. Os dados ficam no Turso e não são apagados.
- **Esqueci a senha:** sem o [Resend](https://resend.com) configurado, o link de recuperação aparece nos logs do serviço, não no seu e-mail. Para receber por e-mail, defina `RESEND_API_KEY` e `EMAIL_FROM`.
- **Domínio próprio:** adicione o domínio na Render e crie a variável `SITE_URL=https://seudominio.com.br`.
- **Backup:** o Turso guarda o banco e as fotos juntos. Antes de grandes mudanças, faça uma cópia do banco por lá.

## Com um plano pago

Com disco persistente, o site não dorme e as fotos ficam em arquivos comuns. O `Dockerfile` funciona na Railway (`railway.json`) ou em qualquer serviço com contêiner e disco. Monte o disco em `/data`, defina `ADMIN_EMAIL`, `ADMIN_PASSWORD` e, fora da Railway e da Render, `SITE_URL`. Rode só uma cópia do servidor por vez, porque o banco é um arquivo nesse disco.
