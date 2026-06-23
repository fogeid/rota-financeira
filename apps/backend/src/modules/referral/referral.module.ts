import { Module } from '@nestjs/common';
import { CacheModule } from '../../cache/cache.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReferralController } from './referral.controller';
import { ReferralService } from './referral.service';

@Module({
  imports: [CacheModule, NotificationsModule],
  controllers: [ReferralController],
  providers: [ReferralService],
  exports: [ReferralService],
})
export class ReferralModule {}
