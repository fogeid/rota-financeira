import { Body, Controller, Get, HttpCode, HttpStatus, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { UpsertFinancingDto } from './dto/upsert-financing.dto';
import { FinancingService } from './financing.service';

@ApiTags('financing')
@ApiBearerAuth()
@Controller('financing')
export class FinancingController {
  constructor(private readonly financingService: FinancingService) {}

  @Post('me')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cadastra o financiamento do motorista' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertFinancingDto) {
    return this.financingService.create(user.sub, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Retorna o financiamento do motorista' })
  getMyFinancing(@CurrentUser() user: AuthenticatedUser) {
    return this.financingService.getMyFinancing(user.sub);
  }

  @Put('me')
  @ApiOperation({ summary: 'Atualiza o financiamento e recalcula metas' })
  update(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertFinancingDto) {
    return this.financingService.update(user.sub, dto);
  }

  @Get('progress')
  @ApiOperation({ summary: 'Progresso do mês atual em relação à parcela' })
  getProgress(@CurrentUser() user: AuthenticatedUser) {
    return this.financingService.getProgress(user.sub);
  }
}
