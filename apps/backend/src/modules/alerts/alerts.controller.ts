import { Body, Controller, Get, HttpCode, HttpStatus, Patch } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { AlertsService } from './alerts.service';
import { UpdateAlertPreferencesDto } from './dto/update-alert-preferences.dto';

@ApiTags('alerts')
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get('preferences')
  @ApiOperation({ summary: 'Lista preferências de alerta do usuário' })
  getPreferences(@CurrentUser() user: AuthenticatedUser) {
    return this.alertsService.getPreferences(user.sub);
  }

  @Patch('preferences')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualiza preferências de alerta' })
  updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateAlertPreferencesDto,
  ) {
    return this.alertsService.updatePreferences(user.sub, dto.preferences);
  }
}
