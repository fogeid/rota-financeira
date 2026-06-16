import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { UpsertVehicleDto } from './dto/upsert-vehicle.dto';
import { VehiclesService } from './vehicles.service';

@ApiTags('vehicles')
@ApiBearerAuth()
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastra veículo do motorista' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertVehicleDto) {
    return this.vehiclesService.create(user.sub, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Retorna o veículo do motorista' })
  getMyVehicle(@CurrentUser() user: AuthenticatedUser) {
    return this.vehiclesService.getMyVehicle(user.sub);
  }

  @Put('me')
  @ApiOperation({ summary: 'Atualiza o veículo do motorista' })
  update(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertVehicleDto) {
    return this.vehiclesService.update(user.sub, dto);
  }
}
