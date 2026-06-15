# Rota Financeira — Especificação da API REST

**Versão:** 1.0 | **Base URL:** `https://api.rota-financeira.app/v1`
**Autenticação:** Bearer Token (JWT) em todos os endpoints exceto os marcados com [público]

**Formato padrão de erro:**
```json
{ "statusCode": 400, "error": "BAD_REQUEST", "message": "Descrição legível" }
```

---

## MÓDULO: AUTH

### POST /auth/register [público]
Cadastra novo usuário. CPF e telefone são validados antes de salvar.

**Body:**
```json
{
  "name": "Carlos Souza",
  "cpf": "123.456.789-09",
  "phone": "+5511999998888",
  "email": "carlos@email.com",
  "password": "Senha@123"
}
```
**Resposta 201:**
```json
{ "message": "OTP enviado para o telefone informado", "otp_expires_in": 300 }
```
**Erros:** 400 CPF inválido | 409 CPF/email/telefone já cadastrado

---

### POST /auth/verify-otp [público]
Verifica OTP e ativa a conta. Retorna tokens após verificação bem-sucedida.

**Body:**
```json
{ "phone": "+5511999998888", "code": "123456", "purpose": "REGISTRATION" }
```
**Resposta 200:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "user": { "id": "uuid", "name": "Carlos Souza", "plan": "PRO", "trial_ends_at": "2026-06-29T00:00:00Z" }
}
```
**Erros:** 400 Código inválido | 400 Código expirado | 429 Muitas tentativas

---

### POST /auth/login [público]
Login por CPF e senha.

**Body:**
```json
{ "cpf": "123.456.789-09", "password": "Senha@123" }
```
**Resposta 200:** Igual ao verify-otp
**Erros:** 401 Credenciais inválidas | 423 Conta bloqueada (com `retry_after` em segundos)

---

### POST /auth/refresh [público]
Renova access token usando refresh token. O refresh token antigo é invalidado.

**Body:** `{ "refresh_token": "eyJ..." }`
**Resposta 200:** `{ "access_token": "eyJ...", "refresh_token": "eyJ..." }`
**Erros:** 401 Token inválido ou expirado

---

### POST /auth/logout
Invalida o refresh token atual.

**Body:** `{ "refresh_token": "eyJ..." }`
**Resposta 200:** `{ "message": "Logout realizado com sucesso" }`

---

### POST /auth/resend-otp [público]
Reenvia código OTP. Limitado a 5 reenvios por sessão, intervalo mínimo de 60s.

**Body:** `{ "phone": "+5511999998888", "purpose": "REGISTRATION" }`
**Resposta 200:** `{ "message": "Novo código enviado", "retry_after": 60 }`
**Erros:** 429 Rate limit atingido

---

### POST /auth/forgot-password [público]
Inicia fluxo de recuperação de senha via OTP.

**Body:** `{ "phone": "+5511999998888" }`
**Resposta 200:** `{ "message": "OTP enviado" }` (sempre, mesmo se telefone não existir — evita enumeração)

---

### POST /auth/reset-password [público]
Define nova senha após verificação do OTP de recuperação.

**Body:** `{ "phone": "+5511999998888", "code": "123456", "new_password": "NovaSenha@456" }`
**Resposta 200:** `{ "message": "Senha alterada com sucesso" }`

---

## MÓDULO: USERS

### GET /users/me
Retorna dados do usuário autenticado.

**Resposta 200:**
```json
{
  "id": "uuid",
  "name": "Carlos Souza",
  "email": "c***@email.com",
  "phone": "+55119****8888",
  "cpf": "***.456.***-**",
  "plan": "PRO",
  "trial_ends_at": "2026-06-29T00:00:00Z",
  "plan_expires_at": null,
  "biometry_enabled": true,
  "created_at": "2026-06-15T10:00:00Z"
}
```

---

### PATCH /users/me
Atualiza nome e/ou e-mail. Requer confirmação por senha.

**Body:** `{ "name": "Carlos A. Souza", "email": "novo@email.com", "current_password": "Senha@123" }`
**Resposta 200:** Dados atualizados do usuário
**Erros:** 401 Senha incorreta | 409 E-mail já em uso

---

### POST /users/me/change-password
Altera senha do usuário.

**Body:** `{ "current_password": "Senha@123", "new_password": "NovaSenha@456" }`
**Resposta 200:** `{ "message": "Senha alterada com sucesso" }`

---

### POST /users/me/change-phone
Inicia troca de telefone. Envia OTP para o novo número.

**Body:** `{ "new_phone": "+5511988887777", "current_password": "Senha@123" }`
**Resposta 200:** `{ "message": "OTP enviado para o novo número" }`

---

### POST /users/me/change-phone/verify
Confirma troca de telefone com OTP.

**Body:** `{ "new_phone": "+5511988887777", "code": "654321" }`
**Resposta 200:** `{ "message": "Telefone atualizado com sucesso" }`

---

### PATCH /users/me/biometry
Ativa ou desativa biometria.

**Body:** `{ "enabled": true }`
**Resposta 200:** `{ "biometry_enabled": true }`

---

### DELETE /users/me
Inicia exclusão da conta. Requer confirmação por senha. Dados excluídos em até 30 dias.

**Body:** `{ "password": "Senha@123", "confirmation": "EXCLUIR MINHA CONTA" }`
**Resposta 200:** `{ "message": "Conta marcada para exclusão. Seus dados serão removidos em até 30 dias." }`

---

## MÓDULO: VEHICLES

### POST /vehicles
Cadastra o veículo do usuário. Apenas 1 veículo por usuário.

**Body:**
```json
{ "model": "Chevrolet Onix 2024", "year": 2024, "plate": "ABC-1D23", "fuel_efficiency": 12.4 }
```
**Resposta 201:** Veículo criado
**Erros:** 409 Usuário já tem veículo cadastrado

---

### GET /vehicles/me
Retorna o veículo do usuário autenticado.

**Resposta 200:**
```json
{ "id": "uuid", "model": "Chevrolet Onix 2024", "year": 2024, "plate": "ABC-1D23", "fuel_efficiency": 12.4 }
```

---

### PUT /vehicles/me
Atualiza todos os dados do veículo.

**Body:** Mesmos campos do POST
**Resposta 200:** Veículo atualizado

---

## MÓDULO: FINANCING

### POST /financing
Cadastra os dados de financiamento. Apenas 1 registro por usuário.

**Body:**
```json
{ "monthly_installment": 2500.00, "due_day": 25, "desired_income": 2000.00, "work_days_per_month": 22 }
```
**Resposta 201:** Financiamento criado + meta diária calculada

---

### GET /financing/me
Retorna dados de financiamento e meta calculada.

**Resposta 200:**
```json
{
  "monthly_installment": 2500.00,
  "due_day": 25,
  "desired_income": 2000.00,
  "work_days_per_month": 22,
  "calculated_daily_goal": 272.73,
  "monthly_goal": 6000.00
}
```

---

### PUT /financing/me
Atualiza dados de financiamento. Recalcula meta automaticamente.

**Body:** Mesmos campos do POST
**Resposta 200:** Financiamento atualizado com nova meta

---

### GET /financing/progress
Retorna progresso da parcela no mês atual.

**Resposta 200:**
```json
{
  "reference_month": "2026-06-01",
  "installment": 2500.00,
  "accumulated": 1840.00,
  "percentage": 73.6,
  "deficit": 660.00,
  "days_until_due": 10,
  "required_daily": 110.00,
  "health_status": "AMBER",
  "recovery_tip": "Trabalhe 6 dias a mais para cobrir o déficit de R$ 660,00"
}
```

---

## MÓDULO: EARNINGS

### GET /earnings
Lista ganhos com filtros.

**Query params:** `?date=2026-06-15` | `?month=2026-06` | `?platform=UBER` | `?page=1&limit=20`

**Resposta 200:**
```json
{
  "data": [
    { "id": "uuid", "platform": "UBER", "amount": 32.50, "km_driven": 8.2, "started_at": "2026-06-15T09:12:00Z", "origin": "AUTO_SYNC" }
  ],
  "total": 12,
  "page": 1,
  "limit": 20
}
```

---

### POST /earnings
Registra corrida manualmente.

**Body:**
```json
{ "platform": "UBER", "amount": 45.00, "km_driven": 10.5, "started_at": "2026-06-15T14:30:00Z", "earned_at": "2026-06-15" }
```
**Resposta 201:** Corrida registrada

---

### GET /earnings/summary
Resumo de ganhos por período.

**Query params:** `?period=today|week|month&month=2026-06`

**Resposta 200:**
```json
{
  "period": "month",
  "gross_total": 4218.50,
  "by_platform": { "UBER": 2960.00, "NOVENTA_E_NOVE": 1258.50 },
  "trips_count": 156,
  "best_hour": "18:00",
  "days_worked": 15
}
```

---

### DELETE /earnings/:id
Remove corrida registrada manualmente. Não permite remover corridas de sync automático.

**Resposta 200:** `{ "message": "Corrida removida" }`
**Erros:** 403 Corrida de sync não pode ser removida | 404 Não encontrada

---

## MÓDULO: COSTS

### POST /costs
Registra um gasto. Aceita diferentes tipos com campos específicos.

**Body (abastecimento):**
```json
{
  "type": "FUEL",
  "amount": 236.00,
  "cost_date": "2026-06-15",
  "fuel_log": { "gas_station": "Posto Ipiranga", "liters": 40.0, "price_per_liter": 5.90, "odometer_km": 48320 }
}
```
**Body (manutenção):**
```json
{
  "type": "MAINTENANCE",
  "amount": 280.00,
  "description": "Troca de óleo 5W30",
  "cost_date": "2026-06-05",
  "maintenance_log": { "service_type": "Troca de óleo", "current_odometer_km": 48000, "next_service_km": 53000, "reminder_enabled": true }
}
```
**Body (lavagem, outros):**
```json
{ "type": "CAR_WASH", "amount": 35.00, "description": "Lavagem simples", "cost_date": "2026-06-15" }
```
**Resposta 201:** Custo registrado com custo/km atualizado se for combustível

---

### GET /costs
Lista custos com filtros.

**Query params:** `?month=2026-06` | `?type=FUEL` | `?page=1&limit=20`

**Resposta 200:**
```json
{
  "data": [ { "id": "uuid", "type": "FUEL", "amount": 236.00, "cost_date": "2026-06-15", "fuel_log": { ... } } ],
  "total": 8,
  "page": 1
}
```

---

### GET /costs/summary
Resumo de custos do mês com custo/km.

**Query params:** `?month=2026-06`

**Resposta 200:**
```json
{
  "month": "2026-06",
  "total": 1384.00,
  "cost_per_km": 0.52,
  "km_driven": 2660,
  "by_type": {
    "FUEL": { "total": 980.00, "percentage": 70.8 },
    "MAINTENANCE": { "total": 320.00, "percentage": 23.1 },
    "CAR_WASH": { "total": 84.00, "percentage": 6.1 }
  },
  "alert": { "type": "HIGH_COST_PER_KM", "message": "Custo/km subiu 8% em relação à média dos últimos 3 meses" }
}
```

---

### DELETE /costs/:id
Remove um gasto.

**Resposta 200:** `{ "message": "Gasto removido" }`

---

## MÓDULO: REPORTS

### GET /reports/monthly
Relatório completo de um mês.

**Query params:** `?month=2026-06`

**Resposta 200:**
```json
{
  "month": "2026-06",
  "gross_income": 4218.50,
  "total_costs": 1384.00,
  "estimated_tax": 187.00,
  "installment_covered": 1840.00,
  "net_income": 994.00,
  "cost_per_km": 0.52,
  "best_day": { "date": "2026-06-12", "net": 412.00 },
  "worst_day": { "date": "2026-06-03", "net": 85.00 },
  "vs_previous_month": { "gross_income": 318.00, "net_income": 234.00 },
  "next_month_projection": { "gross_income": 4500.00, "net_income": 1100.00 }
}
```

---

### GET /reports/monthly/pdf
Gera e retorna PDF do relatório mensal.

**Query params:** `?month=2026-06`
**Resposta 200:** `Content-Type: application/pdf` com o arquivo
**Erros:** 403 Plano gratuito não tem acesso a PDF

---

### GET /reports/annual
Relatório anual consolidado.

**Query params:** `?year=2026`
**Resposta 200:** Consolidado dos 12 meses com totais

---

## MÓDULO: TAXES

### GET /taxes/monthly
Cálculo de IR do mês.

**Query params:** `?month=2026-06`

**Resposta 200:**
```json
{
  "month": "2026-06",
  "gross_income": 4218.50,
  "deductions": 1300.00,
  "taxable_income": 2918.50,
  "tax_amount": 187.22,
  "tax_bracket": "15%",
  "reserve_message": "Reserve R$ 187,22 este mês para o carnê-leão",
  "due_date": "2026-06-30",
  "status": "PENDING"
}
```

---

### GET /taxes/annual
Resumo anual de impostos para declaração.

**Query params:** `?year=2026`
**Resposta 200:** Totais por mês e anual

---

### PATCH /taxes/:month/status
Marca mês como pago ou não.

**Body:** `{ "status": "PAID", "paid_at": "2026-06-28" }`
**Resposta 200:** Status atualizado

---

## MÓDULO: ALERTS

### GET /alerts/preferences
Lista preferências de alerta do usuário.

**Resposta 200:**
```json
{
  "preferences": [
    { "type": "GOAL_REACHED", "enabled": true },
    { "type": "INSTALLMENT_DUE", "enabled": true }
  ]
}
```

---

### PATCH /alerts/preferences
Atualiza preferências de alerta.

**Body:** `{ "preferences": [{ "type": "GOAL_REACHED", "enabled": false }] }`
**Resposta 200:** Preferências atualizadas

---

### GET /notifications
Lista notificações do usuário.

**Query params:** `?unread=true&page=1&limit=20`
**Resposta 200:** Lista paginada de notificações

---

### PATCH /notifications/:id/read
Marca notificação como lida.

**Resposta 200:** `{ "message": "Notificação marcada como lida" }`

---

### PATCH /notifications/read-all
Marca todas as notificações como lidas.

**Resposta 200:** `{ "message": "Todas as notificações foram marcadas como lidas" }`

---

## MÓDULO: INTEGRATIONS

### POST /integrations/connect
Conecta uma plataforma de transporte. Credenciais são criptografadas imediatamente.

**Body:** `{ "platform": "UBER", "credentials": { "email": "motorista@email.com", "password": "senha123" } }`
**Resposta 201:** `{ "message": "Plataforma conectada. Sync iniciado." }`
**Erros:** 400 Credenciais inválidas | 409 Plataforma já conectada

---

### GET /integrations/status
Status de todas as plataformas conectadas.

**Resposta 200:**
```json
{
  "integrations": [
    { "platform": "UBER", "is_active": true, "last_sync_at": "2026-06-15T04:00:00Z", "last_sync_status": "SUCCESS" },
    { "platform": "NOVENTA_E_NOVE", "is_active": true, "last_sync_at": "2026-06-15T04:00:00Z", "last_sync_status": "SUCCESS" }
  ]
}
```

---

### POST /integrations/:platform/sync
Força sync manual de uma plataforma.

**Resposta 202:** `{ "message": "Sync iniciado. Você será notificado quando concluir." }`
**Erros:** 404 Plataforma não conectada | 429 Sync já em andamento

---

### DELETE /integrations/:platform
Desconecta uma plataforma e remove as credenciais.

**Resposta 200:** `{ "message": "Plataforma desconectada e credenciais removidas" }`

---

## MÓDULO: SUBSCRIPTIONS

### GET /subscriptions/plans
Lista os planos disponíveis. [público]

**Resposta 200:**
```json
{
  "plans": [
    { "id": "free", "name": "Gratuito", "price_cents": 0, "features": ["7 dias histórico", "1 plataforma"] },
    { "id": "pro_monthly", "name": "Pro Mensal", "price_cents": 1990, "billing_cycle": "MONTHLY", "features": ["Tudo incluso"] },
    { "id": "pro_yearly", "name": "Pro Anual", "price_cents": 15900, "billing_cycle": "YEARLY", "features": ["Tudo incluso", "33% desconto"] }
  ]
}
```

---

### GET /subscriptions/me
Retorna assinatura atual do usuário.

**Resposta 200:**
```json
{
  "plan": "PRO",
  "status": "ACTIVE",
  "billing_cycle": "MONTHLY",
  "current_period_end": "2026-07-15T00:00:00Z",
  "amount_cents": 1990,
  "trial_ends_at": null
}
```

---

### POST /subscriptions/subscribe
Assina um plano. Dados do cartão tokenizados pelo Pagar.me no frontend.

**Body:**
```json
{
  "plan_id": "pro_monthly",
  "payment_method": "CREDIT_CARD",
  "card_token": "tok_xxxxxxxx"
}
```
**Resposta 201:** `{ "message": "Assinatura ativada com sucesso", "subscription": { ... } }`
**Erros:** 400 Cartão recusado | 409 Usuário já tem assinatura ativa

---

### POST /subscriptions/subscribe-pix
Assina plano anual via PIX.

**Body:** `{ "plan_id": "pro_yearly" }`
**Resposta 201:**
```json
{ "qr_code": "00020126...", "qr_code_url": "https://...", "expires_at": "2026-06-15T11:00:00Z", "amount_cents": 15900 }
```

---

### DELETE /subscriptions/me
Cancela a assinatura. Acesso Pro mantido até fim do período.

**Resposta 200:**
```json
{ "message": "Assinatura cancelada. Acesso Pro mantido até 2026-07-15.", "access_until": "2026-07-15T00:00:00Z" }
```

---

### POST /subscriptions/webhook [público — validado por HMAC]
Recebe eventos do Pagar.me. Autenticação via header `X-Pagarme-Signature`.

**Eventos tratados:**
- `payment.paid` → ativa assinatura
- `payment.failed` → registra falha, agenda retry
- `subscription.canceled` → downgrade para gratuito
- `charge.refunded` → registra reembolso

**Resposta 200:** `{ "received": true }`

---

## Regras Gerais da API

| Regra | Valor |
|-------|-------|
| Rate limit global | 100 req/min por IP |
| Rate limit autenticado | 300 req/min por usuário |
| Rate limit login | 5 tentativas/15min por CPF |
| Rate limit OTP | 3 tentativas/código, 5 reenvios/sessão |
| Tamanho máximo do body | 1MB |
| Timeout | 30 segundos |
| Versão da API | /v1 — breaking changes criam nova versão |
| Paginação padrão | page=1, limit=20, max limit=100 |
