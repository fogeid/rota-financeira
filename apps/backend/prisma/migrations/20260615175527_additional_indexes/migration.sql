-- Índices adicionais definidos em docs/03-DATABASE-SCHEMA.md ("Índices Adicionais")

-- Busca de corridas por período (relatórios)
CREATE INDEX IF NOT EXISTS "idx_earnings_user_date" ON "earnings"("user_id", "earned_at" DESC);

-- Busca de custos por tipo e período
CREATE INDEX IF NOT EXISTS "idx_costs_user_type_date" ON "costs"("user_id", "type", "cost_date" DESC);

-- Lookup de OTP por telefone
CREATE INDEX IF NOT EXISTS "idx_otp_phone_expires" ON "otp_codes"("phone_hash", "expires_at");

-- Tentativas de login para rate limiting
CREATE INDEX IF NOT EXISTS "idx_login_attempts_cpf_time" ON "login_attempts"("cpf_hash", "created_at" DESC);
