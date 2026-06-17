import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EarningOrigin } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { firstDayOfMonth, lastDayOfMonth } from '../../common/utils/financial-calculations';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEarningDto } from './dto/create-earning.dto';
import { ListEarningsDto } from './dto/list-earnings.dto';

@Injectable()
export class EarningsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, dto: ListEarningsDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      user_id: userId,
      ...(dto.platform && { platform: dto.platform }),
      ...(dto.date_from || dto.date_to
        ? {
            earned_at: {
              ...(dto.date_from && { gte: new Date(dto.date_from) }),
              ...(dto.date_to && { lte: new Date(dto.date_to) }),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.earning.findMany({
        where,
        orderBy: { earned_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.earning.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, total_pages: Math.ceil(total / limit) },
    };
  }

  async create(userId: string, dto: CreateEarningDto) {
    return this.prisma.earning.create({
      data: {
        user_id: userId,
        platform: dto.platform,
        amount: dto.amount,
        km_driven: dto.km_driven ?? null,
        started_at: new Date(dto.started_at),
        earned_at: new Date(dto.earned_at),
        origin: EarningOrigin.MANUAL,
      },
    });
  }

  async getSummary(userId: string, period: string = 'month', month?: string) {
    const now = new Date();
    let start: Date;
    let end: Date;

    if (period === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (period === 'week') {
      start = new Date(now.getTime() - 6 * 86_400_000);
      start.setHours(0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else {
      const refDate = month ? new Date(`${month}-01`) : now;
      start = firstDayOfMonth(refDate);
      end = lastDayOfMonth(refDate);
    }

    const earnings = await this.prisma.earning.findMany({
      where: { user_id: userId, earned_at: { gte: start, lte: end } },
      orderBy: { started_at: 'asc' },
    });

    const totalGross = earnings.reduce((s, e) => s + Number(e.amount as Decimal), 0);
    const totalTrips = earnings.length;

    const daysWorked = new Set(earnings.map((e) => new Date(e.earned_at).toISOString().slice(0, 10))).size;

    const hourlyMap = new Map<number, number>();
    for (const e of earnings) {
      const hour = new Date(e.started_at).getHours();
      hourlyMap.set(hour, (hourlyMap.get(hour) ?? 0) + Number(e.amount as Decimal));
    }
    let bestHour: number | null = null;
    let bestAmount = 0;
    for (const [hour, amount] of hourlyMap.entries()) {
      if (amount > bestAmount) {
        bestAmount = amount;
        bestHour = hour;
      }
    }

    const byPlatformRows = await this.prisma.earning.groupBy({
      by: ['platform'],
      where: { user_id: userId, earned_at: { gte: start, lte: end } },
      _sum: { amount: true },
    });

    const byPlatform: Record<string, number> = {};
    for (const p of byPlatformRows) {
      byPlatform[p.platform] = Math.round(Number((p._sum.amount as Decimal | null) ?? 0) * 100) / 100;
    }

    return {
      period,
      gross_total: Math.round(totalGross * 100) / 100,
      trips_count: totalTrips,
      days_worked: daysWorked,
      best_hour: bestHour !== null ? String(bestHour).padStart(2, '0') : null,
      by_platform: byPlatform,
    };
  }

  async delete(userId: string, earningId: string) {
    const earning = await this.prisma.earning.findUnique({ where: { id: earningId } });
    if (!earning) throw new NotFoundException('Ganho não encontrado');
    if (earning.user_id !== userId) throw new ForbiddenException();
    if (earning.origin !== EarningOrigin.MANUAL) {
      throw new ForbiddenException('Apenas ganhos manuais podem ser excluídos');
    }
    await this.prisma.earning.delete({ where: { id: earningId } });
    return { message: 'Ganho excluído com sucesso' };
  }
}
