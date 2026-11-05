# Publicar o site com o painel

Este guia coloca o site completo, com `/admin`, em um endereço público na [Railway](https://railway.com). A hospedagem roda o servidor e guarda o banco e as fotos em um disco persistente. O preço e os limites do plano mudam com o tempo: confira em [docs.railway.com/pricing/plans](https://docs.railway.com/pricing/plans) antes de assinar.

Os nomes dos botões podem mudar um pouco. O que importa são os valores abaixo.

## 1. Criar o projeto

1. Entre em railway.com com a sua conta do GitHub.
2. Crie um projeto com **Deploy from GitHub repo** e escolha `Arthu2005/vitrine-celulares`.
3. Confirme que a branch do serviço é `main`.

O primeiro deploy vai falhar, e isso é esperado: ainda faltam a senha e o disco.

## 2. Definir as variáveis

Na aba **Variables** do serviço, crie:

| Variável | Valor |
| --- | --- |
| `ADMIN_EMAIL` | O e-mail que você vai usar para entrar |
| `ADMIN_PASSWORD` | Uma senha com 12 caracteres ou mais |
| `PORT` | `3000` |

Sem a senha, o site se recusa a iniciar pela primeira vez. Não use uma senha que você já usa em outro lugar.

## 3. Criar o disco

Adicione um **Volume** ao serviço, com o caminho de montagem exatamente assim:

```text
/data
```

Sem esse disco, produtos, fotos e contas somem a cada nova publicação.

## 4. Gerar o endereço

Em **Settings > Networking**, use **Generate Domain** com a porta `3000`. Aguarde o deploy terminar e abra:

```text
https://SEU-ENDERECO.up.railway.app/admin
```

Entre com o e-mail e a senha da etapa 2. Depois do primeiro acesso, apague `ADMIN_PASSWORD` das variáveis: ela só é usada para criar o administrador.

## Depois de publicar

- **Dados de demonstração:** o site começa com aparelhos fictícios para você ver tudo funcionando. Veja em [GUIA-DO-PROPRIETARIO.md](GUIA-DO-PROPRIETARIO.md) como revisar a loja e removê-los antes de divulgar.
- **Novas versões:** cada envio para a branch `main` publica o site de novo. Os dados ficam no disco e não são apagados.
- **Esqueci a senha:** sem o [Resend](https://resend.com) configurado, o link de recuperação aparece nos logs do serviço, não no seu e-mail. Para receber por e-mail, defina `RESEND_API_KEY` e `EMAIL_FROM`.
- **Domínio próprio:** adicione o domínio em **Networking** e crie a variável `SITE_URL=https://seudominio.com.br`.
- **Backup:** o disco não é uma cópia de segurança. Antes de grandes mudanças, faça uma cópia do volume pela Railway.

## Em outra hospedagem

O `Dockerfile` funciona em qualquer serviço com contêiner e disco persistente. Monte o disco em `/data` e defina `ADMIN_EMAIL`, `ADMIN_PASSWORD` e `SITE_URL`. Rode só uma cópia do servidor por vez, porque o banco é um arquivo nesse disco.
