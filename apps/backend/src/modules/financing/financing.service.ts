import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import {
  calculateInstallmentProgress,
  firstDayOfMonth,
  lastDayOfMonth,
} from '../../common/utils/financial-calculations';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertFinancingDto } from './dto/upsert-financing.dto';
import { GoalsService } from './goals.service';

@Injectable()
export class FinancingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly goalsService: GoalsService,
  ) {}

  async create(userId: string, dto: UpsertFinancingDto) {
    const existing = await this.prisma.financing.findUnique({ where: { user_id: userId } });
    if (existing) {
      throw new ConflictException('Financiamento já cadastrado. Use PUT /financing/me para atualizar.');
    }

    const financing = await this.prisma.financing.create({
      data: {
        user_id: userId,
        monthly_installment: dto.monthly_installment,
        due_day: dto.due_day,
        desired_income: dto.desired_income,
        work_days_per_month: dto.work_days_per_month,
      },
    });

    await this.goalsService.recalculate(
      userId,
      dto.monthly_installment,
      dto.desired_income,
      dto.work_days_per_month,
    );

    return financing;
  }

  async getMyFinancing(userId: string) {
    const financing = await this.prisma.financing.findUnique({ where: { user_id: userId } });
    if (!financing) throw new NotFoundException('Nenhum financiamento cadastrado');
    return financing;
  }

  async update(userId: string, dto: UpsertFinancingDto) {
    const existing = await this.prisma.financing.findUnique({ where: { user_id: userId } });
    if (!existing) throw new NotFoundException('Nenhum financiamento cadastrado. Use POST /financing para criar.');

    const financing = await this.prisma.financing.update({
      where: { user_id: userId },
      data: {
        monthly_installment: dto.monthly_installment,
        due_day: dto.due_day,
        desired_income: dto.desired_income,
        work_days_per_month: dto.work_days_per_month,
      },
    });

    await this.goalsService.recalculate(
      userId,
      dto.monthly_installment,
      dto.desired_income,
      dto.work_days_per_month,
    );

    return financing;
  }

  async getProgress(userId: string) {
    const financing = await this.prisma.financing.findUnique({ where: { user_id: userId } });
    if (!financing) throw new NotFoundException('Nenhum financiamento cadastrado');

    const now = new Date();
    const start = firstDayOfMonth(now);
    const end = lastDayOfMonth(now);

    const earningsAgg = await this.prisma.earning.aggregate({
      where: { user_id: userId, earned_at: { gte: start, lte: end } },
      _sum: { amount: true },
    });
    const costsAgg = await this.prisma.cost.aggregate({
      where: { user_id: userId, cost_date: { gte: start, lte: end } },
      _sum: { amount: true },
    });

    const grossIncome = Number((earningsAgg._sum.amount as Decimal | null) ?? 0);
    const totalCosts = Number((costsAgg._sum.amount as Decimal | null) ?? 0);
    const accumulatedNetIncome = grossIncome - totalCosts;
    const installment = Number(financing.monthly_installment as Decimal);

    const progress = calculateInstallmentProgress(accumulatedNetIncome, installment);

    const goal = await this.prisma.goal.findUnique({
      where: {
        user_id_reference_month: {
          user_id: userId,
          reference_month: firstDayOfMonth(now),
        },
      },
    });

    return {
      monthly_installment: installment,
      due_day: financing.due_day,
      accumulated_net_income: Math.round(accumulatedNetIncome * 100) / 100,
      progress_percentage: progress,
      daily_goal: goal ? Number(goal.daily_goal as Decimal) : null,
      monthly_goal: goal ? Number(goal.monthly_goal as Decimal) : null,
    };
  }
}
