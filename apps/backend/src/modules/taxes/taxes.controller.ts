import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { UpdateTaxStatusDto } from './dto/update-tax-status.dto';
import { TaxesService } from './taxes.service';

@ApiTags('taxes')
@ApiBearerAuth()
@Controller('taxes')
export class TaxesController {
  constructor(private readonly taxesService: TaxesService) {}

  @Get('monthly')
  @ApiOperation({ summary: 'Calcula IR do mês (Carnê-Leão 2026), ex: ?month=2026-06' })
  getMonthlyTax(
    @CurrentUser() user: AuthenticatedUser,
    @Query('month') month?: string,
  ) {
    return this.taxesService.getMonthlyTax(user.sub, month ?? new Date().toISOString().slice(0, 7));
  }

  @Get('annual/:year')
  @ApiOperation({ summary: 'Resumo anual de IR por mês' })
  getAnnualTax(
    @CurrentUser() user: AuthenticatedUser,
    @Param('year', ParseIntPipe) year: number,
  ) {
    return this.taxesService.getAnnualTax(user.sub, year);
  }

  @Patch(':month/status')
  @ApiOperation({ summary: 'Atualiza status do IR do mês (PENDING, PAID, OVERDUE)' })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('month') month: string,
    @Body() dto: UpdateTaxStatusDto,
  ) {
    return this.taxesService.updateStatus(user.sub, month, dto);
  }
}
