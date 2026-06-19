import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { INFLUENCER_COMMISSION_QUEUE, JOB_MONTHLY_COMMISSION } from '../influencer.constants';

@Injectable()
export class InfluencerCommissionSchedulerService implements OnModuleInit {
  constructor(
    @InjectQueue(INFLUENCER_COMMISSION_QUEUE) private readonly queue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queue.add(
      JOB_MONTHLY_COMMISSION,
      {},
      { repeat: { pattern: '0 4 1 * *' }, jobId: `${JOB_MONTHLY_COMMISSION}-recurring` },
    );
  }
}
