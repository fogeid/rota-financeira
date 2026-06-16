import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PLATFORM_SYNC_QUEUE } from '../integrations.constants';
import { JOB_SYNC_DISPATCH } from './platform-sync.processor';

@Injectable()
export class SyncSchedulerService implements OnModuleInit {
  constructor(@InjectQueue(PLATFORM_SYNC_QUEUE) private readonly queue: Queue) {}

  async onModuleInit(): Promise<void> {
    // Daily sync at 04h Brasília (07h UTC) — docs/06-BUSINESS-RULES.md seção 12
    await this.queue.add(JOB_SYNC_DISPATCH, {}, {
      repeat: { pattern: '0 7 * * *' },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }
}
