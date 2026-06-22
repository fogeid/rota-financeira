-- CreateEnum
CREATE TYPE "ReferralType" AS ENUM ('USER', 'INFLUENCER');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('REGISTERED', 'TRIAL', 'CONVERTED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "InfluencerTier" AS ENUM ('MICRO', 'MEDIUM', 'LARGE', 'EXCLUSIVE');

-- CreateEnum
CREATE TYPE "InfluencerStatus" AS ENUM ('PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'CASHBACK_PENDING';
ALTER TYPE "NotificationType" ADD VALUE 'CASHBACK_AVAILABLE';

-- CreateTable
CREATE TABLE "referral_codes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "slug" TEXT,
    "type" "ReferralType" NOT NULL DEFAULT 'USER',
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "referral_code_id" TEXT NOT NULL,
    "referred_user_id" TEXT NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'REGISTERED',
    "cashback_amount" DECIMAL(6,2),
    "cashback_paid_at" TIMESTAMP(3),
    "converted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_balances" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "available" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "pending" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_earned" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_withdrawn" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referral_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_withdrawals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "pix_key" TEXT NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "influencer_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "channel_name" TEXT NOT NULL,
    "channel_url" TEXT NOT NULL,
    "followers" INTEGER NOT NULL,
    "niche" TEXT NOT NULL,
    "tier" "InfluencerTier" NOT NULL,
    "status" "InfluencerStatus" NOT NULL DEFAULT 'PENDING',
    "commission_rate" DECIMAL(4,2) NOT NULL,
    "bonus_threshold" INTEGER,
    "bonus_amount" DECIMAL(8,2),
    "approved_at" TIMESTAMP(3),
    "contract_signed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "influencer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "influencer_commissions" (
    "id" TEXT NOT NULL,
    "influencer_id" TEXT NOT NULL,
    "reference_month" DATE NOT NULL,
    "active_subscribers" INTEGER NOT NULL,
    "commission_amount" DECIMAL(10,2) NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "influencer_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "referral_codes_user_id_key" ON "referral_codes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "referral_codes_code_key" ON "referral_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "referral_codes_slug_key" ON "referral_codes"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referred_user_id_key" ON "referrals"("referred_user_id");

-- CreateIndex
CREATE INDEX "referrals_referral_code_id_idx" ON "referrals"("referral_code_id");

-- CreateIndex
CREATE UNIQUE INDEX "referral_balances_user_id_key" ON "referral_balances"("user_id");

-- CreateIndex
CREATE INDEX "referral_withdrawals_user_id_idx" ON "referral_withdrawals"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "influencer_profiles_user_id_key" ON "influencer_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "influencer_commissions_influencer_id_reference_month_key" ON "influencer_commissions"("influencer_id", "reference_month");

-- AddForeignKey
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referral_code_id_fkey" FOREIGN KEY ("referral_code_id") REFERENCES "referral_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_user_id_fkey" FOREIGN KEY ("referred_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_balances" ADD CONSTRAINT "referral_balances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_withdrawals" ADD CONSTRAINT "referral_withdrawals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "influencer_profiles" ADD CONSTRAINT "influencer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "influencer_commissions" ADD CONSTRAINT "influencer_commissions_influencer_id_fkey" FOREIGN KEY ("influencer_id") REFERENCES "influencer_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
