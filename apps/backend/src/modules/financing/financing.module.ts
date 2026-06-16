import { Module } from '@nestjs/common';
import { FinancingController } from './financing.controller';
import { FinancingService } from './financing.service';
import { GoalsService } from './goals.service';

@Module({
  controllers: [FinancingController],
  providers: [FinancingService, GoalsService],
  exports: [GoalsService],
})
export class FinancingModule {}
