import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { IntegrationsController } from './integrations.controller';
import { PLATFORM_SYNC_QUEUE } from './integrations.constants';
import { IntegrationsService } from './integrations.service';
import { PlatformSyncProcessor } from './workers/platform-sync.processor';
import { SyncSchedulerService } from './workers/sync-scheduler.service';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [
    AlertsModule,
    BullModule.registerQueue({ name: PLATFORM_SYNC_QUEUE }),
  ],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, PlatformSyncProcessor, SyncSchedulerService],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
