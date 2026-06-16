-- Down migration: reverte os índices adicionais criados em migration.sql

DROP INDEX IF EXISTS "idx_login_attempts_cpf_time";
DROP INDEX IF EXISTS "idx_otp_phone_expires";
DROP INDEX IF EXISTS "idx_costs_user_type_date";
DROP INDEX IF EXISTS "idx_earnings_user_date";
