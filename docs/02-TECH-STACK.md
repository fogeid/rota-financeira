# Rota Financeira — Tech Stack e Arquitetura

**Versão:** 1.0 | **Data:** Junho 2026

---

## 1. Visão Geral da Arquitetura

```
[App Mobile] ←→ [API Gateway] ←→ [Backend NestJS]
                                        ↓
                              [PostgreSQL] [Redis]
                                        ↓
                              [Bull Queue] ←→ [Worker]
                                        ↓
                    [Firebase FCM] [Pagar.me] [Scraper Service]
```

---

## 2. Mobile

| Item | Decisão | Justificativa |
|------|---------|---------------|
| Framework | React Native 0.74 + Expo SDK 51 | Android + iOS em um código. Expo simplifica build |
| Linguagem | TypeScript 5.x (strict mode) | Tipagem obrigatória em todo o projeto |
| Navegação | React Navigation 6 (Bottom Tab + Stack) | Padrão da indústria para RN |
| Estado global | Zustand | Leve, sem boilerplate, fácil de testar |
| Requisições HTTP | Axios com interceptors | Retry automático, refresh token transparente |
| Formulários | React Hook Form + Zod | Validação no cliente antes de enviar |
| Armazenamento local | Expo SecureStore | Tokens JWT em keychain segura. NUNCA AsyncStorage para dados sensíveis |
| Notificações push | Expo Notifications + FCM | Integração nativa com Firebase |
| Biometria | Expo LocalAuthentication | Face ID e Touch ID |
| PDF | expo-print + expo-sharing | Geração e download do relatório |
| Gráficos | Victory Native | Gráficos de barras e linhas |
| Ícones | @expo/vector-icons (Ionicons) | Já incluído no Expo |
| Testes | Jest + React Native Testing Library | Unitários e de componente |

---

## 3. Backend

| Item | Decisão | Justificativa |
|------|---------|---------------|
| Framework | NestJS 10 | Estrutura modular, DI nativa, TypeScript primeiro |
| Linguagem | TypeScript 5.x (strict mode) | Consistência com o mobile |
| ORM | Prisma 5 | Migrations tipadas, schema como fonte de verdade |
| Banco principal | PostgreSQL 16 | Relacional, suporte a JSON, confiável |
| Banco de cache | Redis 7 | Cache de sessões, filas, rate limiting |
| Filas | BullMQ (sobre Redis) | Sync de plataformas, alertas, e-mails |
| Autenticação | JWT (access + refresh) + bcrypt | Padrão seguro. Custo bcrypt: 12 |
| Validação | class-validator + class-transformer | Integrado ao NestJS |
| Documentação API | Swagger (OpenAPI 3.0) | Gerado automaticamente pelos decorators |
| Testes | Jest + Supertest | Unitários e integração de endpoints |
| Logs | Winston + CloudWatch | Logs estruturados. Nunca logar dados sensíveis |
| Monitoramento | Sentry | Rastreamento de erros em produção |

---

## 4. Banco de Dados

| Item | Decisão |
|------|---------|
| SGBD | PostgreSQL 16 |
| Instância | Railway PostgreSQL ou Supabase |
| Backup | Automático diário. Retenção 30 dias |
| SSL | Obrigatório em todas as conexões |
| Pool de conexões | PgBouncer (máx 20 conexões simultâneas no MVP) |
| Migrations | Prisma Migrate (versionadas e reversíveis) |

---

## 5. Infraestrutura e Deploy

| Item | Decisão |
|------|---------|
| Backend hosting | Railway (MVP) — migrar para AWS ECS em escala |
| Região | São Paulo (sa-east-1) |
| CI/CD | GitHub Actions |
| Container | Docker (Dockerfile no repositório) |
| Variáveis de ambiente | Railway Secrets (nunca em código) |
| CDN | Cloudflare (para assets estáticos futuros) |
| App Android | Google Play Store via EAS Build |
| App iOS | Apple App Store via EAS Build |

---

## 6. Serviços Externos

| Serviço | Uso | SDK |
|---------|-----|-----|
| Firebase Auth | Gerenciamento de usuários (complementar ao JWT) | firebase-admin |
| Firebase FCM | Notificações push Android e iOS | firebase-admin |
| Pagar.me | Assinaturas, cartão, PIX | pagarme-js |
| SendGrid | E-mails transacionais (recibos, boas-vindas) | @sendgrid/mail |
| AWS S3 ou Supabase Storage | PDFs gerados pelo relatório | aws-sdk |
| Sentry | Monitoramento de erros | @sentry/node |

---

## 7. Segurança

| Camada | Implementação |
|--------|---------------|
| HTTPS | Obrigatório. HTTP rejeitado com redirect 301 |
| Certificado SSL | Automático via Railway / Let's Encrypt |
| Certificate Pinning | Implementado no app mobile via Expo |
| Credenciais de plataformas | AES-256-GCM. Chave por usuário derivada de master key |
| Dados sensíveis no banco | CPF, telefone, e-mail criptografados com AES-256 |
| Tokens JWT | Secret de 256 bits. Rotação do refresh token a cada uso |
| Rate limiting | 100 req/min por IP (Redis). 20 tentativas de login/hora por CPF |
| CORS | Apenas origens autorizadas. Sem wildcard em produção |
| SQL Injection | Prevenido pelo Prisma (queries parametrizadas) |
| XSS | Sanitização de todos os inputs via class-transformer |
| Logs | NUNCA logar: CPF completo, senha, token, número de cartão, credenciais de plataforma |

---

## 8. Estrutura de Pastas do Repositório

```
rota-financeira/
├── apps/
│   ├── mobile/                  # React Native + Expo
│   │   ├── src/
│   │   │   ├── screens/         # Uma pasta por tela
│   │   │   ├── components/      # Componentes reutilizáveis
│   │   │   ├── store/           # Zustand stores
│   │   │   ├── services/        # Chamadas à API (axios)
│   │   │   ├── utils/           # Helpers e formatadores
│   │   │   └── types/           # Types TypeScript compartilhados
│   │   ├── app.json
│   │   └── package.json
│   │
│   └── backend/                 # NestJS
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/        # Cadastro, login, JWT, OTP
│       │   │   ├── users/       # Perfil, configurações
│       │   │   ├── vehicles/    # Cadastro e edição do veículo
│       │   │   ├── financing/   # Financiamento e meta diária
│       │   │   ├── earnings/    # Ganhos e sync de plataformas
│       │   │   ├── costs/       # Custos (combustível, manutenção, etc)
│       │   │   ├── reports/     # Relatórios e exportação PDF
│       │   │   ├── taxes/       # Cálculo IR e carnê-leão
│       │   │   ├── alerts/      # Engine de alertas e notificações
│       │   │   ├── subscriptions/ # Planos e pagamentos Pagar.me
│       │   │   └── integrations/  # Sync Uber, 99
│       │   ├── common/          # Guards, interceptors, pipes, decorators
│       │   ├── config/          # Configurações por ambiente
│       │   ├── jobs/            # Workers BullMQ
│       │   └── main.ts
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── migrations/
│       └── package.json
│
├── docs/                        # Todos os documentos deste projeto
├── .github/
│   └── workflows/               # CI/CD GitHub Actions
├── docker-compose.yml           # PostgreSQL + Redis local
└── CLAUDE.md                    # Instruções para agentes de IA
```

---

## 9. Ambientes

| Ambiente | Branch | URL Backend | Banco |
|----------|--------|-------------|-------|
| Development | feature/* | localhost:3000 | PostgreSQL local (Docker) |
| Staging | develop | staging-api.rota-financeira.app | PostgreSQL Railway staging |
| Production | main | api.rota-financeira.app | PostgreSQL Railway prod |

---

## 10. Variáveis de Ambiente (lista — valores no Railway Secrets)

```env
# Banco
DATABASE_URL=
REDIS_URL=

# JWT
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=30d

# Criptografia
ENCRYPTION_MASTER_KEY=      # AES-256 para credenciais de plataformas
FIELD_ENCRYPTION_KEY=       # AES-256 para campos sensíveis do banco

# Firebase
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# Pagar.me
PAGARME_API_KEY=
PAGARME_WEBHOOK_SECRET=

# SendGrid
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=

# Sentry
SENTRY_DSN=

# App
NODE_ENV=production
PORT=3000
FRONTEND_URL=              # Para CORS
```
