import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { INFLUENCER_COMMISSION_QUEUE } from './influencer.constants';
import { InfluencerController } from './influencer.controller';
import { InfluencerService } from './influencer.service';
import { InfluencerCommissionProcessor } from './workers/influencer-commission.processor';
import { InfluencerCommissionSchedulerService } from './workers/influencer-commission-scheduler.service';
import { ReferralModule } from '../referral/referral.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: INFLUENCER_COMMISSION_QUEUE }),
    ReferralModule,
  ],
  controllers: [InfluencerController],
  providers: [InfluencerService, InfluencerCommissionProcessor, InfluencerCommissionSchedulerService],
  exports: [InfluencerService],
})
export class InfluencerModule {}
