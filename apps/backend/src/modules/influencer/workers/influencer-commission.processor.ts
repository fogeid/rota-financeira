import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { INFLUENCER_COMMISSION_QUEUE, JOB_MONTHLY_COMMISSION } from '../influencer.constants';
import { InfluencerService } from '../influencer.service';

@Processor(INFLUENCER_COMMISSION_QUEUE)
export class InfluencerCommissionProcessor extends WorkerHost {
  constructor(private readonly influencerService: InfluencerService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === JOB_MONTHLY_COMMISSION) {
      await this.influencerService.processMonthlyCommissions();
    }
  }
}
