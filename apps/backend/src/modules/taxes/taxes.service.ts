import { Injectable, NotFoundException } from '@nestjs/common';
import { TaxStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  calculateMonthlyTax,
  firstDayOfMonth,
  lastDayOfMonth,
} from '../../common/utils/financial-calculations';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateTaxStatusDto } from './dto/update-tax-status.dto';

@Injectable()
export class TaxesService {
  constructor(private readonly prisma: PrismaService) {}

  async getMonthlyTax(userId: string, month: string) {
    const refDate = new Date(`${month}-01`);
    const start = firstDayOfMonth(refDate);
    const end = lastDayOfMonth(refDate);

    const [earningsAgg, fuelCosts, taxRecord] = await Promise.all([
      this.prisma.earning.aggregate({
        where: { user_id: userId, earned_at: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      this.prisma.cost.aggregate({
        where: { user_id: userId, type: 'FUEL', cost_date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      this.prisma.taxRecord.findUnique({
        where: { user_id_month: { user_id: userId, month: start } },
      }),
    ]);

    const grossIncome = Number((earningsAgg._sum.amount as Decimal | null) ?? 0);
    const fuelDeductions = Number((fuelCosts._sum.amount as Decimal | null) ?? 0);

    const result = calculateMonthlyTax(grossIncome, fuelDeductions);

    // Upsert do registro de imposto para persistir o valor calculado
    const saved = await this.prisma.taxRecord.upsert({
      where: { user_id_month: { user_id: userId, month: start } },
      create: {
        user_id: userId,
        month: start,
        tax_amount: result.tax_amount,
        status: TaxStatus.PENDING,
      },
      update: { tax_amount: result.tax_amount },
    });

    return {
      month,
      ...result,
      status: taxRecord?.status ?? saved.status,
      paid_at: taxRecord?.paid_at ?? null,
    };
  }

  async getAnnualTax(userId: string, year: number) {
    const months = [];
    let totalTax = 0;
    let totalGross = 0;

    for (let m = 1; m <= 12; m++) {
      const monthStr = `${year}-${String(m).padStart(2, '0')}`;
      const refDate = new Date(year, m - 1, 1);
      if (refDate > new Date()) break;

      const start = firstDayOfMonth(refDate);
      const end = lastDayOfMonth(refDate);

      const [earningsAgg, fuelAgg, taxRecord] = await Promise.all([
        this.prisma.earning.aggregate({
          where: { user_id: userId, earned_at: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
        this.prisma.cost.aggregate({
          where: { user_id: userId, type: 'FUEL', cost_date: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
        this.prisma.taxRecord.findUnique({
          where: { user_id_month: { user_id: userId, month: start } },
        }),
      ]);

      const gross = Number((earningsAgg._sum.amount as Decimal | null) ?? 0);
      const fuel = Number((fuelAgg._sum.amount as Decimal | null) ?? 0);
      const { tax_amount, tax_bracket } = calculateMonthlyTax(gross, fuel);

      totalTax += tax_amount;
      totalGross += gross;

      months.push({
        month: monthStr,
        gross_income: Math.round(gross * 100) / 100,
        tax_amount,
        tax_bracket,
        status: taxRecord?.status ?? TaxStatus.PENDING,
      });
    }

    return {
      year,
      months,
      total_gross: Math.round(totalGross * 100) / 100,
      total_tax: Math.round(totalTax * 100) / 100,
    };
  }

  async updateStatus(userId: string, month: string, dto: UpdateTaxStatusDto) {
    const refDate = new Date(`${month}-01`);
    const start = firstDayOfMonth(refDate);

    const existing = await this.prisma.taxRecord.findUnique({
      where: { user_id_month: { user_id: userId, month: start } },
    });
    if (!existing) {
      throw new NotFoundException(`Registro de imposto não encontrado para ${month}. Acesse GET /taxes/monthly?month=${month} primeiro.`);
    }

    const paid_at = dto.status === TaxStatus.PAID ? new Date() : null;

    return this.prisma.taxRecord.update({
      where: { user_id_month: { user_id: userId, month: start } },
      data: { status: dto.status, paid_at },
    });
  }
}
