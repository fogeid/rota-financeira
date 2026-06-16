-- Down migration: remove todas as tabelas e tipos criados em migration.sql

DROP TABLE IF EXISTS "payments";
DROP TABLE IF EXISTS "subscriptions";
DROP TABLE IF EXISTS "alert_preferences";
DROP TABLE IF EXISTS "notifications";
DROP TABLE IF EXISTS "platform_credentials";
DROP TABLE IF EXISTS "goals";
DROP TABLE IF EXISTS "maintenance_logs";
DROP TABLE IF EXISTS "fuel_logs";
DROP TABLE IF EXISTS "costs";
DROP TABLE IF EXISTS "earnings";
DROP TABLE IF EXISTS "financings";
DROP TABLE IF EXISTS "vehicles";
DROP TABLE IF EXISTS "login_attempts";
DROP TABLE IF EXISTS "otp_codes";
DROP TABLE IF EXISTS "refresh_tokens";
DROP TABLE IF EXISTS "users";

DROP TYPE IF EXISTS "PaymentMethod";
DROP TYPE IF EXISTS "PaymentStatus";
DROP TYPE IF EXISTS "SubscriptionStatus";
DROP TYPE IF EXISTS "BillingCycle";
DROP TYPE IF EXISTS "NotificationType";
DROP TYPE IF EXISTS "SyncStatus";
DROP TYPE IF EXISTS "CostType";
DROP TYPE IF EXISTS "EarningOrigin";
DROP TYPE IF EXISTS "Platform";
DROP TYPE IF EXISTS "OtpPurpose";
DROP TYPE IF EXISTS "Plan";
