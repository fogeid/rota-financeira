-- Reverter migração add_tax_records
ALTER TABLE "tax_records" DROP CONSTRAINT IF EXISTS "tax_records_user_id_fkey";
DROP INDEX IF EXISTS "tax_records_user_id_month_key";
DROP TABLE IF EXISTS "tax_records";
DROP TYPE IF EXISTS "TaxStatus";
