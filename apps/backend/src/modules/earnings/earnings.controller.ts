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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CreateEarningDto } from './dto/create-earning.dto';
import { ListEarningsDto } from './dto/list-earnings.dto';
import { EarningsService } from './earnings.service';

@ApiTags('earnings')
@ApiBearerAuth()
@Controller('earnings')
export class EarningsController {
  constructor(private readonly earningsService: EarningsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista ganhos com filtros e paginação' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() dto: ListEarningsDto) {
    return this.earningsService.list(user.sub, dto);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registra ganho manual' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateEarningDto) {
    return this.earningsService.create(user.sub, dto);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Resumo de ganhos do mês (total, por plataforma, melhor hora)' })
  getSummary(@CurrentUser() user: AuthenticatedUser, @Query('month') month?: string) {
    return this.earningsService.getSummary(user.sub, month);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exclui ganho manual (não exclui ganhos sincronizados)' })
  delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.earningsService.delete(user.sub, id);
  }
}
