import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CostType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  calculateCostPerKm,
  firstDayOfMonth,
  lastDayOfMonth,
} from '../../common/utils/financial-calculations';
import { PrismaService } from '../../prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { CreateCostDto } from './dto/create-cost.dto';

@Injectable()
export class CostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alertsService: AlertsService,
  ) {}

  async create(userId: string, dto: CreateCostDto) {
    const cost = await this.prisma.cost.create({
      data: {
        user_id: userId,
        type: dto.type,
        amount: dto.amount,
        description: dto.description,
        cost_date: new Date(dto.cost_date),
        ...(dto.type === CostType.FUEL && {
          fuel_log: {
            create: {
              gas_station: dto.gas_station ?? dto.description ?? 'Não informado',
              liters: dto.liters ?? 0,
              price_per_liter: dto.price_per_liter ?? 0,
              odometer_km: dto.odometer_km ?? 0,
            },
          },
        }),
        ...(dto.type === CostType.MAINTENANCE && {
          maintenance: {
            create: {
              service_type: dto.service_type ?? dto.description ?? 'Manutenção',
              current_odometer_km: dto.current_odometer_km ?? 0,
              next_service_km: dto.next_service_km ?? null,
              reminder_enabled: dto.reminder_enabled ?? false,
            },
          },
        }),
      },
      include: { fuel_log: true, maintenance: true },
    });

    // F69: check cost/km alert after any fuel registration
    if (dto.type === CostType.FUEL) {
      void this.alertsService.checkHighCostPerKm(userId);
    }

    return cost;
  }

  async list(userId: string, type?: CostType, month?: string) {
    const refDate = month ? new Date(`${month}-01`) : new Date();
    const start = firstDayOfMonth(refDate);
    const end = lastDayOfMonth(refDate);

    return this.prisma.cost.findMany({
      where: {
        user_id: userId,
        cost_date: { gte: start, lte: end },
        ...(type && { type }),
      },
      include: { fuel_log: true, maintenance: true },
      orderBy: { cost_date: 'desc' },
    });
  }

  async getSummary(userId: string, month?: string) {
    const refDate = month ? new Date(`${month}-01`) : new Date();
    const start = firstDayOfMonth(refDate);
    const end = lastDayOfMonth(refDate);

    const costs = await this.prisma.cost.findMany({
      where: { user_id: userId, cost_date: { gte: start, lte: end } },
      include: { fuel_log: true },
    });

    const totalAmount = costs.reduce((s, c) => s + Number(c.amount as Decimal), 0);
    const totalFuel = costs
      .filter((c) => c.type === CostType.FUEL)
      .reduce((s, c) => s + Number(c.amount as Decimal), 0);

    const fuelLogs = costs.filter((c) => c.fuel_log != null).map((c) => c.fuel_log!);
    const odometers = fuelLogs.map((f) => Number(f.odometer_km as Decimal)).sort((a, b) => a - b);
    const firstOdometer = odometers.length > 0 ? odometers[0] : null;
    const lastOdometer = odometers.length > 0 ? odometers[odometers.length - 1] : null;

    const costPerKm = calculateCostPerKm(totalFuel, firstOdometer, lastOdometer);

    const byType = await this.prisma.cost.groupBy({
      by: ['type'],
      where: { user_id: userId, cost_date: { gte: start, lte: end } },
      _sum: { amount: true },
      _count: { id: true },
    });

    const kmDriven = Math.max(0, (lastOdometer ?? 0) - (firstOdometer ?? 0));

    const byTypeRecord: Record<string, { total: number; percentage: number }> = {};
    for (const b of byType) {
      const typeTotal = Math.round(Number((b._sum.amount as Decimal | null) ?? 0) * 100) / 100;
      byTypeRecord[b.type] = {
        total: typeTotal,
        percentage: totalAmount > 0 ? Math.round((typeTotal / totalAmount) * 100) : 0,
      };
    }

    return {
      month: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`,
      total: Math.round(totalAmount * 100) / 100,
      total_fuel: Math.round(totalFuel * 100) / 100,
      km_driven: kmDriven,
      cost_per_km: costPerKm,
      by_type: byTypeRecord,
    };
  }

  async delete(userId: string, costId: string) {
    const cost = await this.prisma.cost.findUnique({ where: { id: costId } });
    if (!cost) throw new NotFoundException('Custo não encontrado');
    if (cost.user_id !== userId) throw new ForbiddenException();
    await this.prisma.cost.delete({ where: { id: costId } });
    return { message: 'Custo excluído com sucesso' };
  }
}
