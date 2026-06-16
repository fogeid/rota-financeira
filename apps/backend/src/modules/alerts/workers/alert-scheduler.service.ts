import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ALERT_ENGINE_QUEUE } from '../alerts.constants';
import { JOB_CHECK_F65, JOB_CHECK_F66, JOB_CHECK_F67 } from './alert-engine.processor';

@Injectable()
export class AlertSchedulerService implements OnModuleInit {
  constructor(@InjectQueue(ALERT_ENGINE_QUEUE) private readonly queue: Queue) {}

  async onModuleInit(): Promise<void> {
    // F65: every hour between 10h–22h (Brasília). The processor checks the hour itself.
    // Cron runs every hour — processor skips if outside the window.
    await this.queue.add(JOB_CHECK_F65, {}, {
      repeat: { pattern: '0 * * * *' },
      removeOnComplete: true,
      removeOnFail: false,
    });

    // F66: daily at 20h Brasília (23h UTC)
    await this.queue.add(JOB_CHECK_F66, {}, {
      repeat: { pattern: '0 23 * * *' },
      removeOnComplete: true,
      removeOnFail: false,
    });

    // F67: daily at 8h Brasília (11h UTC)
    await this.queue.add(JOB_CHECK_F67, {}, {
      repeat: { pattern: '0 11 * * *' },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }
}
