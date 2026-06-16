import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CostType } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CostsService } from './costs.service';
import { CreateCostDto } from './dto/create-cost.dto';

@ApiTags('costs')
@ApiBearerAuth()
@Controller('costs')
export class CostsController {
  constructor(private readonly costsService: CostsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registra custo (combustível, manutenção, outros)' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCostDto) {
    return this.costsService.create(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista custos do mês com filtro opcional por tipo' })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('type') type?: CostType,
    @Query('month') month?: string,
  ) {
    return this.costsService.list(user.sub, type, month);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Resumo de custos do mês (total, por tipo, custo/km)' })
  getSummary(@CurrentUser() user: AuthenticatedUser, @Query('month') month?: string) {
    return this.costsService.getSummary(user.sub, month);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exclui custo' })
  delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.costsService.delete(user.sub, id);
  }
}
