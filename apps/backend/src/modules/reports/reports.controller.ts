import { Controller, Get, Param, ParseIntPipe, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePlan } from '../../common/decorators/require-plan.decorator';
import { PlanGuard } from '../../common/guards/plan.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('monthly/:month')
  @ApiOperation({ summary: 'Relatório mensal (ex: 2026-06)' })
  getMonthly(@CurrentUser() user: AuthenticatedUser, @Param('month') month: string) {
    return this.reportsService.getMonthlyReport(user.sub, month);
  }

  @Get('monthly/:month/pdf')
  @UseGuards(PlanGuard)
  @RequirePlan('PRO')
  @ApiOperation({ summary: 'Relatório mensal em PDF (somente plano PRO)' })
  async getMonthlyPdf(
    @CurrentUser() user: AuthenticatedUser,
    @Param('month') month: string,
    @Res() res: Response,
  ) {
    const pdf = await this.reportsService.generateMonthlyPdf(user.sub, month);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="relatorio-${month}.pdf"`,
      'Content-Length': pdf.length,
    });
    res.end(pdf);
  }

  @Get('annual/:year')
  @ApiOperation({ summary: 'Relatório anual' })
  getAnnual(
    @CurrentUser() user: AuthenticatedUser,
    @Param('year', ParseIntPipe) year: number,
  ) {
    return this.reportsService.getAnnualReport(user.sub, year);
  }
}
