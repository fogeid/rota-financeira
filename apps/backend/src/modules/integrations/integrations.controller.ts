import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Platform } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { ConnectIntegrationDto } from './dto/connect-integration.dto';
import { IntegrationsService } from './integrations.service';

@ApiTags('integrations')
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Post('connect')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Conecta uma plataforma e inicia o sync' })
  connect(@CurrentUser() user: AuthenticatedUser, @Body() dto: ConnectIntegrationDto) {
    return this.integrationsService.connect(user.sub, dto);
  }

  @Get('status')
  @ApiOperation({ summary: 'Status de todas as plataformas conectadas' })
  getStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.integrationsService.getStatus(user.sub);
  }

  @Post(':platform/sync')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Força sync manual de uma plataforma' })
  triggerSync(
    @CurrentUser() user: AuthenticatedUser,
    @Param('platform') platform: Platform,
  ) {
    return this.integrationsService.triggerManualSync(user.sub, platform);
  }

  @Delete(':platform')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desconecta uma plataforma e remove as credenciais imediatamente' })
  disconnect(
    @CurrentUser() user: AuthenticatedUser,
    @Param('platform') platform: Platform,
  ) {
    return this.integrationsService.disconnect(user.sub, platform);
  }
}
