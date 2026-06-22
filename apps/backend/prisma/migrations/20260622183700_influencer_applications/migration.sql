-- DropIndex
DROP INDEX "costs_user_id_cost_date_idx";

-- DropIndex
DROP INDEX "costs_user_id_type_idx";

-- DropIndex
DROP INDEX "earnings_user_id_earned_at_idx";

-- DropIndex
DROP INDEX "notifications_user_id_created_at_idx";

-- DropIndex
DROP INDEX "referrals_referral_code_id_idx";

-- CreateTable
CREATE TABLE "influencer_applications" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "channel_name" TEXT NOT NULL,
    "channel_url" TEXT NOT NULL,
    "followers" INTEGER NOT NULL,
    "niche" TEXT NOT NULL,
    "tier" "InfluencerTier" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "influencer_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "influencer_applications_email_key" ON "influencer_applications"("email");

-- CreateIndex
CREATE INDEX "costs_user_id_cost_date_idx" ON "costs"("user_id", "cost_date" DESC);

-- CreateIndex
CREATE INDEX "costs_user_id_type_cost_date_idx" ON "costs"("user_id", "type", "cost_date" DESC);

-- CreateIndex
CREATE INDEX "earnings_user_id_earned_at_idx" ON "earnings"("user_id", "earned_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_created_at_idx" ON "notifications"("user_id", "read_at", "created_at" DESC);

-- CreateIndex
CREATE INDEX "referrals_referral_code_id_status_idx" ON "referrals"("referral_code_id", "status");
