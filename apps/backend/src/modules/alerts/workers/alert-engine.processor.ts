import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ALERT_ENGINE_QUEUE } from '../alerts.constants';
import { AlertsService } from '../alerts.service';

export const JOB_CHECK_F65 = 'check-f65';
export const JOB_CHECK_F66 = 'check-f66';
export const JOB_CHECK_F67 = 'check-f67';

@Processor(ALERT_ENGINE_QUEUE)
export class AlertEngineProcessor extends WorkerHost {
  constructor(private readonly alertsService: AlertsService) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case JOB_CHECK_F65:
        await this.alertsService.checkGoalReachedForAllUsers();
        break;
      case JOB_CHECK_F66:
        await this.alertsService.checkBelowPaceForAllUsers();
        break;
      case JOB_CHECK_F67:
        await this.alertsService.checkInstallmentAtRiskForAllUsers();
        break;
    }
  }
}
