import {
  Body, Controller, Delete, Get, Header, HttpCode, HttpStatus,
  Param, ParseEnumPipe, Post, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
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
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate')
  @Header('Pragma', 'no-cache')
  @ApiOperation({ summary: 'Status de todas as plataformas conectadas' })
  getStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.integrationsService.getStatus(user.sub);
  }

  @Post(':platform/sync')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Força sync manual de uma plataforma' })
  triggerSync(
    @CurrentUser() user: AuthenticatedUser,
    @Param('platform', new ParseEnumPipe(Platform)) platform: Platform,
  ) {
    return this.integrationsService.triggerManualSync(user.sub, platform);
  }

  @Post(':platform/import-csv')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Importa histórico de corridas a partir de CSV exportado da plataforma' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  importCSV(
    @CurrentUser() user: AuthenticatedUser,
    @Param('platform', new ParseEnumPipe(Platform)) platform: Platform,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.integrationsService.importCSV(user.sub, platform, file.buffer);
  }

  @Delete(':platform')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desconecta uma plataforma e remove as credenciais imediatamente' })
  disconnect(
    @CurrentUser() user: AuthenticatedUser,
    @Param('platform', new ParseEnumPipe(Platform)) platform: Platform,
  ) {
    return this.integrationsService.disconnect(user.sub, platform);
  }
}
