import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  JOB_CHECK_EXPIRED_SUBSCRIPTIONS,
  JOB_CHECK_TRIAL_EXPIRY,
  SUBSCRIPTION_QUEUE,
} from '../subscriptions.constants';

@Injectable()
export class SubscriptionSchedulerService implements OnModuleInit {
  constructor(@InjectQueue(SUBSCRIPTION_QUEUE) private readonly queue: Queue) {}

  async onModuleInit(): Promise<void> {
    // Checa trials expirados diariamente às 02h UTC (23h Brasília)
    await this.queue.add(
      JOB_CHECK_TRIAL_EXPIRY,
      {},
      {
        repeat: { pattern: '0 2 * * *' },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    // Checa subscriptions canceladas com period_end no passado — diariamente às 02h UTC
    await this.queue.add(
      JOB_CHECK_EXPIRED_SUBSCRIPTIONS,
      {},
      {
        repeat: { pattern: '5 2 * * *' },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }
}
