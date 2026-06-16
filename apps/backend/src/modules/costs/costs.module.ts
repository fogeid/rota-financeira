import { Module } from '@nestjs/common';
import { AlertsModule } from '../alerts/alerts.module';
import { CostsController } from './costs.controller';
import { CostsService } from './costs.service';

@Module({
  imports: [AlertsModule],
  controllers: [CostsController],
  providers: [CostsService],
  exports: [CostsService],
})
export class CostsModule {}
