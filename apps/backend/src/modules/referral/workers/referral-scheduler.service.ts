import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { REFERRAL_CASHBACK_QUEUE, JOB_PROCESS_D30 } from '../referral.constants';

@Injectable()
export class ReferralSchedulerService implements OnModuleInit {
  constructor(
    @InjectQueue(REFERRAL_CASHBACK_QUEUE) private readonly queue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queue.add(
      JOB_PROCESS_D30,
      {},
      { repeat: { pattern: '0 3 * * *' }, jobId: `${JOB_PROCESS_D30}-recurring` },
    );
  }
}
