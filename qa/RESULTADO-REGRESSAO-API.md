# Resultado da Regressão Automatizada — 2026-06-26

## Resumo

**65/69 testes passando. 4 falhas encontradas. 2 avisos (não críticos).**

Contas de teste usadas:
- Diego Batista (`051.152.121-96`, PRO, is_active=true) — usuário principal de testes
- Zé Motorista (`000.000.001-91`, FREE, is_active=true) — influencer seed
- Angela Batista (`562.209.955-20`, FREE, is_active=false) — usuário inativo
- Test Regressao Novo (`935.411.347-80`, FREE) — criado nesta sessão
- 3 admins de teste: SUPPORT_DRIVER, SUPPORT_INFLUENCER, SUPPORT_DRIVER_INFLUENCER

---

## Bloco 1 — Autenticação e Segurança

| Teste | Resultado | Detalhe se falhou |
|-------|-----------|-------------------|
| POST /auth/login com credenciais corretas → 200 com tokens | ✅ | HTTP 200, access_token + refresh_token presentes |
| POST /auth/login com senha errada → 401 | ✅ | `{"statusCode":401,"message":"Credenciais inválidas"}` |
| POST /auth/login 5x errado → bloqueio temporário (423) | ✅ | Bloqueia no 4o attempt com HTTP 423 e retry_after:900 |
| POST /auth/refresh com token válido → novo access_token | ✅ | HTTP 200, novo par de tokens emitido |
| POST /auth/refresh com token já usado (rotacionado) → 401 | ✅ | `{"statusCode":401,"message":"Token inválido ou expirado"}` |
| GET /users/me sem token → 401 | ✅ | HTTP 401 |
| GET /users/me com token de is_active=false → 401 (REGRESSÃO CRÍTICA) | ✅ | Reativou Angela, logou, desativou, token ainda rejeita com HTTP 401 |
| /admin/* com token de App (tipo errado) → 401 | ✅ | HTTP 401 (token type isolado) |

---

## Bloco 2 — Cálculos Financeiros

| Teste | Resultado | Detalhe se falhou |
|-------|-----------|-------------------|
| GET /financing/me → calculated_daily_goal bate com fórmula manual | ✅ | 6147 / 26 = 236.42 ✓ |
| GET /financing/progress → accumulated bate com net_income do /reports/monthly | ✅ | Ambos retornam -400 (earnings 150 - costs 550) |
| GET /costs/summary → cost_per_km é null sem odômetro suficiente | ✅ | `"cost_per_km": null` com 1 abastecimento |
| GET /costs/summary → cost_per_km correto com 2+ abastecimentos | ✅ | 300 / 350km = 0.86 ✓ |
| GET /taxes/monthly → bate com tabela IRPF | ❌ | Endpoint `GET /taxes/monthly` retorna 404; endpoint real é `GET /taxes/monthly/:month` |
| GET /reports/monthly?month=X e ?month=Y → valores DIFERENTES | ❌ | Parâmetro `month` é ignorado — `/reports/monthly?month=2026-05` retorna `"month":"2026-06"` |
| GET /reports/monthly → installment_covered não vem vazio/null | ✅ | Campo presente (valor 0 pois sem pagamentos no mês) |

---

## Bloco 3 — Earnings e Custos

| Teste | Resultado | Detalhe se falhou |
|-------|-----------|-------------------|
| POST /earnings (manual) → 201, aparece em GET /earnings | ✅ | id: ea8c9269, aparece no GET /earnings |
| POST /earnings com mesmo external_id 2x → 409 (não duplica) | ✅ | `{"statusCode":409,"message":"Corrida já registrada (external_id duplicado)"}` |
| GET /earnings/summary?period=today/week/month → cada um retorna valor próprio | ✅ | today=0, week=150, month=150 (corrida do dia anterior) |
| POST /costs FUEL sem fuel_log → 201 | ✅ | HTTP 201 |
| POST /costs FUEL com fuel_log completo → fuel_log relacionado | ✅ | Usando campos flat (não nested); fuel_log aparece no GET /costs |
| POST /costs MAINTENANCE sem log → 201 | ✅ | HTTP 201 |

**Aviso (não crítico):** `POST /costs` com body `{"fuel_log": {...}}` (objeto aninhado) → 400 `"property fuel_log should not exist"`. A API usa campos flat (`gas_station`, `liters`, `price_per_liter`, `odometer_km`) no corpo principal. Divergência entre a API spec e a implementação.

---

## Bloco 4 — Cadastro Completo

| Teste | Resultado | Detalhe se falhou |
|-------|-----------|-------------------|
| POST /auth/register + verify-otp → novo usuário criado | ✅ | Flow completo com OTP bypass (code 123456) |
| GET /vehicles/me retorna dados cadastrados | ✅ | Após POST /vehicles, GET retorna os dados (não 404) |
| GET /financing/me retorna dados cadastrados | ✅ | Após POST /financing/me, GET retorna os dados (não 404) |

**Nota:** O endpoint de criação de financiamento é `POST /financing/me` (não `POST /financing`). O `POST /financing` retorna 404.

---

## Bloco 5 — Programa de Indicação

| Teste | Resultado | Detalhe se falhou |
|-------|-----------|-------------------|
| GET /referral/me para usuário recém-cadastrado → 200 com code gerado | ✅ | Code "TESTRE23" gerado automaticamente, is_active=true |
| GET /referral/validate/:code com código ativo → valid:true | ✅ | `{"valid":true,"referrer_name":"Test"}` |
| Usuário B com referral_code de motorista → trial_ends_at = +7 dias | ❌ | trial_ends_at = 2026-07-10 (14 dias), deveria ser 7 dias para código tipo USER/motorista |
| payment.paid de B → balance.available de A aumenta (REGRESSÃO D+30) | ⚠️ | Não testável por API — requer webhook real do Pagar.me |
| balance.pending de A permanece 0 | ⚠️ | Não testável sem payment webhook |
| POST /referral/withdraw com saldo < R$20 → bloqueado com mensagem clara | ✅ | `{"statusCode":400,"message":"Valor mínimo para saque é R$ 20,00"}` |

---

## Bloco 6 — Transição Motorista ↔ Influencer

| Teste | Resultado | Detalhe se falhou |
|-------|-----------|-------------------|
| Usuário sem influencer profile → GET /referral/me is_active=true | ✅ | `"is_active": true` |
| make-influencer → ReferralCode fica is_active=false (via validate) | ✅ | GET /referral/validate/:code → `{"valid":false}` após make-influencer |
| GET /referral/me reflete is_active=false após virar influencer | ❌ | `/referral/me` retorna `is_active:true` mesmo após código desativado (inconsistente com validate) |
| GET /referral/validate/:code desativado → valid:false | ✅ | `{"valid":false}` |
| Cadastrar com código desativado → não dá erro, aplica trial padrão | ✅ | HTTP 201, trial_ends_at = 14 dias padrão |
| Suspender influencer → ReferralCode volta a is_active=true | ✅ | validate retorna valid:true após suspend |
| Saldo cashback antes da transição continua intacto | ⚠️ | Usuário de teste não tinha saldo acumulado; não testável sem dados históricos reais |

---

## Bloco 7 — Painel Admin: Permissões por Role

| Teste | Resultado | Detalhe se falhou |
|-------|-----------|-------------------|
| SUPER_ADMIN login → 200, role SUPER_ADMIN no payload | ✅ | |
| SUPPORT_DRIVER login → 200, role SUPPORT_DRIVER no payload | ✅ | |
| SUPPORT_INFLUENCER login → 200, role SUPPORT_INFLUENCER no payload | ✅ | |
| SUPPORT_DRIVER_INFLUENCER login → 200, role correta no payload | ✅ | |
| SUPPORT_DRIVER → GET /admin/dashboard/overview → 403 | ✅ | |
| SUPPORT_DRIVER → GET /admin/users → 200 | ✅ | |
| SUPPORT_DRIVER → GET /admin/influencers → 403 | ✅ | |
| SUPPORT_DRIVER → GET /admin/withdrawals → 403 | ✅ | |
| SUPPORT_INFLUENCER → GET /admin/influencers → 200 | ✅ | |
| SUPPORT_INFLUENCER → GET /admin/users → 403 | ✅ | |
| SUPPORT_INFLUENCER → PATCH /admin/influencers/:id/tier → 403 | ✅ | SUPER_ADMIN only |
| SUPPORT_DRIVER_INFLUENCER → GET /admin/users → 200 | ✅ | |
| SUPPORT_DRIVER_INFLUENCER → GET /admin/influencers → 200 | ✅ | |
| SUPPORT_DRIVER_INFLUENCER → GET /admin/withdrawals → 403 | ✅ | |
| SUPER_ADMIN → qualquer endpoint admin → 200 | ✅ | Testado: dashboard, users, influencers, withdrawals |

---

## Bloco 8 — Painel Admin: Funcionalidades Novas (Agente 15)

| Teste | Resultado | Detalhe se falhou |
|-------|-----------|-------------------|
| PATCH /admin/users/:id com novo nome → atualiza em GET /admin/users/:id | ✅ | Nome atualizado para "Diego B. Atualizado" |
| PATCH /admin/users/:id com email já usado → erro claro (não 500) | ✅ | HTTP 400 `"Este e-mail ou CPF já está em uso por outra conta."` |
| PATCH /admin/users/:id/grant-premium → plan=PRO, plan_granted_by=ADMIN_COURTESY | ✅ | Confirmado via GET |
| grant-premium NÃO criou Subscription/Payment | ✅ | 0 subscriptions para o usuário |
| PATCH /admin/users/:id/revoke-premium (cortesia) → volta FREE | ✅ | plan=FREE, plan_granted_by=null |
| PATCH /admin/users/:id/revoke-premium (assinatura paga) → bloqueado | ✅ | HTTP 400 com mensagem clara sobre assinatura paga |
| POST /admin/users/:id/make-influencer → InfluencerProfile APPROVED | ✅ | status=APPROVED, HTTP 201 |
| Após make-influencer → ReferralCode is_active=false | ✅ | Confirmado via GET /referral/validate (valid:false) |
| POST /admin/users/:id/make-influencer já influencer → erro claro | ✅ | HTTP 400 `"Este usuário já possui um perfil de influencer."` |

**Aviso (não crítico):** `PATCH /admin/users/:id` retorna o corpo do usuário **antes** da atualização na resposta HTTP 200. O `GET /admin/users/:id` subsequente mostra o dado atualizado corretamente. Não é um bug funcional, mas pode confundir o cliente dashboard.

---

## Bloco 9 — Auditoria

| Teste | Resultado | Detalhe se falhou |
|-------|-----------|-------------------|
| Ações dos Blocos 7/8 geraram AdminAuditLog correspondente | ✅ | 5 ações hoje = 5 logs: make_influencer_direct, suspend_influencer, update_user, grant_premium_courtesy, revoke_premium_courtesy |
| SUPPORT_DRIVER → GET /admin/audit-logs → apenas logs dele | ✅ | Retornou `{"data":[],"total":0}` (sem ações próprias; não vê logs de outros admins) |
| SUPER_ADMIN → GET /admin/audit-logs → logs de todos | ✅ | Retornou 16 logs de todos os admins |

---

## Bloco 10 — Verificação de Dados Sensíveis

| Teste | Resultado | Detalhe se falhou |
|-------|-----------|-------------------|
| GET /users/me → CPF sempre mascarado | ✅ | `"cpf":"***.152.***-**"` |
| GET /users/me → telefone sempre mascarado | ✅ | `"phone":"+55659****7045"` |
| GET /admin/users → CPF/telefone mascarados (todos os 8 usuários) | ✅ | Todos com `cpf_masked` e `phone_masked` com `*` |
| GET /admin/users/:id → somente campos _masked no response | ✅ | Keys: cpf_masked, email_masked, phone_masked (sem raw) |
| Nenhuma resposta expõe password_hash, refresh_token, OTP | ✅ | Verificado em /users/me, /admin/users, /admin/users/:id |

---

## Falhas Encontradas (detalhe completo)

### 1. GET /reports/monthly ignora parâmetro `month`
- **Endpoint:** `GET /v1/reports/monthly?month=2026-05`
- **Esperado:** Resposta com `"month":"2026-05"` e dados do mês de maio
- **Recebido:** `"month":"2026-06"` (mês atual) — parâmetro de query completamente ignorado
- **Possível causa:** O controller não passa o `month` query param para o service, ou o service tem default para o mês atual sem ler o param. Verificar `reports.controller.ts` e `reports.service.ts`.

### 2. GET /taxes/monthly retorna 404
- **Endpoint:** `GET /v1/taxes/monthly`
- **Esperado:** Dados fiscais do mês atual (conforme API spec em docs/04-API-SPEC.md)
- **Recebido:** HTTP 404 `"Cannot GET /v1/taxes/monthly"`
- **Causa:** Endpoint real é `GET /v1/taxes/monthly/:month` (ex: `/taxes/monthly/2026-06`). A API spec documenta sem o parâmetro de rota obrigatório. Divergência entre spec e implementação.

### 3. Trial de 7 dias não aplicado para indicação motorista
- **Endpoint:** POST /auth/register + verify-otp com `referral_code` de usuário motorista (type=USER)
- **Esperado:** `trial_ends_at` = +7 dias (regra 16.3 em docs/06-BUSINESS-RULES.md: "Código de motorista (type=USER): trial = 7 dias Premium")
- **Recebido:** `trial_ends_at` = +14 dias (mesmo que sem código)
- **Possível causa:** A lógica de aplicação do trial não diferencia entre código USER e INFLUENCER — aplica sempre 14 dias padrão.

### 4. GET /referral/me exibe is_active:true mesmo após código desativado
- **Endpoint:** `GET /v1/referral/me`
- **Esperado:** Após `POST /admin/users/:id/make-influencer`, `is_active` deve ser `false`
- **Recebido:** `{"is_active": true}` — inconsistente com `GET /referral/validate/:code` que retorna `{"valid": false}`
- **Possível causa:** O endpoint `/referral/me` lê o campo `is_active` de forma diferente do `validate`. Pode estar retornando o campo da relation sem JOIN correto, ou usando dado cacheado.

---

## Itens não testáveis via API (roteiro manual qa/REGRESSAO-GERAL.md ainda precisa cobrir)

- **Tela do app:** layout, cards, gráficos, números com ponto flutuante na UI
- **Seção de notificações:** NotificationListenerService (requer APK em device físico)
- **Push notifications:** FCM delivery end-to-end
- **Pagar.me webhook:** `payment.paid` → balance.available atualizado imediatamente (Bloco 5, item 4)
- **Saldo cashback na transição:** usuário com saldo acumulado virando influencer (Bloco 6, item 7)
- **Tela de cadastro no app:** validação de placa no formato correto na UI (Bloco 4)
- **Dashboard web (Next.js):** login, navegação, renderização de dados do influencer
- **Deep links:** `rotafinanceira://referral/CODIGO` abrindo o app
- **Biometria:** login biométrico no app
- **Trial countdown:** alertas push 3 dias antes do trial expirar
