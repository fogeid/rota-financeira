import { Module } from '@nestjs/common';
import { PlanGuard } from '../../common/guards/plan.guard';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, PlanGuard],
})
export class ReportsModule {}
