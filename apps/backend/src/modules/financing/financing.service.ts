import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import {
  calculateInstallmentProgress,
  firstDayOfMonth,
  lastDayOfMonth,
  roundHalfUp,
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

    await this.prisma.financing.create({
      data: {
        user_id: userId,
        monthly_installment: dto.monthly_installment,
        due_day: dto.due_day,
        desired_income: dto.desired_income,
        work_days_per_month: dto.work_days_per_month,
        total_installments: dto.total_installments ?? null,
      },
    });

    await this.goalsService.recalculate(
      userId,
      dto.monthly_installment,
      dto.desired_income,
      dto.work_days_per_month,
    );

    return this.getMyFinancing(userId);
  }

  async getMyFinancing(userId: string) {
    const financing = await this.prisma.financing.findUnique({ where: { user_id: userId } });
    if (!financing) throw new NotFoundException('Nenhum financiamento cadastrado');

    const goal = await this.prisma.goal.findUnique({
      where: {
        user_id_reference_month: {
          user_id: userId,
          reference_month: firstDayOfMonth(new Date()),
        },
      },
    });

    return {
      monthly_installment: Number(financing.monthly_installment as Decimal),
      due_day: financing.due_day,
      desired_income: Number(financing.desired_income as Decimal),
      work_days_per_month: financing.work_days_per_month,
      total_installments: financing.total_installments,
      calculated_daily_goal: goal ? Number(goal.daily_goal as Decimal) : 0,
      monthly_goal: goal ? Number(goal.monthly_goal as Decimal) : 0,
    };
  }

  async update(userId: string, dto: UpsertFinancingDto) {
    const existing = await this.prisma.financing.findUnique({ where: { user_id: userId } });
    if (!existing) throw new NotFoundException('Nenhum financiamento cadastrado. Use POST /financing para criar.');

    await this.prisma.financing.update({
      where: { user_id: userId },
      data: {
        monthly_installment: dto.monthly_installment,
        due_day: dto.due_day,
        desired_income: dto.desired_income,
        work_days_per_month: dto.work_days_per_month,
        total_installments: dto.total_installments ?? null,
      },
    });

    await this.goalsService.recalculate(
      userId,
      dto.monthly_installment,
      dto.desired_income,
      dto.work_days_per_month,
    );

    return this.getMyFinancing(userId);
  }

  async getProgress(userId: string) {
    const financing = await this.prisma.financing.findUnique({ where: { user_id: userId } });
    if (!financing) throw new NotFoundException('Nenhum financiamento cadastrado');

    const now = new Date();
    const start = firstDayOfMonth(now);
    const end = lastDayOfMonth(now);

    const [earningsAgg, costsAgg, goal] = await Promise.all([
      this.prisma.earning.aggregate({
        where: { user_id: userId, earned_at: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      this.prisma.cost.aggregate({
        where: { user_id: userId, cost_date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      this.prisma.goal.findUnique({
        where: { user_id_reference_month: { user_id: userId, reference_month: start } },
      }),
    ]);

    const grossIncome = Number((earningsAgg._sum.amount as Decimal | null) ?? 0);
    const totalCosts = Number((costsAgg._sum.amount as Decimal | null) ?? 0);
    const accumulated = roundHalfUp(grossIncome - totalCosts);
    const installment = Number(financing.monthly_installment as Decimal);

    const percentage = calculateInstallmentProgress(accumulated, installment);
    const deficit = roundHalfUp(Math.max(0, installment - accumulated));

    // Days until next due date
    const todayDay = now.getDate();
    const dueDay = financing.due_day;
    let daysUntilDue: number;
    if (todayDay <= dueDay) {
      daysUntilDue = dueDay - todayDay;
    } else {
      const nextDue = new Date(now.getFullYear(), now.getMonth() + 1, dueDay);
      daysUntilDue = Math.ceil((nextDue.getTime() - now.getTime()) / 86400000);
    }

    const requiredDaily =
      deficit > 0 && daysUntilDue > 0 ? roundHalfUp(deficit / daysUntilDue) : 0;

    // Health status: installment as % of monthly goal
    const monthlyGoal = goal ? Number(goal.monthly_goal as Decimal) : installment;
    const ratio = monthlyGoal > 0 ? (installment / monthlyGoal) * 100 : 100;
    let healthStatus: 'GREEN' | 'AMBER' | 'RED';
    if (ratio < 40) healthStatus = 'GREEN';
    else if (ratio <= 50) healthStatus = 'AMBER';
    else healthStatus = 'RED';

    // Recovery tip
    let recoveryTip: string;
    if (deficit <= 0) {
      recoveryTip = 'Você está no caminho certo! Continue assim.';
    } else {
      const dailyGoal = goal ? Number(goal.daily_goal as Decimal) : 0;
      if (dailyGoal > 0 && daysUntilDue > 0) {
        const extraDays = Math.ceil(deficit / dailyGoal);
        recoveryTip = `Trabalhe ${extraDays} dia(s) a mais para cobrir o déficit de R$ ${deficit.toFixed(2)}`;
      } else {
        recoveryTip = `Faltam R$ ${deficit.toFixed(2)} para cobrir a parcela`;
      }
    }

    return {
      reference_month: start.toISOString().slice(0, 10),
      installment,
      accumulated,
      percentage,
      deficit,
      days_until_due: daysUntilDue,
      required_daily: requiredDaily,
      health_status: healthStatus,
      recovery_tip: recoveryTip,
    };
  }
}
