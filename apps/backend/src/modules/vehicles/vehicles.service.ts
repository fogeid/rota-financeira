import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertVehicleDto } from './dto/upsert-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: UpsertVehicleDto) {
    const existing = await this.prisma.vehicle.findUnique({ where: { user_id: userId } });
    if (existing) {
      throw new ConflictException('Usuário já possui um veículo cadastrado. Use PUT /vehicles/me para atualizar.');
    }

    return this.prisma.vehicle.create({
      data: {
        user_id: userId,
        model: dto.model,
        year: dto.year,
        plate: dto.plate.toUpperCase(),
        fuel_efficiency: dto.fuel_efficiency,
      },
    });
  }

  async getMyVehicle(userId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { user_id: userId } });
    if (!vehicle) throw new NotFoundException('Nenhum veículo cadastrado');
    return vehicle;
  }

  async update(userId: string, dto: UpsertVehicleDto) {
    const existing = await this.prisma.vehicle.findUnique({ where: { user_id: userId } });
    if (!existing) throw new NotFoundException('Nenhum veículo cadastrado. Use POST /vehicles para criar.');

    return this.prisma.vehicle.update({
      where: { user_id: userId },
      data: {
        model: dto.model,
        year: dto.year,
        plate: dto.plate.toUpperCase(),
        fuel_efficiency: dto.fuel_efficiency,
      },
    });
  }
}
