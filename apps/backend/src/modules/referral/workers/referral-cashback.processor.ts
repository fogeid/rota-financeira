import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { REFERRAL_CASHBACK_QUEUE, JOB_PROCESS_D30 } from '../referral.constants';
import { ReferralService } from '../referral.service';

@Processor(REFERRAL_CASHBACK_QUEUE)
export class ReferralCashbackProcessor extends WorkerHost {
  constructor(private readonly referralService: ReferralService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === JOB_PROCESS_D30) {
      await this.referralService.releaseD30Cashback();
    }
  }
}
