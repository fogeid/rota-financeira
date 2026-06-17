import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { JOB_CHECK_EXPIRED_SUBSCRIPTIONS, JOB_CHECK_TRIAL_EXPIRY, SUBSCRIPTION_QUEUE } from '../subscriptions.constants';
import { SubscriptionsService } from '../subscriptions.service';

@Processor(SUBSCRIPTION_QUEUE)
export class SubscriptionQueueProcessor extends WorkerHost {
  constructor(private readonly subscriptionsService: SubscriptionsService) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case JOB_CHECK_TRIAL_EXPIRY:
        await this.subscriptionsService.expireTrials();
        break;
      case JOB_CHECK_EXPIRED_SUBSCRIPTIONS:
        await this.subscriptionsService.expireCanceledSubscriptions();
        break;
    }
  }
}
