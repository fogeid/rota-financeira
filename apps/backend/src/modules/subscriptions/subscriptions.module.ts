import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PlanGuard } from '../../common/guards/plan.guard';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReferralModule } from '../referral/referral.module';
import { SUBSCRIPTION_QUEUE } from './subscriptions.constants';
import { PagarmeService } from './pagarme.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionQueueProcessor } from './workers/subscription-queue.processor';
import { SubscriptionSchedulerService } from './workers/subscription-scheduler.service';

@Module({
  imports: [
    NotificationsModule,
    ReferralModule,
    BullModule.registerQueue({ name: SUBSCRIPTION_QUEUE }),
  ],
  controllers: [SubscriptionsController],
  providers: [
    SubscriptionsService,
    PagarmeService,
    PlanGuard,
    SubscriptionQueueProcessor,
    SubscriptionSchedulerService,
  ],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
