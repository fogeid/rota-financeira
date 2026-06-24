# Rota Financeira — Schema do Banco de Dados

**Versão:** 1.0 | **Data:** Junho 2026
**ORM:** Prisma 5 | **SGBD:** PostgreSQL 16

---

## Schema Prisma Completo

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────
// USUÁRIOS
// ─────────────────────────────────────────

model User {
  id                String    @id @default(uuid())
  cpf               String    @unique  // Criptografado AES-256. Index em hash do CPF
  cpf_hash          String    @unique  // SHA-256 do CPF limpo. Usado para lookup
  name              String
  email             String    @unique  // Criptografado AES-256
  email_hash        String    @unique  // SHA-256 do email. Usado para lookup
  phone             String             // Criptografado AES-256
  phone_hash        String    @unique  // SHA-256 do telefone. Usado para lookup
  password_hash     String             // bcrypt custo 12
  plan              Plan      @default(GRATUITO)
  trial_ends_at     DateTime?          // null após trial expirado
  plan_expires_at   DateTime?          // Para planos pagos
  is_active         Boolean   @default(true)
  biometry_enabled  Boolean   @default(false)
  created_at        DateTime  @default(now())
  updated_at        DateTime  @updatedAt
  deleted_at        DateTime?          // Soft delete. Hard delete após 30 dias

  // Relações
  vehicle           Vehicle?
  financing         Financing?
  earnings          Earning[]
  costs             Cost[]
  goals             Goal[]
  platform_credentials PlatformCredential[]
  notifications     Notification[]
  otp_codes         OtpCode[]
  subscriptions     Subscription[]
  refresh_tokens    RefreshToken[]
  login_attempts    LoginAttempt[]
  alert_preferences AlertPreference[]

  @@map("users")
}

enum Plan {
  GRATUITO
  PRO
}

// ─────────────────────────────────────────
// AUTENTICAÇÃO
// ─────────────────────────────────────────

model RefreshToken {
  id          String    @id @default(uuid())
  user_id     String
  token_hash  String    @unique  // SHA-256 do token. Token em si só vai para o client
  device_info String?            // User-agent do device
  expires_at  DateTime
  revoked_at  DateTime?
  created_at  DateTime  @default(now())

  user        User      @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id])
  @@map("refresh_tokens")
}

model OtpCode {
  id          String    @id @default(uuid())
  user_id     String?            // null se ainda não tem conta (cadastro)
  phone_hash  String             // SHA-256 do telefone
  code_hash   String             // SHA-256 do código OTP
  purpose     OtpPurpose
  attempts    Int       @default(0)
  used_at     DateTime?
  expires_at  DateTime
  created_at  DateTime  @default(now())

  user        User?     @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([phone_hash])
  @@map("otp_codes")
}

enum OtpPurpose {
  REGISTRATION
  PASSWORD_RESET
  PHONE_CHANGE
}

model LoginAttempt {
  id          String    @id @default(uuid())
  user_id     String?
  cpf_hash    String
  ip_address  String
  success     Boolean
  created_at  DateTime  @default(now())

  user        User?     @relation(fields: [user_id], references: [id], onDelete: SetNull)

  @@index([cpf_hash, created_at])
  @@map("login_attempts")
}

// ─────────────────────────────────────────
// VEÍCULO
// ─────────────────────────────────────────

model Vehicle {
  id                String    @id @default(uuid())
  user_id           String    @unique
  model             String             // Ex: "Chevrolet Onix 2024"
  year              Int                // 990–2027
  plate             String             // Formato AAA-0000 ou AAA0A00
  fuel_efficiency   Decimal   @db.Decimal(5,2)  // km/L (ex: 12.40)
  created_at        DateTime  @default(now())
  updated_at        DateTime  @updatedAt

  user              User      @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@map("vehicles")
}

// ─────────────────────────────────────────
// FINANCIAMENTO
// ─────────────────────────────────────────

model Financing {
  id                  String    @id @default(uuid())
  user_id             String    @unique
  monthly_installment Decimal   @db.Decimal(10,2)  // Parcela mensal em R$
  due_day             Int                           // Dia do vencimento (1–28)
  desired_income      Decimal   @db.Decimal(10,2)  // Renda líquida desejada/mês
  work_days_per_month Int                           // Dias de trabalho por mês (1–30)
  created_at          DateTime  @default(now())
  updated_at          DateTime  @updatedAt

  user                User      @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@map("financings")
}

// ─────────────────────────────────────────
// GANHOS
// ─────────────────────────────────────────

model Earning {
  id          String       @id @default(uuid())
  user_id     String
  platform    Platform
  amount      Decimal      @db.Decimal(10,2)  // Valor da corrida/entrega em R$
  km_driven   Decimal?     @db.Decimal(8,2)   // Km rodados na corrida
  started_at  DateTime                         // Horário de início da corrida
  earned_at   DateTime                         // Data de recebimento (date only)
  origin      EarningOrigin @default(MANUAL)
  external_id String?                          // ID da corrida na plataforma (para dedup)
  created_at  DateTime     @default(now())

  user        User         @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@unique([user_id, platform, external_id])  // Evita duplicata no sync
  @@index([user_id, earned_at])
  @@index([user_id, platform])
  @@map("earnings")
}

enum Platform {
  UBER
  NOVENTA_E_NOVE  // 99
  IFOOD
  MANUAL
}

enum EarningOrigin {
  AUTO_SYNC
  MANUAL
}

// ─────────────────────────────────────────
// CUSTOS
// ─────────────────────────────────────────

model Cost {
  id          String      @id @default(uuid())
  user_id     String
  type        CostType
  amount      Decimal     @db.Decimal(10,2)
  description String?     @db.VarChar(255)
  cost_date   DateTime                        // Data do gasto
  created_at  DateTime    @default(now())
  updated_at  DateTime    @updatedAt

  user        User        @relation(fields: [user_id], references: [id], onDelete: Cascade)
  fuel_log    FuelLog?
  maintenance MaintenanceLog?

  @@index([user_id, cost_date])
  @@index([user_id, type])
  @@map("costs")
}

enum CostType {
  FUEL
  MAINTENANCE
  CAR_WASH
  INSURANCE
  IPVA
  FINE
  PARKING
  OTHER
}

model FuelLog {
  id              String    @id @default(uuid())
  cost_id         String    @unique
  gas_station     String    @db.VarChar(120)
  liters          Decimal   @db.Decimal(8,3)
  price_per_liter Decimal   @db.Decimal(6,3)
  odometer_km     Decimal   @db.Decimal(10,2)  // Km no odômetro ao abastecer

  cost            Cost      @relation(fields: [cost_id], references: [id], onDelete: Cascade)

  @@map("fuel_logs")
}

model MaintenanceLog {
  id                  String    @id @default(uuid())
  cost_id             String    @unique
  service_type        String    @db.VarChar(100)  // "Troca de óleo", "Pneus", etc
  current_odometer_km Decimal   @db.Decimal(10,2)
  next_service_km     Decimal?  @db.Decimal(10,2) // Km para próxima revisão
  reminder_enabled    Boolean   @default(false)
  reminder_sent_at    DateTime?

  cost                Cost      @relation(fields: [cost_id], references: [id], onDelete: Cascade)

  @@map("maintenance_logs")
}

// ─────────────────────────────────────────
// METAS
// ─────────────────────────────────────────

model Goal {
  id              String    @id @default(uuid())
  user_id         String
  reference_month DateTime  @db.Date             // Primeiro dia do mês (2026-06-01)
  daily_goal      Decimal   @db.Decimal(10,2)    // Meta diária calculada
  monthly_goal    Decimal   @db.Decimal(10,2)    // Meta mensal total
  calculated_at   DateTime  @default(now())       // Quando foi calculada

  user            User      @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@unique([user_id, reference_month])
  @@map("goals")
}

// ─────────────────────────────────────────
// INTEGRAÇÕES COM PLATAFORMAS
// ─────────────────────────────────────────

model PlatformCredential {
  id                String    @id @default(uuid())
  user_id           String
  platform          Platform
  encrypted_data    String    @db.Text  // JSON criptografado AES-256-GCM com IV e tag
  last_sync_at      DateTime?
  last_sync_status  SyncStatus @default(NEVER)
  last_sync_error   String?   @db.VarChar(255)
  sync_retry_count  Int       @default(0)
  is_active         Boolean   @default(true)
  created_at        DateTime  @default(now())
  updated_at        DateTime  @updatedAt

  user              User      @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@unique([user_id, platform])
  @@map("platform_credentials")
}

enum SyncStatus {
  NEVER
  SUCCESS
  FAILED
  IN_PROGRESS
}

// ─────────────────────────────────────────
// NOTIFICAÇÕES
// ─────────────────────────────────────────

model Notification {
  id          String           @id @default(uuid())
  user_id     String
  type        NotificationType
  title       String           @db.VarChar(100)
  body        String           @db.VarChar(255)
  data        Json?                              // Deep link ou dados extras
  read_at     DateTime?
  sent_at     DateTime?
  created_at  DateTime         @default(now())

  user        User             @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id, created_at])
  @@map("notifications")
}

enum NotificationType {
  GOAL_REACHED
  BELOW_PACE
  INSTALLMENT_AT_RISK
  INSTALLMENT_DUE
  HIGH_COST_PER_KM
  MAINTENANCE_DUE
  TAX_DUE
  SYNC_SUCCESS
  SYNC_FAILED
  PAYMENT_APPROVED
  PAYMENT_FAILED
  TRIAL_EXPIRING
}

model AlertPreference {
  id          String           @id @default(uuid())
  user_id     String
  type        NotificationType
  enabled     Boolean          @default(true)

  user        User             @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@unique([user_id, type])
  @@map("alert_preferences")
}

// ─────────────────────────────────────────
// ASSINATURAS E PAGAMENTOS
// ─────────────────────────────────────────

model Subscription {
  id                  String             @id @default(uuid())
  user_id             String
  plan                Plan
  billing_cycle       BillingCycle
  status              SubscriptionStatus @default(ACTIVE)
  pagarme_sub_id      String?            @unique  // ID da assinatura no Pagar.me
  pagarme_customer_id String?
  amount_cents        Int                          // 990 (mensal) ou 8900 (anual) em centavos
  current_period_start DateTime
  current_period_end  DateTime
  canceled_at         DateTime?
  created_at          DateTime           @default(now())
  updated_at          DateTime           @updatedAt

  user                User               @relation(fields: [user_id], references: [id], onDelete: Cascade)
  payments            Payment[]

  @@index([user_id])
  @@map("subscriptions")
}

enum BillingCycle {
  MONTHLY
  YEARLY
}

enum SubscriptionStatus {
  TRIAL
  ACTIVE
  PAST_DUE      // Pagamento falhou, em retry
  CANCELED
  EXPIRED
}

model Payment {
  id                  String        @id @default(uuid())
  subscription_id     String
  pagarme_charge_id   String?       @unique
  amount_cents        Int
  status              PaymentStatus
  payment_method      PaymentMethod
  paid_at             DateTime?
  failed_at           DateTime?
  failure_reason      String?       @db.VarChar(255)
  receipt_sent_at     DateTime?
  created_at          DateTime      @default(now())

  subscription        Subscription  @relation(fields: [subscription_id], references: [id], onDelete: Cascade)

  @@index([subscription_id])
  @@map("payments")
}

enum PaymentStatus {
  PENDING
  PAID
  FAILED
  REFUNDED
}

enum PaymentMethod {
  CREDIT_CARD
  DEBIT_CARD
  PIX
}
```

---

## Índices Adicionais

```sql
-- Busca de corridas por período (relatórios)
CREATE INDEX idx_earnings_user_date ON earnings(user_id, earned_at DESC);

-- Busca de custos por tipo e período
CREATE INDEX idx_costs_user_type_date ON costs(user_id, type, cost_date DESC);

-- Lookup de OTP por telefone
CREATE INDEX idx_otp_phone_expires ON otp_codes(phone_hash, expires_at);

-- Tentativas de login para rate limiting
CREATE INDEX idx_login_attempts_cpf_time ON login_attempts(cpf_hash, created_at DESC);
```

---

## Regras de Negócio do Banco

1. **Soft delete em users:** `deleted_at` preenchido. Hard delete via job agendado após 30 dias
2. **CPF/e-mail/telefone:** Armazenados criptografados. Lookup feito por hash (SHA-256)
3. **Credenciais de plataforma:** Campo `encrypted_data` contém IV + tag + ciphertext em base64
4. **Deduplicação de corridas:** Constraint UNIQUE em `(user_id, platform, external_id)`
5. **Goals:** Recalculada sempre que financing é alterado. Referência mensal = primeiro dia do mês
6. **Refresh tokens:** Revogados imediatamente no logout. Rotacionados a cada uso

---

## Dados Sensíveis — Política

| Campo | Tratamento |
|-------|-----------|
| cpf | AES-256-GCM + índice por cpf_hash |
| email | AES-256-GCM + índice por email_hash |
| phone | AES-256-GCM + índice por phone_hash |
| password_hash | bcrypt custo 12. NUNCA reversível |
| encrypted_data (plataformas) | AES-256-GCM com chave por usuário |
| token_hash (refresh) | SHA-256 do token. Token real só vai ao client |
| code_hash (OTP) | SHA-256 do código. Código real só vai via SMS |


// ─────────────────────────────────────────
// PROGRAMA DE INDICAÇÃO
// ─────────────────────────────────────────

model ReferralCode {
  id          String    @id @default(uuid())
  user_id     String    @unique
  code        String    @unique  // 6 dígitos alfanuméricos. Ex: CARLOS22
  slug        String?   @unique  // Para influencers. Ex: zemoto
  type        ReferralType @default(USER)
  is_active   Boolean   @default(true)  // false quando usuário se torna influencer aprovado (ver business-rules 16.6)
  clicks      Int       @default(0)
  created_at  DateTime  @default(now())

  user        User      @relation(fields: [user_id], references: [id], onDelete: Cascade)
  referrals   Referral[]

  @@map("referral_codes")
}

enum ReferralType {
  USER        // Motorista comum
  INFLUENCER  // Criador de conteúdo aprovado
}

model Referral {
  id                  String         @id @default(uuid())
  referral_code_id    String
  referred_user_id    String         @unique
  status              ReferralStatus @default(REGISTERED)
  cashback_amount     Decimal?       @db.Decimal(6,2)  // Valor a pagar ao indicador
  cashback_paid_at    DateTime?
  converted_at        DateTime?      // Quando virou Premium
  created_at          DateTime       @default(now())
  updated_at          DateTime       @updatedAt

  referral_code       ReferralCode   @relation(fields: [referral_code_id], references: [id])
  referred_user       User           @relation("ReferredUser", fields: [referred_user_id], references: [id])

  @@index([referral_code_id])
  @@map("referrals")
}

enum ReferralStatus {
  REGISTERED    // Cadastrou pelo link
  TRIAL         // Está no trial de 7 dias
  CONVERTED     // Assinou Premium — cashback liberado
  INACTIVE      // Cancelou sem assinar
}

model ReferralBalance {
  id              String    @id @default(uuid())
  user_id         String    @unique
  available       Decimal   @db.Decimal(10,2) @default(0)  // Saldo disponível para saque
  pending         Decimal   @db.Decimal(10,2) @default(0)  // Aguardando D+30
  total_earned    Decimal   @db.Decimal(10,2) @default(0)  // Total histórico ganho
  total_withdrawn Decimal   @db.Decimal(10,2) @default(0)  // Total sacado
  conversions     Int       @default(0)  // Total de indicações convertidas (define o nível)
  updated_at      DateTime  @updatedAt

  user            User      @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@map("referral_balances")
}

model ReferralWithdrawal {
  id          String             @id @default(uuid())
  user_id     String
  amount      Decimal            @db.Decimal(10,2)
  pix_key     String             // Chave PIX do usuário
  status      WithdrawalStatus   @default(PENDING)
  processed_at DateTime?
  created_at  DateTime           @default(now())

  user        User               @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id])
  @@map("referral_withdrawals")
}

enum WithdrawalStatus {
  PENDING     // Aguardando processamento
  PAID        // PIX enviado
  FAILED      // Falha no PIX
}

model InfluencerProfile {
  id              String              @id @default(uuid())
  user_id         String              @unique
  channel_name    String
  channel_url     String
  followers       Int
  niche           String
  tier            InfluencerTier
  status          InfluencerStatus    @default(PENDING)
  commission_rate Decimal             @db.Decimal(4,2)  // R$ por assinante ativo/mês
  bonus_threshold Int?                // Qtd assinantes para bônus de entrada
  bonus_amount    Decimal?            @db.Decimal(8,2)
  approved_at     DateTime?
  contract_signed_at DateTime?
  created_at      DateTime            @default(now())

  user            User                @relation(fields: [user_id], references: [id], onDelete: Cascade)
  commissions     InfluencerCommission[]

  @@map("influencer_profiles")
}

enum InfluencerTier {
  MICRO     // 5k–30k seguidores — R$ 3,00/mês
  MEDIUM    // 30k–150k — R$ 4,00/mês
  LARGE     // 150k+ — R$ 5,00/mês
  EXCLUSIVE // Negociado individualmente
}

enum InfluencerStatus {
  PENDING   // Aguardando aprovação
  APPROVED  // Aprovado, link ativo
  SUSPENDED // Link suspenso (baixa conversão ou fraude)
  REJECTED  // Reprovado
}

model InfluencerCommission {
  id                  String    @id @default(uuid())
  influencer_id       String
  reference_month     DateTime  @db.Date
  active_subscribers  Int
  commission_amount   Decimal   @db.Decimal(10,2)
  status              WithdrawalStatus @default(PENDING)
  paid_at             DateTime?
  created_at          DateTime  @default(now())

  influencer          InfluencerProfile @relation(fields: [influencer_id], references: [id])

  @@unique([influencer_id, reference_month])
  @@map("influencer_commissions")
}