# Auditoria da Fase 2 — Agentes 8 a 12

Data: 2026-06-22

## Resumo Executivo

O programa de indicação (Rota Indica) tem infraestrutura de backend sólida — banco, migrações, lógica de negócio e testes unitários todos corretos — mas falha por um único bug pontual no controller: `@CurrentUser('id')` passa o objeto `AuthenticatedUser` inteiro onde o service espera uma `string`. Isso derruba os três endpoints autenticados do módulo Referral com HTTP 500. A tela mobile existe, está registrada na navegação e tem tratamento de erro; ela carrega, mas exibe estado de erro em vermelho porque a API retorna 500. O dashboard web do influencer (Agente 12) está funcional em porta 3001 com proxy configurado. Total: **2 itens críticos, 2 itens altos, 17 itens funcionando corretamente**.

---

## 1. Inventário de Arquivos

### Backend — programa de indicação

```
apps/backend/src/modules/referral/
  referral.module.ts
  referral.controller.ts          ← BUG CRÍTICO aqui
  referral.service.ts
  referral.service.spec.ts
  referral.constants.ts
  dto/withdraw.dto.ts
  workers/referral-cashback.processor.ts
  workers/referral-scheduler.service.ts

apps/backend/src/modules/influencer/
  influencer.module.ts
  influencer.controller.ts
  influencer.service.ts
  influencer.constants.ts
  dto/apply-influencer.dto.ts     ← ausência de name/email (diverge da spec)
  dto/influencer-login.dto.ts
  dto/update-pix-key.dto.ts
  workers/influencer-commission-scheduler.service.ts
  workers/influencer-commission.processor.ts

apps/backend/prisma/migrations/
  20260619193731_referral_program/    ← cria 6 tabelas + novos NotificationTypes
  20260622000000_influencer_pix_key/  ← adiciona pix_key ao InfluencerProfile
```

### Mobile — telas e componentes

```
apps/mobile/src/screens/referral/RotaIndicaScreen.tsx   ← tela principal
apps/mobile/src/screens/auth/RegisterStep1Screen.tsx     ← campo de código no cadastro
apps/mobile/src/screens/main/PerfilScreen.tsx            ← menu "Rota Indica"
apps/mobile/src/services/referralService.ts
apps/mobile/src/store/referralStore.ts
apps/mobile/src/navigation/MainStack.tsx                 ← tela registrada com ErrorBoundary
```

### Dashboard Web — influencers

Localização real: `apps/dashboard/` (conforme planejado no Agente 12).
Next.js 14, porta 3001 (`npm run dev -- -p 3001`). Proxy `/api/*` → `http://localhost:3000/v1/*` configurado em `next.config.mjs`.

```
apps/dashboard/src/app/
  layout.tsx
  page.tsx                  ← redireciona para /login se não autenticado
  login/page.tsx            ← tela de login (e-mail + senha)
  dashboard/
    layout.tsx
    page.tsx                ← métricas do mês
    historico/page.tsx
    pagamentos/page.tsx
    materiais/page.tsx
apps/dashboard/src/
  lib/api.ts
  lib/auth.ts
  middleware.ts
  components/StatCard.tsx, TierBadge.tsx, SubscriberChart.tsx
  types/index.ts
```

---

## 2. Backend — Agente 8

| Item | Status | Observação |
|------|--------|-----------|
| Migrations aplicadas (6 total) | ✅ | `npx prisma migrate status` → "Database schema is up to date!" |
| Tabela `referral_codes` existe | ✅ | Confirmado via query ao banco |
| Tabela `referrals` existe | ✅ | |
| Tabela `referral_balances` existe | ✅ | |
| Tabela `referral_withdrawals` existe | ✅ | |
| Tabela `influencer_profiles` existe | ✅ | |
| Tabela `influencer_commissions` existe | ✅ | |
| GET /referral/me | ❌ | **HTTP 500** — causa: `@CurrentUser('id')` passa objeto em vez de string |
| GET /referral/validate/:code | ❌ | **HTTP 401** sem token — falta `@Public()` no controller |
| GET /referral/validate/:code (com token) | ✅ | Retorna `{"valid":false}` corretamente |
| POST /referral/withdraw | ❌ | **HTTP 500** — mesmo bug do `@CurrentUser('id')` |
| GET /referral/withdrawals | ❌ | **HTTP 500** — mesmo bug do `@CurrentUser('id')` |
| POST /influencer/apply | ⚠️ | HTTP 201 quando autenticado e sem name/email. Spec diz `[público]` com name+email no body — divergência |
| GET /influencer/dashboard | ✅ | HTTP 404 para usuário sem perfil (correto) |
| POST /influencer/auth/login | ✅ | HTTP 401 para credenciais inválidas (correto); endpoint é público |
| ReferralCode criado automaticamente no cadastro | ✅ | `auth.service.ts:122` chama `referralService.initForNewUser()` após OTP |
| ReferralBalance criado automaticamente no cadastro | ✅ | Criado na mesma transação do ReferralCode |
| referral_code aceito no body do /auth/register | ✅ | `register.dto.ts` tem `referral_code?: string` |
| processReferralOnRegister chamado no cadastro | ✅ | `auth.service.ts:125-128` |
| Job D+30 implementado e registrado | ✅ | `ReferralSchedulerService.onModuleInit()` agenda via BullMQ diariamente às 3h |
| Webhook de pagamento calcula cashback | ✅ | `subscriptions.service.ts:309` — fire-and-forget para `handlePaymentConversion` |
| 27 testes unitários do ReferralService passam | ✅ | `npm test -- --testPathPattern=referral` → 27/27 PASS |

### Detalhe do Bug Crítico — `@CurrentUser('id')`

**Arquivo:** `apps/backend/src/modules/referral/referral.controller.ts`, linhas 23, 31, 39

```ts
// ERRADO — CurrentUser ignora o argumento 'id' e retorna AuthenticatedUser inteiro
getMyReferral(@CurrentUser('id') userId: string) { ... }

// CORRETO — como faz o InfluencerController (apps/backend/src/modules/influencer/influencer.controller.ts)
getDashboard(@CurrentUser() user: AuthenticatedUser) {
  return this.influencerService.getDashboard(user.sub);
}
```

O decorator `CurrentUser` (em `apps/backend/src/common/decorators/current-user.decorator.ts`) ignora qualquer argumento passado e sempre retorna o objeto `AuthenticatedUser` completo `{ sub: '...', plan: '...' }`. O parâmetro `_data: unknown` nunca é usado. Portanto, `userId` em runtime é um objeto, e quando o Prisma tenta `findUnique({ where: { user_id: userId } })` com um objeto onde espera string, lança exceção interna → HTTP 500.

---

## 3. Mobile — Agente 9 (FOCO: bug "Rota Indica não carrega")

| Item | Status | Observação |
|------|--------|-----------|
| `RotaIndicaScreen` existe | ✅ | `apps/mobile/src/screens/referral/RotaIndicaScreen.tsx` |
| Registrada no navigator | ✅ | `MainStack.tsx:53` — `name="RotaIndica"`, title="Rota Indica" |
| Envolvida por ErrorBoundary | ✅ | `MainStack.tsx:56` — `<ErrorBoundary fallbackTitle="Erro na tela Rota Indica">` |
| `referralService.ts` existe e correto | ✅ | Todos os 4 métodos com endpoints corretos |
| `referralStore.ts` existe e correto | ✅ | Tem tratamento de erro + conversão de Decimal para number |
| Tela carrega e renderiza | ✅ | A tela é alcançada, monta e executa `fetchReferral()` |
| Tela mostra conteúdo útil | ❌ | Mostra `AlertBox` vermelho: "Não foi possível carregar dados de indicação." |
| Campo de código de indicação no cadastro | ✅ | `RegisterStep1Screen.tsx` — input com validação debounced via `referralService.validateCode()` |
| Validação do código funciona sem token | ❌ | `GET /referral/validate/:code` exige token — mas no cadastro o usuário ainda não está autenticado |
| Modal de saque implementado | ✅ | `WithdrawSheet` no próprio `RotaIndicaScreen.tsx` com steps form/confirm/success |

### Erro exato capturado — causa raiz do bug

**Comportamento:** ao abrir "Rota Indica" no menu do Perfil, a tela carrega, exibe skeleton por ~1s, depois mostra:

```
[AlertBox vermelho] "Não foi possível carregar dados de indicação."
[Botão] "Tentar novamente"
```

**Causa raiz — cadeia completa:**

1. `RotaIndicaScreen` monta e chama `useReferralStore().fetchReferral()`
2. `fetchReferral` chama `referralService.getMyReferral()` → `GET /api/referral/me`
3. Backend recebe a request, extrai `user` via JWT
4. `ReferralController.getMyReferral(@CurrentUser('id') userId)` — `userId` = objeto `{ sub: 'uuid', plan: 'PRO' }` (não string)
5. `ReferralService.getMyReferral(userId)` chama `prisma.referralCode.findUnique({ where: { user_id: userId } })` com objeto → Prisma lança exceção
6. Backend retorna **HTTP 500** `{"statusCode":500,"error":"INTERNAL_SERVER_ERROR","message":"Erro interno do servidor"}`
7. `referralStore.fetchReferral` cai no `catch` → `set({ isLoading: false, error: 'Não foi possível carregar dados de indicação.' })`
8. `RotaIndicaScreen` exibe o estado de erro

**Arquivo + linha da correção:**
`apps/backend/src/modules/referral/referral.controller.ts` — 3 ocorrências de `@CurrentUser('id') userId: string`.

---

## 4. Dashboard Web — Agente 12

| Item | Status | Observação |
|------|--------|-----------|
| Localização real do projeto | ✅ | `apps/dashboard/` (conforme planejado) |
| Roda com `npm run dev` | ✅ | Porta 3001, sem erros na inicialização |
| Proxy `/api/*` → backend configurado | ✅ | `next.config.mjs` com rewrites para `http://localhost:3000/v1/*` |
| Rota `/` redireciona para `/login` | ✅ | HTTP 307 — middleware funciona |
| Página `/login` carrega | ✅ | HTTP 200, form com e-mail + senha |
| Login de influencer (`POST /influencer/auth/login`) | ✅ | Endpoint público e funcional |
| Login exige influencer APPROVED | ✅ | Status PENDING retorna 403 Forbidden |
| `GET /influencer/dashboard` existe no backend | ✅ | Retorna HTTP 404 para usuário sem perfil (esperado) |
| Dashboard acessível para influencer aprovado | ⚠️ | Não testável sem influencer com status=APPROVED no banco |
| Histórico de comissões (`/dashboard/historico`) | ✅ | Página existe |
| Pagamentos (`/dashboard/pagamentos`) | ✅ | Página existe |
| Materiais (`/dashboard/materiais`) | ✅ | Página existe |

---

## 5. Agentes 10 e 11 — Qualidade e Deploy

| Item | Status | Observação |
|------|--------|-----------|
| Testes E2E do Fluxo 7 (indicação) existem | ❌ | Nenhum arquivo `.e2e-spec.ts` ou teste de integração para referral encontrado |
| Testes unitários do ReferralService passam | ✅ | 27/27 passando |
| Testes unitários do SubscriptionsService passam | ✅ | 14/14 passando (inclui webhook) |
| `eas.json` configurado | ✅ | `apps/mobile/eas.json` — perfis development/preview/production completos |
| Sentry configurado — backend | ✅ | `apps/backend/src/main.ts:13-15` — `Sentry.init()` antes de qualquer coisa |
| Sentry configurado — mobile | ❌ | Sem referência ao Sentry em `App.tsx` ou `app.config.ts` |
| `RUNBOOK.md` existe | ❌ | Não encontrado na raiz ou em docs/ |
| `AUDIT-CALCULOS.md` existe | ❌ | Não encontrado; existe `DIAGNOSTIC-REPORT.md` de QA anterior (pré-agentes 8-12) |

---

## 6. Causa Raiz do Bug Reportado

**"Rota Indica não carrega"** — causa única: `@CurrentUser('id') userId: string` no `ReferralController`.

**Arquivo:** `apps/backend/src/modules/referral/referral.controller.ts`
**Linhas afetadas:** 23 (`getMyReferral`), 31 (`getWithdrawals`), 39 (`withdraw`)

O decorator `CurrentUser` **nunca extrai um campo específico** — ignora qualquer argumento e retorna o objeto JWT completo. Os três endpoints passam esse objeto como `userId` string para o service, que repassa ao Prisma como `user_id`. O Prisma falha → 500 → store seta `error` → tela mostra alertbox vermelho.

**Correção em 3 linhas** (trocar o padrão do InfluencerController):
```ts
// Antes (errado):
getMyReferral(@CurrentUser('id') userId: string)  → referralService.getMyReferral(userId)

// Depois (correto):
getMyReferral(@CurrentUser() user: AuthenticatedUser) → referralService.getMyReferral(user.sub)
```

**Segundo bug** (impede cadastro com código de indicação): `GET /referral/validate/:code` sem `@Public()` retorna 401 para usuário não autenticado. Durante o cadastro, o usuário ainda não tem token. O campo de código no `RegisterStep1Screen` chama esse endpoint em debounce; a request retorna 401 silenciosamente e o campo nunca mostra o nome do indicador.

---

## 7. Lista Priorizada de Correções Necessárias

1. **[CRÍTICO]** `referral.controller.ts` — corrigir as 3 ocorrências de `@CurrentUser('id') userId: string` → `@CurrentUser() user: AuthenticatedUser` e trocar `userId` por `user.sub` no corpo de cada método. Restaura `GET /referral/me`, `GET /referral/withdrawals` e `POST /referral/withdraw` (HTTP 500 → 200/201).

2. **[CRÍTICO]** `referral.controller.ts`, método `validateCode` — adicionar decorator `@Public()` (importar de `../../common/decorators/public.decorator`). Sem isso, a validação de código no cadastro falha silenciosamente (401).

3. **[ALTO]** `influencer.controller.ts`, método `apply` — decidir e alinhar com spec: se deve ser público (adicionar `@Public()` + remover `@CurrentUser()` + adicionar `name`/`email` ao DTO), ou deixar autenticado (atualizar `docs/04-API-SPEC.md` removendo `[público]` e documentando que requer auth).

4. **[MÉDIO]** Sentry mobile não configurado — adicionar `@sentry/react-native` ao `App.tsx` antes do primeiro render (similar ao que foi feito no backend).

5. **[MÉDIO]** Criar RUNBOOK.md com procedimentos de operação (inicialização, restart do backend, como processar job D+30 manualmente, como aprovar influencer).

6. **[BAIXO]** Adicionar testes E2E do Fluxo 7 (fluxo completo: cadastro com código → webhook payment.paid → cashback pendente → D+30 → saque).

---

## 8. Itens Implementados Corretamente (não tocar)

1. **Schema + migrations**: todas 6 tabelas criadas com constraints corretos; tipos `CASHBACK_PENDING` e `CASHBACK_AVAILABLE` adicionados ao enum `NotificationType`
2. **`ReferralService`** completo: `initForNewUser`, `processReferralOnRegister`, `handlePaymentConversion`, `releaseD30Cashback`, `getMyReferral`, `validateCode`, `withdraw`, `getWithdrawals` — todos seguem as regras de docs/06-BUSINESS-RULES.md seção 16
3. **Integração cadastro → ReferralCode**: `auth.service.ts` chama `initForNewUser()` após verificação OTP e `processReferralOnRegister()` se código foi informado
4. **Job D+30**: `ReferralSchedulerService` com cron `0 3 * * *` via BullMQ — muda `pending → available` e envia push notification
5. **Webhook payment.paid → cashback**: `subscriptions.service.ts:309` chama `handlePaymentConversion` como fire-and-forget
6. **27 testes unitários do ReferralService** — cobrem cálculo de cashback, níveis, trials, conversão, saques; todos passando
7. **`RotaIndicaScreen`**: UI completa com hero de saldo, código + link + WhatsApp, tabela de níveis, lista de indicados, `WithdrawSheet` com 3 steps
8. **`referralStore`**: tratamento de erro, conversão de Decimal para number, fetch paralelo de referral + withdrawals
9. **Campo de código no cadastro** (`RegisterStep1Screen`): input com debounce de 600ms, validação visual, passa `referral_code` no body do register
10. **Dashboard web** (`apps/dashboard/`): Next.js 14 porta 3001, proxy configurado, login funcional, middleware de auth, 4 páginas implementadas
11. **`eas.json`**: perfis development/preview/production com configurações corretas para Android e iOS
12. **Sentry backend**: inicializado em `main.ts` antes de qualquer outro módulo
13. **`POST /influencer/auth/login`**: endpoint público, autentica por e-mail + senha, verifica `status=APPROVED`
14. **`POST /influencer/apply`**: funciona quando autenticado — calcula tier por followers, salva perfil, retorna tier e commission_rate
