import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AlertsController } from './alerts.controller';
import { ALERT_ENGINE_QUEUE } from './alerts.constants';
import { AlertsService } from './alerts.service';
import { AlertEngineProcessor } from './workers/alert-engine.processor';
import { AlertSchedulerService } from './workers/alert-scheduler.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    NotificationsModule,
    BullModule.registerQueue({ name: ALERT_ENGINE_QUEUE }),
  ],
  controllers: [AlertsController],
  providers: [AlertsService, AlertEngineProcessor, AlertSchedulerService],
  exports: [AlertsService],
})
export class AlertsModule {}
