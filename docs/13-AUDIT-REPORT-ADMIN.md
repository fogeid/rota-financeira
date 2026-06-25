# Rota Financeira — Relatório de Auditoria: Painel Administrativo (Agente 13)

**Data:** 2026-06-25
**Branch:** docs/auditoria-fase2
**Escopo:** Módulo Admin — autenticação isolada, roles, auditoria, endpoints de gestão

---

## 1. Resumo Executivo

A auditoria cobriu segurança, isolamento de autenticação, conformidade com roles, cobertura de
testes e alinhamento com a spec em `docs/12-ADMIN-PANEL.md`. Foram encontradas e corrigidas
**2 regressões menores** de TypeScript strict mode (propriedades sem `!` em DTOs). Nenhum bug
de segurança ou divergência de regra de negócio foi identificado. 201 testes passando.

---

## 2. Auditoria de Segurança

### 2.1 Isolamento do token admin ✅ APROVADO

`AdminJwtStrategy` registrado com nome `'admin-jwt'` (diferente de `'jwt'` do app).
Payload inclui `type: 'admin'`; o método `validate()` rejeita qualquer token sem esse claim:

```typescript
// admin-jwt.strategy.ts:24
if (payload.type !== 'admin') {
  throw new UnauthorizedException('Token inválido para esta área');
}
```

Um token de usuário comum (`type` ausente ou diferente) é rejeitado com 401 antes de chegar
a qualquer endpoint admin.

### 2.2 Secret JWT independente ✅ APROVADO

`AdminAuthService.login()` assina tokens com `ADMIN_JWT_SECRET` via
`this.config.getOrThrow<string>('ADMIN_JWT_SECRET')` — completamente separado de
`JWT_ACCESS_SECRET` usado pelo app. `JwtModule.register({})` no `AdminModule` não preconfigura
nenhum secret; cada chamada `.sign()` injeta o secret explicitamente.

### 2.3 Bypass do guard global de usuários ✅ APROVADO

`AdminController` usa `@Public()` (skip do `JwtAuthGuard` global) combinado com
`@UseGuards(AdminJwtGuard, AdminRolesGuard)` explícito. Isso garante que:
- Um token de usuário não é aceito em rotas `/admin/*` (falha no `AdminJwtStrategy`)
- Um token admin não é processado pelo `JwtAuthGuard` do app

### 2.4 Rate limiting no login admin ✅ APROVADO

```typescript
// admin-auth.service.ts
const ADMIN_LOGIN_MAX_ATTEMPTS = 5;
const ADMIN_LOGIN_BLOCK_SECONDS = 15 * 60;
```

Chaves Redis separadas do fluxo de usuário: `admin:login:attempts:{email}` e
`admin:blocked:{email}`. HTTP 429 com `retry_after_seconds` no body. Conforme
`docs/12-ADMIN-PANEL.md` seção 6.

### 2.5 Dados sensíveis em GET /admin/users ✅ APROVADO

`admin.service.ts:116-123` aplica `maskCpf()`, `maskPhone()`, `maskEmail()` antes de
retornar qualquer registro de usuário. O campo bruto `cpf` nunca aparece na resposta.
Busca por CPF/e-mail/telefone usa hash (`encryption.hash()`), não o valor em claro.

### 2.6 Endpoint financeiro de escrita limitado ✅ APROVADO

`PATCH /admin/withdrawals/:id/mark-paid` apenas altera `status → PAID` e `processed_at`.
Não há campo de valor livre. `PATCH /admin/influencers/:id/tier` aceita apenas o enum
`InfluencerTier`; `commission_rate` é derivado internamente por `getDefaultCommissionRate(tier)`
sem input externo. Conforme decisão definitiva da seção 5 do spec.

---

## 3. Regressões Encontradas e Corrigidas

### Fix 1 — `AdminLoginDto` sem definite assignment assertion ❌→✅ CORRIGIDO

**Arquivo:** `apps/backend/src/modules/admin/admin-auth.controller.ts`

```typescript
// Antes (TypeScript strict mode warning):
email: string;
password: string;

// Depois:
email!: string;
password!: string;
```

### Fix 2 — `UpdateTierDto` sem definite assignment assertion ❌→✅ CORRIGIDO

**Arquivo:** `apps/backend/src/modules/admin/admin.controller.ts`

```typescript
// Antes:
tier: InfluencerTier;

// Depois:
tier!: InfluencerTier;
```

---

## 4. Validação de Roles e Endpoints

### 4.1 Mapa de acesso implementado vs spec ✅ CORRETO

| Endpoint | Roles na spec | Roles implementadas |
|---|---|---|
| POST /admin/auth/login | público | `@Public()` sem guard |
| GET /admin/dashboard/overview | SUPER_ADMIN | `@AdminRoles(SUPER_ADMIN)` |
| GET /admin/users/* | SA, SD, SDI | `@AdminRoles(SA, SD, SDI)` |
| PATCH /admin/users/:id/deactivate | SA, SD, SDI | `@AdminRoles(SA, SD, SDI)` |
| PATCH /admin/users/:id/reactivate | SA, SD, SDI | `@AdminRoles(SA, SD, SDI)` |
| GET /admin/influencers/* | SA, SI, SDI | `@AdminRoles(SA, SI, SDI)` |
| PATCH /admin/influencers/:id/approve | SA, SI, SDI | `@AdminRoles(SA, SI, SDI)` |
| PATCH /admin/influencers/:id/reject | SA, SI, SDI | `@AdminRoles(SA, SI, SDI)` |
| PATCH /admin/influencers/:id/suspend | SA, SI, SDI | `@AdminRoles(SA, SI, SDI)` |
| PATCH /admin/influencers/:id/tier | SUPER_ADMIN | `@AdminRoles(SA)` |
| GET /admin/withdrawals/* | SUPER_ADMIN | `@AdminRoles(SA)` |
| PATCH /admin/withdrawals/:id/mark-paid | SUPER_ADMIN | `@AdminRoles(SA)` |
| GET /admin/commissions | SUPER_ADMIN | `@AdminRoles(SA)` |
| GET /admin/audit-logs | Todas (com restrição de visão) | Sem `@AdminRoles`, restrição no service |

_SA = SUPER_ADMIN, SD = SUPPORT_DRIVER, SI = SUPPORT_INFLUENCER, SDI = SUPPORT_DRIVER_INFLUENCER_

### 4.2 Restrição de auditoria por role ✅ CORRETO

`admin.service.ts:386-391` — SUPPORT_* ignora qualquer `admin_id` passado na query e
força `where.admin_id = currentAdmin.id`. SUPER_ADMIN pode filtrar livremente por qualquer
`admin_id`.

### 4.3 Delegação correta de transições influencer ✅ CORRETO

`approveInfluencer` chama `InfluencerService.approveInfluencer()` (não reimplementa a lógica
de desativar o código de motorista).  
`rejectInfluencer` e `suspendInfluencer` chamam `InfluencerService.suspendOrRejectInfluencer()`
(não reimplementam a lógica de reativar o código).  
Nenhuma duplicação de regra de transição motorista↔influencer.

---

## 5. Validação do Schema e Migration

### 5.1 Schema vs spec ✅ CORRETO

| Campo | Spec | Migration |
|---|---|---|
| `admin_users.role` default | `SUPPORT_DRIVER` | `DEFAULT 'SUPPORT_DRIVER'` |
| `admin_audit_logs.action` | VARCHAR(100) | `VARCHAR(100)` |
| `admin_audit_logs.target_type` | VARCHAR(50) | `VARCHAR(50)` |
| `admin_audit_logs.details` | Json? | `JSONB` |
| FK `admin_id → admin_users.id` | ON DELETE RESTRICT | `ON DELETE RESTRICT` |

Índices criados: `(admin_id, created_at)` e `(target_type, target_id)` — conforme schema spec.

---

## 6. Cobertura de Testes

```
Test Suites: 14 passed, 14 total
Tests:       201 passed, 201 total
```

14 novos testes em `admin.service.spec.ts`:

| Grupo | Casos testados |
|---|---|
| `getDashboardOverview` | Retorna métricas agregadas corretamente |
| `listUsers` | Paginação, CPF/phone/email nunca em claro |
| `approveInfluencer` | Delega ao InfluencerService + gera audit log |
| `rejectInfluencer` | Chama `suspendOrReject` com REJECTED + log com reason |
| `suspendInfluencer` | Chama `suspendOrReject` com SUSPENDED + log com reason |
| `updateInfluencerTier` | Atualiza tier + commission_rate + log com estado anterior |
| `markWithdrawalPaid` | Status → PAID + processed_at + log com amount |
| `getAuditLogs` | SUPER_ADMIN filtra por outro admin; SUPPORT_* ignora filtro externo |
| `deactivateUser` | is_active → false + audit log |
| `AdminRolesGuard` | Bloqueia SD em financeiro; bloqueia SI em PATCH tier; permite SDI em usuários; permite sem roles declaradas |

---

## 7. Checklist Final

- [x] Token admin usa secret próprio (`ADMIN_JWT_SECRET`) separado do app
- [x] `AdminJwtStrategy` rejeita qualquer token sem `type: 'admin'`
- [x] Rate limiting Redis: 5 tentativas / 15 min por email
- [x] CPF, telefone e e-mail sempre mascarados nas respostas
- [x] Busca de usuário por CPF/e-mail/telefone usa hash, nunca plaintext
- [x] Nenhum endpoint aceita valor monetário livre
- [x] `commission_rate` derivado de `tier` pelo sistema, nunca input externo
- [x] Transições influencer delegadas ao `InfluencerService` (sem duplicação)
- [x] Log de auditoria em todos os endpoints de escrita
- [x] SUPPORT_* só acessa o próprio histórico de auditoria
- [x] Migration com índices corretos, FK com ON DELETE RESTRICT
- [x] Seed script com `upsert` idempotente, senha placeholder documentada
- [x] 201 testes unitários passando
- [x] TypeScript strict mode: definite assignment assertions corrigidas

---

## 8. Itens Fora do Escopo desta Auditoria

- **Frontend do admin** (`/admin/*` no Next.js dashboard): especificado em `docs/12-ADMIN-PANEL.md`
  mas não implementado nesta fase — requer agente dedicado
- **Refresh token do admin**: endpoint de renovação não implementado (sem spec dedicada);
  aceitar expiração de 15 min como comportamento atual
- **Exportação de relatórios**: fora do MVP conforme seção 5 do spec

---

*Relatório gerado por Agente Auditoria Fase 2 — Rota Financeira v1.0*
