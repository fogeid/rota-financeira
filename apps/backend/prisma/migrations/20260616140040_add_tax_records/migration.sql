-- CreateEnum
CREATE TYPE "TaxStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE');

-- DropIndex
DROP INDEX "idx_costs_user_type_date";

-- DropIndex
DROP INDEX "idx_earnings_user_date";

-- DropIndex
DROP INDEX "idx_login_attempts_cpf_time";

-- DropIndex
DROP INDEX "idx_otp_phone_expires";

-- CreateTable
CREATE TABLE "tax_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "month" DATE NOT NULL,
    "status" "TaxStatus" NOT NULL DEFAULT 'PENDING',
    "tax_amount" DECIMAL(10,2) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tax_records_user_id_month_key" ON "tax_records"("user_id", "month");

-- AddForeignKey
ALTER TABLE "tax_records" ADD CONSTRAINT "tax_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
