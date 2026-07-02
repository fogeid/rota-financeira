# Setup Manual do Railway — Passo a Passo

Este documento cobre a parte que **não é scriptável**: ações que precisam ser
feitas na interface web do Railway. O código já está preparado (Dockerfile,
railway.json, health check) — basta conectar ao Railway.

---

## 1. Criar conta e projetos

- [ ] Criar conta em [railway.app](https://railway.app)
- [ ] Criar projeto **`rota-financeira-staging`**
- [ ] Criar projeto **`rota-financeira-production`**

---

## 2. Em CADA projeto, adicionar os serviços

Dentro do projeto (staging ou production):

- [ ] **Add Service → Database → PostgreSQL**
- [ ] **Add Service → Database → Redis**
- [ ] **Add Service → GitHub Repo**
  - Selecionar o repositório `fogeid/rota-financeira`
  - Root Directory: `apps/backend`
  - Branch: `develop` (no projeto **staging**) ou `main` (no projeto **production**)

> `DATABASE_URL` e `REDIS_URL` são injetados automaticamente pelos plugins
> acima — não adicionar manualmente nas variáveis.

---

## 3. Configurar variáveis de ambiente (em CADA projeto)

Ir em **Variables** no serviço backend e adicionar.
Gerar secrets com: `openssl rand -base64 48`

| Variável | Staging | Production |
|----------|---------|------------|
| `NODE_ENV` | `staging` | `production` |
| `JWT_ACCESS_SECRET` | gerar novo | gerar novo (diferente do staging) |
| `JWT_REFRESH_SECRET` | gerar novo | gerar novo |
| `ADMIN_JWT_SECRET` | gerar novo | gerar novo |
| `ENCRYPTION_MASTER_KEY` | gerar novo | gerar novo |
| `FIELD_ENCRYPTION_KEY` | gerar novo | gerar novo |
| `HASH_SECRET` | gerar novo | gerar novo |
| `CORS_ORIGIN` | URL do dashboard staging | URL do dashboard production |
| `OTP_BYPASS_MODE` | `true` | `false` |
| `OTP_BYPASS_CODE` | `123456` | deixar vazio |
| `PAGARME_API_KEY` | chave de teste | chave de produção |
| `PAGARME_WEBHOOK_SECRET` | do painel Pagar.me | do painel Pagar.me |
| `ZENVIA_API_TOKEN` | token de teste | token de produção |
| `SENDGRID_API_KEY` | chave SendGrid | chave SendGrid |
| `SENDGRID_FROM_EMAIL` | email remetente | email remetente |
| `FIREBASE_PROJECT_ID` | id do projeto Firebase | id do projeto Firebase |
| `FIREBASE_PRIVATE_KEY` | chave privada Firebase | chave privada Firebase |
| `FIREBASE_CLIENT_EMAIL` | email do service account | email do service account |
| `SENTRY_DSN` | DSN do Sentry | DSN do Sentry |

Ver detalhes de cada integração em `docs/16-INTEGRACOES-EXTERNAS.md`.

---

## 4. Primeiro deploy e migration (staging)

O primeiro deploy automático pode **falhar** se o banco ainda não tiver
as tabelas — isso é esperado.

- [ ] Aguardar o primeiro build/deploy terminar (com ou sem erro)
- [ ] No terminal local, instalar a CLI do Railway:
  ```bash
  npm install -g @railway/cli
  railway login
  ```
- [ ] Linkar ao projeto staging:
  ```bash
  railway link   # selecionar rota-financeira-staging → serviço backend
  ```
- [ ] Rodar as migrations no banco de staging:
  ```bash
  railway run npm run migrate:deploy
  ```
- [ ] No painel Railway, fazer **Redeploy** do serviço backend
- [ ] Testar o health check:
  ```bash
  curl https://<url-publica-do-servico>/v1/health
  # Resposta esperada: {"status":"ok","timestamp":"..."}
  ```

---

## 5. Repetir para production

- [ ] `railway link` → selecionar `rota-financeira-production`
- [ ] `railway run npm run migrate:deploy`
- [ ] Redeploy e testar `/v1/health`

---

## Referências

- Especificação completa: `docs/15-RAILWAY-DEPLOY.md`
- Variáveis de ambiente: `apps/backend/.env.example`
- Integrações externas: `docs/16-INTEGRACOES-EXTERNAS.md`
