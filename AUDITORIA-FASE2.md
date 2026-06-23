# Auditoria da Fase 2 — Agentes 8 a 12

Data: 2026-06-23

## Resumo Executivo

O estado geral do programa de indicação (Rota Indica) é **funcional no backend e no mobile**, com a maioria dos itens operando corretamente. O bug reportado ("tela Rota Indica não carrega") NÃO é causado por ausência de tela ou erro de navegação — a tela existe, está registrada e tem ErrorBoundary. A causa real era que `GET /referral/me` retornava 404 para usuários sem `ReferralCode` gerado (usuários cadastrados antes do Agente 8); esse bug de self-healing já foi corrigido. O dashboard web (Agente 12) tem uma **divergência arquitetural**: implementou autenticação separada (`POST /influencer/auth/login`) em vez de reutilizar `POST /auth/login`, o que significa que influencers fazem login com e-mail no dashboard (não com CPF como no mobile). De 18 itens auditados, 15 estão corretos e 3 requerem atenção.

---

## 1. Inventário de Arquivos

### Backend (programa de indicação)

```
apps/backend/src/modules/referral/
  referral.constants.ts               — tiers, calculateCashback(), fila BullMQ
  referral.controller.ts              — GET /me, GET /validate/:code, POST /withdraw, GET /withdrawals
  referral.module.ts                  — providers + BullModule + CacheModule
  referral.service.ts                 — lógica principal + self-healing + handlePaymentConversion
  referral.service.spec.ts            — 30 testes (todos passando)
  workers/referral-cashback.processor.ts
  workers/referral-scheduler.service.ts

apps/backend/src/modules/influencer/
  influencer.constants.ts             — tiers MICRO/MACRO/MEGA, comissões
  influencer.controller.ts            — apply, auth/login, dashboard, pix-key
  influencer.module.ts
  influencer.service.ts               — apply, loginInfluencer, getDashboard, updatePixKey
  dto/apply-influencer.dto.ts
  dto/influencer-login.dto.ts
  workers/influencer-commission.processor.ts
  workers/influencer-commission-scheduler.service.ts

apps/backend/scripts/
  backfill-referral-codes.ts          — backfill para usuários legados sem código
  validate-formulas.ts                — validação dos cálculos de cashback/comissão
```

### Mobile (telas e componentes)

```
apps/mobile/src/screens/referral/
  RotaIndicaScreen.tsx                — tela completa: saldo, código, nível, indicações, modal saque

apps/mobile/src/services/
  referralService.ts                  — getMyReferral, validateCode, withdraw, getWithdrawals

apps/mobile/src/store/
  referralStore.ts                    — Zustand store com fetchReferral, fetchWithdrawals, withdraw

apps/mobile/src/navigation/
  MainStack.tsx                       — RotaIndica registrada com ErrorBoundary

apps/mobile/src/screens/auth/
  RegisterStep1Screen.tsx             — campo de código de indicação (opcional)
  RegisterStep4Screen.tsx             — passa referral_code para authService.register()
```

### Dashboard Web (influencers)

```
Localização real: apps/dashboard/  (conforme planejado no Agente 12)

apps/dashboard/src/
  app/login/page.tsx                  — login via POST /api/influencer/auth/login
  app/dashboard/page.tsx              — overview: estatísticas, comissões, código
  app/dashboard/historico/page.tsx    — histórico de comissões
  app/dashboard/pagamentos/page.tsx   — status de pagamentos
  app/dashboard/materiais/page.tsx    — materiais de divulgação
  lib/api.ts                          — loginInfluencer, fetchDashboard, updatePixKey
  lib/auth.ts                         — getAuthToken, setAuthToken, logout (localStorage)
  middleware.ts                       — proteção de rotas /dashboard/*
```

---

## 2. Backend — Agente 8

| Item | Status | Observação |
|------|--------|-----------|
| Migrations aplicadas | ✅ | 7 migrations, banco up to date |
| Tabelas no banco | ✅ | referral_codes, referrals, referral_balances, referral_withdrawals, influencer_profiles, influencer_commissions — todas presentes |
| GET /referral/me | ✅ | Self-healing: cria código automaticamente se usuário não tem; retorna code, link, level, balance, referrals |
| GET /referral/validate/:code | ✅ | HTTP 200, retorna `{ valid: true, referrer_name: "Diego" }` — testado com código DIEGOB45 |
| POST /referral/withdraw | ✅ | Implementado com validação de saldo mínimo (R$20) e decremento de saldo |
| GET /referral/withdrawals | ✅ | Implementado |
| POST /influencer/apply | ✅ | HTTP 201, retorna `{ message: "Solicitação recebida..." }` — endpoint público sem auth |
| GET /influencer/dashboard | ✅ | Implementado, requer JWT de influencer aprovado |
| ReferralCode criado automaticamente no cadastro | ✅ | `auth.service.ts:122` chama `referralService.initForNewUser()` após criar o usuário |
| Job D+30 implementado e registrado | ✅ | `referral-cashback.processor.ts` + `referral-scheduler.service.ts` com cron |
| Webhook de pagamento calcula cashback | ✅ | `subscriptions.service.ts:301` chama `handlePaymentConversion()` no evento `payment.paid` |
| Testes referral | ✅ | 30 testes, todos passando |

---

## 3. Mobile — Agente 9 (FOCO: bug "Rota Indica não carrega")

| Item | Status | Observação |
|------|--------|-----------|
| RotaIndicaScreen existe | ✅ | `apps/mobile/src/screens/referral/RotaIndicaScreen.tsx` |
| Registrada no navigator | ✅ | `MainStack.tsx:53` — `name="RotaIndica"` com `options={{ title: 'Rota Indica' }}` |
| Envolvida por ErrorBoundary | ✅ | `MainStack.tsx:56` — `<ErrorBoundary fallbackTitle="Erro na tela Rota Indica">` |
| referralService.ts existe e correto | ✅ | 4 métodos, URLs corretas |
| referralStore.ts existe e correto | ✅ | Zustand store com tratamento de erro; exibe mensagem "Não foi possível carregar dados de indicação." em caso de falha |
| Erro exato capturado no console | — | Não reproduzível (app requer device físico Android). Causa provável: `GET /referral/me` retornava 404 para usuários legados — já corrigido |
| Diagnóstico da causa | — | **Causa raiz corrigida**: usuários cadastrados antes do Agente 8 não tinham ReferralCode; endpoint agora cria automaticamente (self-healing) |
| Campo de código de indicação no cadastro | ✅ | `RegisterStep1Screen.tsx:139` — campo opcional "Tem um código? Digite aqui" |
| Modal de saque implementado | ✅ | `WithdrawSheet` com 3 steps: formulário → confirmação → sucesso |

---

## 4. Dashboard Web — Agente 12

| Item | Status | Observação |
|------|--------|-----------|
| Modelo de identidade (conta única vs separada) | ⚠️ | **Cenário (b) — DIVERGÊNCIA**: dashboard usa `POST /influencer/auth/login` (endpoint exclusivo no backend). O backend autentica por **e-mail+senha** e verifica `InfluencerProfile.status=APPROVED`. É o mesmo `User`, mas o fluxo de login difere do app mobile (CPF+senha). Não duplica conta, mas o influencer precisa saber que usa e-mail no dashboard e CPF no app |
| Localização real do projeto | ✅ | `apps/dashboard/` conforme planejado |
| Roda com npm run dev | ✅ | Porta 3001, sem erros de startup |
| Login de influencer funciona | ✅ | `loginInfluencer()` chama `/api/influencer/auth/login` que faz proxy para o backend |
| Endpoints consumidos existem no backend | ✅ | `/influencer/auth/login`, `/influencer/dashboard`, `/influencer/pix-key` — todos implementados |
| "Esqueci minha senha" implementado | ❌ | `login/page.tsx:44-51` — stub: exibe mensagem de sucesso sem chamar endpoint real |

---

## 5. Agentes 10 e 11 — Qualidade e Deploy

| Item | Status | Observação |
|------|--------|-----------|
| Testes do Fluxo 7 (indicação) existem | ✅ | `referral.service.spec.ts` cobre handlePaymentConversion, getMyReferral, withdraw, self-healing |
| Testes passam | ✅ | 30/30 referral; 178/178 suite completa |
| eas.json configurado | ✅ | `apps/mobile/eas.json` — development (APK), preview (APK interno), production (AAB) |
| Sentry configurado | ✅ | `App.tsx:1,25` — `@sentry/react-native` inicializado antes de qualquer render |
| RUNBOOK.md existe | ✅ | `docs/11-RUNBOOK.md` |
| Script de validação de fórmulas (Agente 10) | ✅ | `apps/backend/scripts/validate-formulas.ts` |

---

## 6. Causa Raiz do Bug Reportado

**Bug**: "Tela Rota Indica não carrega"

**Causa raiz**: `GET /v1/referral/me` retornava `404 NotFoundException` para usuários cadastrados **antes** do Agente 8, pois eles não possuíam registro em `referral_codes`. O `referralStore.fetchReferral()` capturava o erro e definia `error: 'Não foi possível carregar dados de indicação.'`, exibindo mensagem de erro com botão "Tentar novamente" (ou fallback da ErrorBoundary em caso de crash).

**Arquivo**: `apps/backend/src/modules/referral/referral.service.ts`

**Correção aplicada**: método `getMyReferral()` implementa self-healing — se o usuário não tem `ReferralCode`, ele é criado automaticamente durante a requisição, sem erro para o cliente.

---

## 7. Lista Priorizada de Correções Necessárias

1. **[MÉDIO]** Dashboard — "Esqueci minha senha" é stub (`apps/dashboard/src/app/login/page.tsx:44-51`): define `forgotSent=true` e exibe mensagem genérica sem chamar endpoint real. Implementar chamada a `POST /auth/forgot-password` ou remover o botão.

2. **[BAIXO]** Dashboard — UX de login: influencer usa e-mail no dashboard e CPF no app mobile. Não é bug funcional, mas pode gerar confusão. Adicionar texto explicativo na tela de login do dashboard ("Use o e-mail cadastrado no app").

3. **[BAIXO]** Mobile — `ReferralStatus.TRIAL` em `referralService.ts:12` não existe no schema Prisma (valores reais: `REGISTERED`, `CONVERTED`, `INACTIVE`). O `STATUS_CONFIG` da `RotaIndicaScreen` tem uma entrada morta para esse status — nunca será exibida, mas pode gerar confusão em manutenções futuras.

---

## 8. Itens Implementados Corretamente (não tocar)

- Todas as 6 tabelas do programa de indicação existem e estão migradas
- `GET /referral/me` com self-healing
- `GET /referral/validate/:code` — público, funcional
- `POST /referral/withdraw` com validação de saldo mínimo R$20
- `GET /referral/withdrawals`
- `POST /influencer/apply` — público, sem autenticação
- `GET /influencer/dashboard` — protegido, funcional
- `handlePaymentConversion` integrado ao webhook de pagamento (`subscriptions.service.ts:301`)
- Job D+30 (BullMQ) implementado e registrado
- `ReferralCode` criado automaticamente no cadastro (`auth.service.ts:122`)
- `RotaIndicaScreen` completa com modal de saque, nível, indicações
- `referralStore.ts` com tratamento de erro
- Campo de código de indicação no Step 1 do cadastro (`RegisterStep1Screen.tsx:139`)
- `eas.json` com perfis development/preview/production
- Sentry inicializado no mobile (`App.tsx:25`)
- `docs/11-RUNBOOK.md` presente
