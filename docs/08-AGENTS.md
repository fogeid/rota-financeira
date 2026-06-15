# Rota Financeira — Agentes de Desenvolvimento e Suas Responsabilidades

**Versão:** 1.0 | **Data:** Junho 2026

---

## Visão Geral

O desenvolvimento do Rota Financeira é dividido em 7 agentes especializados. Cada agente tem escopo exclusivo, documentos que deve ler, o que pode e o que não pode fazer.

---

## AGENTE 1 — Backend Core

**Responsabilidade:** Infraestrutura base do NestJS, autenticação e módulo de usuários.

**Lê obrigatoriamente:**
- docs/02-TECH-STACK.md
- docs/03-DATABASE-SCHEMA.md
- docs/04-API-SPEC.md (módulos Auth e Users)
- docs/05-SECURITY.md (completo)
- CLAUDE.md

**Entrega:**
- Setup do projeto NestJS com TypeScript strict
- docker-compose.yml com PostgreSQL + Redis
- Prisma schema completo + primeira migration
- Módulo Auth: register, verify-otp, login, refresh, logout, forgot-password, reset-password
- Módulo Users: perfil, editar, trocar senha, trocar telefone, biometria, excluir conta
- Guards JWT, interceptors de log (sem dados sensíveis), pipes de validação global
- Rate limiting com Redis
- Middleware de segurança (Helmet, CORS)
- Criptografia AES-256 para campos sensíveis
- Swagger configurado em /docs

**Não faz:**
- Nenhum módulo de negócio (ganhos, custos, etc)
- Integração com Pagar.me
- Sync com Uber/99
- Nenhuma tela mobile

**Testes obrigatórios:**
- Cadastro com CPF válido e inválido
- Login com credenciais corretas e incorretas
- Bloqueio após 5 tentativas
- Refresh token rotation
- OTP expirado e código errado
- Criptografia e decriptografia de CPF
- Exclusão de conta (soft delete)

---

## AGENTE 2 — Backend Financeiro

**Responsabilidade:** Módulos de ganhos, custos, metas, relatórios, impostos e regras de negócio.

**Lê obrigatoriamente:**
- docs/01-PRD.md (seções 5.3 a 5.8)
- docs/03-DATABASE-SCHEMA.md
- docs/04-API-SPEC.md (módulos Earnings, Costs, Reports, Taxes)
- docs/06-BUSINESS-RULES.md (completo — crítico)
- CLAUDE.md

**Entrega:**
- Módulo Earnings: CRUD + summary
- Módulo Costs: CRUD todos os tipos (fuel, maintenance, wash, other) + summary + custo/km
- Módulo Financing: CRUD + cálculo de meta + progresso da parcela
- Módulo Goals: cálculo e persistência da meta mensal
- Módulo Reports: relatório mensal, comparativo, projeção, PDF, anual
- Módulo Taxes: cálculo IR com tabela progressiva 2026, deduções, histórico

**Validações críticas (não simplificar):**
- Meta diária exatamente conforme docs/06-BUSINESS-RULES.md seção 1
- Lucro líquido conforme seção 2
- Custo/km conforme seção 3
- IR conforme seção 8 com tabela progressiva completa

**Não faz:**
- Autenticação
- Integrações externas
- Notificações
- Pagamentos

**Testes obrigatórios:**
- Meta diária: valores normais, zeros, extremos
- IR: todas as faixas da tabela progressiva
- Custo/km: sem abastecimentos, sem km rodados
- Progresso da parcela: <100%, =100%, >100%
- Projeção: <3 meses de histórico, exatamente 3 meses

---

## AGENTE 3 — Backend Integrações e Alertas

**Responsabilidade:** Sync com Uber/99, engine de alertas, notificações push.

**Lê obrigatoriamente:**
- docs/04-API-SPEC.md (módulos Integrations e Alerts)
- docs/05-SECURITY.md (seções 3, 7)
- docs/06-BUSINESS-RULES.md (seções 11, 12)
- CLAUDE.md

**Entrega:**
- Módulo Integrations: connect, status, sync manual, disconnect
- Criptografia AES-256-GCM com chave derivada por usuário para credenciais
- Worker BullMQ de sync diário às 04h com retry exponencial
- Deduplicação de corridas por external_id
- Módulo Alerts: engine de verificação de condições, scheduling
- Integração Firebase FCM para envio de push
- Módulo Notifications: CRUD de notificações, preferências de alerta

**Regras críticas de segurança:**
- Credenciais NUNCA logadas
- Credenciais NUNCA retornadas pela API
- Credenciais decriptadas apenas em memória durante sync
- Removidas imediatamente ao desconectar

**Não faz:**
- Lógica de cálculo financeiro
- Autenticação de usuários
- Pagamentos

**Testes obrigatórios:**
- Criptografia e decriptografia de credenciais
- Sync bem-sucedido cria corridas sem duplicata
- Retry após falha (3 tentativas, backoff exponencial)
- Alerta F65 disparado exatamente quando lucro >= meta
- Alerta F67 não disparado quando dias_restantes > 5
- Preferências de alerta respeitadas

---

## AGENTE 4 — Backend Pagamentos

**Responsabilidade:** Integração Pagar.me, assinaturas, webhooks, e-mails.

**Lê obrigatoriamente:**
- docs/01-PRD.md (seção 5.11)
- docs/04-API-SPEC.md (módulo Subscriptions)
- docs/05-SECURITY.md (seção 7)
- docs/06-BUSINESS-RULES.md (seção 13)
- CLAUDE.md

**Entrega:**
- Módulo Subscriptions: planos, subscribe cartão, subscribe PIX, cancelar, reativar
- Webhook handler com validação HMAC-SHA256 obrigatória
- Tratamento de eventos: payment.paid, payment.failed, subscription.canceled
- Lógica de retry de pagamento (D+0, D+2, D+4, D+5 downgrade)
- Integração SendGrid: e-mail de boas-vindas, recibo, trial expirando, falha de pagamento
- Controle de acesso por plano (guard PlanGuard)
- Trial 14 dias automático no cadastro

**Regras críticas:**
- NUNCA tocar no número do cartão — apenas token do Pagar.me
- Validar SEMPRE a assinatura do webhook antes de processar
- Usar crypto.timingSafeEqual para comparação de HMAC

**Não faz:**
- Interface de pagamento (tokenização é no mobile via SDK Pagar.me)
- Reembolsos sem aprovação manual
- Qualquer cálculo financeiro

**Testes obrigatórios:**
- Webhook com assinatura válida e inválida
- Trial ativado no cadastro
- Downgrade após 3 falhas de pagamento
- Acesso bloqueado para usuário FREE em endpoint Pro
- Cancelamento mantém acesso até fim do período

---

## AGENTE 5 — Mobile Core e Autenticação

**Responsabilidade:** Setup do app, design system, telas de auth e onboarding.

**Lê obrigatoriamente:**
- docs/02-TECH-STACK.md
- docs/07-UI-SPEC.md (completo)
- docs/04-API-SPEC.md (módulos Auth e Users)
- CLAUDE.md

**Entrega:**
- Setup React Native + Expo + TypeScript strict
- Design system completo: todos os componentes de docs/07-UI-SPEC.md
- Expo SecureStore para tokens (NUNCA AsyncStorage para dados sensíveis)
- Axios com interceptors: refresh token automático, tratamento de 401
- Zustand: store de auth, store de usuário
- Telas: Splash, Login, Cadastro (4 steps), OTP, Tutorial (4 slides), Recuperar senha
- Tab bar inferior com 6 abas
- Biometria (Face ID / Touch ID)
- Navegação: React Navigation 6

**Design — regras críticas:**
- Seguir EXATAMENTE os tokens de docs/07-UI-SPEC.md
- Referência visual: rota-financeira-app.html
- NUNCA usar tema claro
- NUNCA usar AsyncStorage para tokens

**Não faz:**
- Nenhuma tela de negócio (home, ganhos, etc)
- Chamadas à API que não sejam auth/users

**Testes obrigatórios:**
- Cadastro com CPF válido e inválido
- OTP correto e expirado
- Login com biometria
- Refresh token automático quando access expira
- Logout limpa SecureStore completamente

---

## AGENTE 6 — Mobile Negócio

**Responsabilidade:** Todas as telas de negócio do app.

**Lê obrigatoriamente:**
- docs/01-PRD.md (seções 5.2 a 5.10)
- docs/07-UI-SPEC.md (seções 3, 4, 5, 6)
- docs/04-API-SPEC.md (todos os módulos exceto Auth e Subscriptions)
- docs/06-BUSINESS-RULES.md (para validações no client)
- CLAUDE.md

**Entrega:**
- Tela Home: todos os elementos de docs/07-UI-SPEC.md seção 5
- Tela Ganhos: lista, filtros, resumo, gráfico
- Tela Custos: lista, FAB, bottom sheet de cadastro (4 tipos, 3 steps)
- Tela Meu Carro: painel financiamento, meta, distribuição, progresso, semana
- Tela Relatórios: mensal, comparativo, projeção, botão PDF
- Tela Impostos: cálculo, card reserva, histórico, guia
- Tela Alertas: lista de notificações
- Zustand stores: earnings, costs, financing, reports, notifications

**Regras de exibição:**
- Valores monetários: sempre "R$ X.XXX,XX"
- Custos: "- R$ X" em vermelho
- CPF: NUNCA exibir completo
- Estados de loading: skeleton screens (NUNCA spinner central)
- Estados vazios: conforme docs/07-UI-SPEC.md seção 6

**Não faz:**
- Design system (feito pelo Agente 5)
- Telas de auth
- Telas de assinatura
- Lógica de cálculo (vem da API)

---

## AGENTE 7 — Mobile Assinatura e Deploy

**Responsabilidade:** Fluxo de assinatura, perfil, configurações e pipeline de deploy.

**Lê obrigatoriamente:**
- docs/01-PRD.md (seções 5.10, 5.11)
- docs/07-UI-SPEC.md (tela Perfil)
- docs/04-API-SPEC.md (módulos Users e Subscriptions)
- CLAUDE.md

**Entrega:**
- Tela Upgrade: comparativo de planos, CTA
- Fluxo de pagamento: cartão (tokenização Pagar.me SDK) e PIX (QR Code com countdown)
- Tela Perfil completa: dados pessoais, veículo, financiamento, plataformas, assinatura, alertas, suporte, excluir conta
- PlanGuard no client: bloquear funcionalidades Pro para FREE com tela de upgrade
- GitHub Actions CI/CD: lint → test → build → deploy Railway (backend) + EAS Build (mobile)
- Configuração de ambientes: dev, staging, prod
- EAS Build configurado para Android + iOS
- Scripts de deploy documentados

**Não faz:**
- Lógica de cobrança (é no backend)
- Nenhuma tela de negócio principal

---

## Ordem de Execução Recomendada

```
FASE 1 — Fundação (paralelo)
├── Agente 1: Backend Core (auth, users, infraestrutura)
└── Agente 5: Mobile Core (setup, design system, auth)

FASE 2 — Negócio (após Fase 1)
├── Agente 2: Backend Financeiro
├── Agente 3: Backend Integrações e Alertas
└── Agente 6: Mobile Negócio (pode começar com mocks da API)

FASE 3 — Monetização e Deploy (após Fase 2)
├── Agente 4: Backend Pagamentos
└── Agente 7: Mobile Assinatura e Deploy
```

---

## Protocolo de Handoff entre Agentes

Antes de iniciar qualquer fase posterior, o agente anterior deve:

1. Todos os testes passando (`npm test`)
2. Swagger atualizado (backend) ou Storybook (mobile)
3. `.env.example` atualizado com novas variáveis
4. Migrations aplicadas no banco de staging
5. PR aprovado em `develop`
6. Documento de "o que foi feito e o que falta" no PR description

---

## O que fazer se encontrar conflito entre documentos

Hierarquia de confiança:
1. CLAUDE.md (regras absolutas)
2. docs/05-SECURITY.md (segurança é inegociável)
3. docs/06-BUSINESS-RULES.md (fórmulas são exatas)
4. docs/01-PRD.md (escopo do produto)
5. docs/04-API-SPEC.md (contrato da API)
6. docs/03-DATABASE-SCHEMA.md (estrutura dos dados)
7. docs/07-UI-SPEC.md (visual)

Em caso de conflito: **parar, documentar o conflito e aguardar resolução.** Nunca resolver por conta própria.
