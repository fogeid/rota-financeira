Você é o Agente 17 do projeto Rota Financeira.

Contexto: O backend roda hoje localmente na máquina do usuário.
Esta tarefa prepara o CÓDIGO e a CONFIGURAÇÃO para deploy no Railway
(o usuário fará a parte de criar a conta Railway e conectar o
repositório manualmente pela interface web — isso não é scriptável
pelo Claude Code).

Leia obrigatoriamente:
- docs/15-RAILWAY-DEPLOY.md (especificação completa)
- docs/14-GIT-WORKFLOW.md (branches develop/main, pré-requisito —
  confirmar que o AGENTE 16 já rodou antes de continuar)

---

## PASSO 0 — Pré-requisito

  git branch -a

  [ ] Confirmar que a branch "develop" existe. Se não existir, PARAR
      e avisar que o AGENTE-16-SETUP-GIT-FLOW.md precisa rodar primeiro.

---

## PARTE 1 — Dockerfile para o backend (se ainda não existir)

  ls apps/backend/Dockerfile 2>/dev/null

Se não existir, criar:

  # apps/backend/Dockerfile

  FROM node:20-alpine AS base
  WORKDIR /app

  FROM base AS deps
  COPY package*.json ./
  COPY prisma ./prisma
  RUN npm ci
  RUN npx prisma generate

  FROM base AS build
  COPY --from=deps /app/node_modules ./node_modules
  COPY . .
  RUN npm run build

  FROM base AS production
  ENV NODE_ENV=production
  COPY --from=deps /app/node_modules ./node_modules
  COPY --from=build /app/dist ./dist
  COPY --from=build /app/prisma ./prisma
  COPY package*.json ./
  EXPOSE 3000
  CMD ["node", "dist/main"]

  Ajustar conforme a estrutura real do projeto se diferir (ex: se
  usar pnpm/yarn em vez de npm, ou monorepo com workspaces).

---

## PARTE 2 — railway.json (configuração de build/deploy)

  # apps/backend/railway.json (ou na raiz, conforme onde o Railway
  # vai apontar como root do serviço)

  {
    "$schema": "https://railway.app/railway.schema.json",
    "build": {
      "builder": "DOCKERFILE",
      "dockerfilePath": "Dockerfile"
    },
    "deploy": {
      "startCommand": "node dist/main",
      "healthcheckPath": "/health",
      "healthcheckTimeout": 30,
      "restartPolicyType": "ON_FAILURE",
      "restartPolicyMaxRetries": 3
    }
  }

---

## PARTE 3 — Endpoint de health check (se ainda não existir)

  grep -rn "@Get('health')\|/health" apps/backend/src --include="*.ts"

Se não existir, criar um endpoint simples e público (sem auth) que
o Railway usa para saber se o serviço está saudável:

  // apps/backend/src/health/health.controller.ts

  @Controller('health')
  export class HealthController {
    constructor(private prisma: PrismaService) {}

    @Get()
    async check() {
      // Confirmar que o banco está acessível, não só que o
      // processo Node está rodando:
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', timestamp: new Date().toISOString() };
    }
  }

  Registrar este controller no AppModule se ainda não estiver.

---

## PARTE 4 — Ajustar CORS para múltiplos ambientes

  grep -n "cors\|CORS" apps/backend/src/main.ts

  // Garantir que o CORS lê de variável de ambiente, não hardcoded:

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || [],
    credentials: true,
  });

  // No .env.example, documentar o formato esperado:
  CORS_ORIGIN=https://app-staging.rotafinanceira.app,https://dashboard-staging.rotafinanceira.app

---

## PARTE 5 — Garantir que migrations NÃO rodam automaticamente no boot

  grep -n "migrate deploy\|prisma migrate" apps/backend/package.json Dockerfile 2>/dev/null

CRÍTICO conforme docs/15-RAILWAY-DEPLOY.md seção 4: o comando de
start do container NUNCA deve incluir `prisma migrate deploy`
automaticamente. Migrations são aplicadas manualmente, em momento
controlado, antes do deploy do código que depende delas.

  Se o `package.json` tiver um script "start" que rode migrate
  automaticamente, separar isso:

  // package.json
  "scripts": {
    "start": "node dist/main",
    "migrate:deploy": "prisma migrate deploy"
  }

---

## PARTE 6 — Atualizar .env.example com formato Railway-friendly

  Garantir que DATABASE_URL e REDIS_URL no .env.example mostrem o
  formato que o Railway injeta automaticamente (para o usuário
  entender que NÃO precisa preencher esses 2 manualmente no painel
  do Railway, eles vêm do plugin):

  # .env.example
  # DATABASE_URL e REDIS_URL são injetados automaticamente pelo
  # Railway quando os plugins Postgres/Redis estão conectados ao
  # serviço — não configurar manualmente em produção/staging.
  DATABASE_URL=postgresql://user:password@localhost:5432/rota_financeira
  REDIS_URL=redis://localhost:6379

---

## PARTE 7 — Gerar instruções para o usuário (parte manual, fora do código)

Criar um arquivo qa/RAILWAY-SETUP-MANUAL.md com o passo a passo que
o usuário precisa fazer NA INTERFACE do Railway (isso não é
scriptável):

```markdown
  # Setup Manual do Railway — Passo a Passo

  ## 1. Criar conta e projetos
  - [ ] Criar conta em railway.app
  - [ ] Criar projeto "rota-financeira-staging"
  - [ ] Criar projeto "rota-financeira-production"

  ## 2. Em CADA projeto, adicionar os serviços
  - [ ] Add Service → Database → PostgreSQL
  - [ ] Add Service → Database → Redis
  - [ ] Add Service → GitHub Repo → selecionar o repositório
        → Root Directory: apps/backend
        → Branch: "develop" (no projeto staging) ou "main" (no projeto production)

  ## 3. Configurar variáveis de ambiente (em CADA projeto)
  Ir em Variables no serviço backend e adicionar (gerar valores
  únicos com `openssl rand -base64 48` para cada secret):
  - [ ] NODE_ENV (staging ou production)
  - [ ] JWT_ACCESS_SECRET
  - [ ] JWT_REFRESH_SECRET
  - [ ] ADMIN_JWT_SECRET
  - [ ] CORS_ORIGIN
  - [ ] OTP_BYPASS_MODE (true em staging, false em production)
  - [ ] PAGARME_API_KEY (ver docs/16-INTEGRACOES-EXTERNAS.md)
  - [ ] SMS_PROVIDER_API_KEY (ver docs/16-INTEGRACOES-EXTERNAS.md)
  (DATABASE_URL e REDIS_URL são automáticos, não precisa adicionar)

  ## 4. Primeiro deploy e migration
  - [ ] Aguardar o primeiro deploy automático (vai falhar se o
        banco ainda não tiver as tabelas — esperado)
  - [ ] Rodar localmente: railway link (selecionar o projeto staging)
  - [ ] railway run npx prisma migrate deploy
  - [ ] Redeploy o serviço backend (deve subir com sucesso agora)
  - [ ] Testar: acessar a URL pública do serviço + /health

  ## 5. Repetir para produção
  - [ ] Mesmo processo do passo 4, mas selecionando o projeto
        "rota-financeira-production" no railway link
```

---

## CHECKLIST FINAL

  [ ] Dockerfile criado e válido
  [ ] railway.json criado
  [ ] Endpoint /health criado e funcional
  [ ] CORS lê de variável de ambiente
  [ ] Nenhum comando de migration automática no start do container
  [ ] .env.example documentado corretamente
  [ ] qa/RAILWAY-SETUP-MANUAL.md criado com o passo a passo manual
  [ ] Testar localmente que o Dockerfile builda sem erro:
      docker build -t rota-backend-test apps/backend
      docker run -p 3000:3000 --env-file apps/backend/.env rota-backend-test
      curl http://localhost:3000/health

  git add .
  git commit -m "chore: preparar backend para deploy no Railway (Dockerfile, health check, config)"
  git push origin develop