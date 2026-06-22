import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsModule } from '../notifications/notifications.module';
import { REFERRAL_CASHBACK_QUEUE } from './referral.constants';
import { ReferralController } from './referral.controller';
import { ReferralService } from './referral.service';
import { ReferralCashbackProcessor } from './workers/referral-cashback.processor';
import { ReferralSchedulerService } from './workers/referral-scheduler.service';

@Module({
  imports: [
    NotificationsModule,
    BullModule.registerQueue({ name: REFERRAL_CASHBACK_QUEUE }),
  ],
  controllers: [ReferralController],
  providers: [ReferralService, ReferralCashbackProcessor, ReferralSchedulerService],
  exports: [ReferralService],
})
export class ReferralModule {}
