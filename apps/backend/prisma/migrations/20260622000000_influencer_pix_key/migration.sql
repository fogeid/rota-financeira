-- AddColumn: pix_key to influencer_profiles (optional, for monthly payment via PIX)
ALTER TABLE "influencer_profiles" ADD COLUMN "pix_key" TEXT;
