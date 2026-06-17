import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import type { Vehicle } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertVehicleDto } from './dto/upsert-vehicle.dto';

function serialize(v: Vehicle) {
  return {
    id: v.id,
    model: v.model,
    year: v.year,
    plate: v.plate,
    fuel_efficiency: Number(v.fuel_efficiency as Decimal),
  };
}

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: UpsertVehicleDto) {
    const existing = await this.prisma.vehicle.findUnique({ where: { user_id: userId } });
    if (existing) {
      throw new ConflictException('Usuário já possui um veículo cadastrado. Use PUT /vehicles/me para atualizar.');
    }

    const vehicle = await this.prisma.vehicle.create({
      data: {
        user_id: userId,
        model: dto.model,
        year: dto.year,
        plate: dto.plate.toUpperCase(),
        fuel_efficiency: dto.fuel_efficiency,
      },
    });
    return serialize(vehicle);
  }

  async getMyVehicle(userId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { user_id: userId } });
    if (!vehicle) throw new NotFoundException('Nenhum veículo cadastrado');
    return serialize(vehicle);
  }

  async update(userId: string, dto: UpsertVehicleDto) {
    const existing = await this.prisma.vehicle.findUnique({ where: { user_id: userId } });
    if (!existing) throw new NotFoundException('Nenhum veículo cadastrado. Use POST /vehicles para criar.');

    const vehicle = await this.prisma.vehicle.update({
      where: { user_id: userId },
      data: {
        model: dto.model,
        year: dto.year,
        plate: dto.plate.toUpperCase(),
        fuel_efficiency: dto.fuel_efficiency,
      },
    });
    return serialize(vehicle);
  }
}
