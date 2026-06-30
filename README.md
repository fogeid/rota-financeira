# Rota Financeira

App mobile de gestão financeira para motoristas de aplicativo (Uber, 99, iFood) no Brasil. Ajuda motoristas a saber quanto precisam ganhar por dia para pagar o financiamento do carro e ainda ter renda sobrando.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Mobile | React Native 0.85 + Expo SDK 56 + TypeScript strict |
| Backend | NestJS 10 + Prisma 5 + TypeScript strict |
| Banco | PostgreSQL 16 + Redis 7 |
| Filas | BullMQ |
| Auth | JWT (access 15min + refresh 30d) + bcrypt custo 12 |
| Pagamentos | Pagar.me |
| Push | Firebase FCM |

---

## Rodar localmente

### Pré-requisitos

- Node.js 20+
- Docker e Docker Compose
- EAS CLI (`npm install -g eas-cli`)

### 1. Banco de dados e Redis

```bash
docker-compose up -d
```

### 2. Backend

```bash
cd apps/backend
cp .env.example .env   # preencher variáveis

npm install
npx prisma migrate dev
npm run start:dev
```

API disponível em `http://localhost:3000`.

### 3. Mobile

```bash
cd apps/mobile
npm install
npx expo start
```

- Pressione `w` para abrir no browser (http://localhost:8082)
- Pressione `a` para Android
- Pressione `i` para iOS simulator

#### Variáveis de ambiente mobile

Crie `apps/mobile/.env`:

```env
API_URL=http://localhost:3000
PAGARME_PUBLIC_KEY=pk_test_...
FIREBASE_WEB_API_KEY=...
EAS_PROJECT_ID=...
```

---

## Rodar testes

```bash
# Backend
cd apps/backend
npm run test          # unit tests
npm run test:e2e      # integration tests
npm run test:cov      # coverage

# Mobile
cd apps/mobile
npm run lint          # ESLint
npx tsc --noEmit      # TypeScript check
```

---

## Deploy

### Backend — Railway

```bash
# Via GitHub Actions (automático em push para main)
# Ou manualmente:
railway up --service rota-financeira-backend
```

Secrets necessários no Railway:
- `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `PAGARME_API_KEY`, `PAGARME_ENCRYPTION_KEY`
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- `FRONTEND_URL`

### Mobile — EAS Build

```bash
cd apps/mobile

# Build de desenvolvimento (APK com dev client)
eas build --profile development --platform android

# Build de preview (APK para testes internos)
eas build --profile preview --platform android

# Build de produção (AAB para Play Store / IPA para App Store)
eas build --profile production --platform all
```

Secrets necessários no EAS (via `eas secret`):
- `API_URL`, `PAGARME_PUBLIC_KEY`, `FIREBASE_WEB_API_KEY`

#### CI/CD automático

| Branch | Ação |
|--------|------|
| `develop` (push) | Lint + typecheck + EAS build preview |
| `main` (push) | Lint + typecheck + EAS build production + deploy Railway |

---

## Fluxo de branches (Git Workflow)

O projeto segue um fluxo de duas branches permanentes:

| Branch | Propósito |
|--------|-----------|
| `main` | Produção — sempre estável, protegida contra push direto |
| `develop` | Integração contínua — base para novas features |

### Regras

- **Nunca** faça push direto em `main` ou `develop`
- Todo trabalho acontece em branches temporárias criadas a partir de `develop`
- Use o prefixo adequado para o nome da branch:

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| Nova funcionalidade | `feat/<nome>` | `feat/agente-16-git-flow` |
| Correção de bug | `fix/<nome>` | `fix/login-refresh-token` |
| Documentação | `docs/<nome>` | `docs/api-spec-update` |
| Configuração/infra | `chore/<nome>` | `chore/update-dependencies` |

### Ciclo de vida

```
develop → feat/minha-feature → PR → develop → PR → main
```

1. Crie sua branch a partir de `develop`
2. Abra um Pull Request para `develop` quando terminar
3. Após validação em `develop`, abra PR de `develop` → `main` para release

Para detalhes completos: [`docs/14-GIT-WORKFLOW.md`](docs/14-GIT-WORKFLOW.md)

---

## Estrutura do repositório

```
rota-financeira/
├── apps/
│   ├── mobile/                 → React Native + Expo
│   │   ├── src/
│   │   │   ├── components/     → Design system (Card, HeroCard, AlertBox…)
│   │   │   ├── navigation/     → RootNavigator → MainStack → MainNavigator (tabs)
│   │   │   ├── screens/        → auth/ + main/ (Home, Ganhos, Custos, MeuCarro…)
│   │   │   ├── services/mocks/ → Serviços mock com mesmas interfaces da API real
│   │   │   ├── store/          → Zustand stores (auth, home, earnings, costs…)
│   │   │   ├── theme/          → Colors, typography, spacing
│   │   │   └── utils/          → formatters, secureStorage
│   │   ├── app.config.ts       → Expo config com variáveis de ambiente
│   │   └── eas.json            → Profiles de build EAS
│   └── backend/                → NestJS + Prisma
│       ├── src/
│       │   ├── modules/        → auth, users, earnings, costs, financing…
│       │   └── config/         → env validation, logger, database
│       └── prisma/             → schema.prisma + migrations
├── docs/                       → PRD, Tech Stack, DB Schema, API Spec, UI Spec…
├── .github/workflows/          → backend-ci.yml + mobile-ci.yml
├── docker-compose.yml          → PostgreSQL 16 + Redis 7 local
└── CLAUDE.md                   → Instruções para agentes de IA
```

---

## Agentes de IA — Ordem de execução

Este projeto foi construído com agentes de IA especializados. A ordem abaixo garante que cada agente encontre o contexto correto ao iniciar:

| Agente | Responsabilidade | Entregáveis |
|--------|-----------------|-------------|
| **Agente 1** | Infraestrutura backend | NestJS base, Auth, Users, migrations, testes |
| **Agente 2** | Módulos financeiros | Earnings, Costs, Financing, Reports, Taxes |
| **Agente 3** | Integrações e alertas | Integrations (Uber/99), Alerts, Notifications, FCM |
| **Agente 4** | Pagamentos e assinaturas | Subscriptions, Pagar.me webhook, BullMQ jobs |
| **Agente 5** | Fundação mobile | Expo setup, design system, AuthNavigator, Zustand, Axios |
| **Agente 6** | Telas de negócio | Home, Ganhos, Custos, MeuCarro, Relatórios, Impostos |
| **Agente 7** | Perfil, assinatura e CI/CD | PerfilScreen avançado, UpgradeScreen, fluxo de pagamento, GitHub Actions, EAS |

Sempre leia `CLAUDE.md` e os documentos em `docs/` antes de iniciar qualquer agente.

---

## Segurança

- Tokens JWT armazenados exclusivamente no Expo SecureStore (nunca AsyncStorage)
- Credenciais de plataformas criptografadas com AES-256-GCM
- Número do cartão de crédito tokenizado client-side via Pagar.me (nunca chega ao servidor)
- CPF nunca retornado completo em respostas de API
- Secrets exclusivamente em variáveis de ambiente

---

## Licença

Proprietário · © 2025 Rota Financeira
