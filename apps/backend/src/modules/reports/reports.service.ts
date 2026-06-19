import { Injectable, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import * as PDFDocument from 'pdfkit';
import {
  calculateCostPerKm,
  calculateDistribution,
  calculateFinancingHealth,
  calculateMonthlyTax,
  calculateProjection,
  firstDayOfMonth,
  formatMonth,
  lastDayOfMonth,
} from '../../common/utils/financial-calculations';
import { PrismaService } from '../../prisma/prisma.service';

export interface MonthlyReportData {
  month: string;
  gross_income: number;
  total_costs: number;
  net_income: number;
  trips: number;
  cost_per_km: number | null;
  tax_amount: number;
  estimated_tax: number;
  installment_covered: number;
  best_day: { date: string; net: number };
  worst_day: { date: string; net: number };
  vs_previous_month: { gross_income: number; net_income: number };
  next_month_projection: { gross_income: number; net_income: number };
  distribution: { pct_installment: number; pct_costs: number; pct_income: number } | null;
  health: { ratio: number; status: string } | null;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMonthlyReport(userId: string, month: string): Promise<MonthlyReportData> {
    const refDate = new Date(`${month}-01`);
    const start = firstDayOfMonth(refDate);
    const end = lastDayOfMonth(refDate);

    const prevDate = new Date(refDate.getFullYear(), refDate.getMonth() - 1, 1);
    const prevStart = firstDayOfMonth(prevDate);
    const prevEnd = lastDayOfMonth(prevDate);

    const [earningsAgg, costsAgg, financing, costs, dailyEarnings, prevEarningsAgg, prevCostsAgg] =
      await Promise.all([
        this.prisma.earning.aggregate({
          where: { user_id: userId, earned_at: { gte: start, lte: end } },
          _sum: { amount: true },
          _count: { id: true },
        }),
        this.prisma.cost.aggregate({
          where: { user_id: userId, cost_date: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
        this.prisma.financing.findUnique({ where: { user_id: userId } }),
        this.prisma.cost.findMany({
          where: { user_id: userId, cost_date: { gte: start, lte: end } },
          include: { fuel_log: true },
        }),
        this.prisma.earning.groupBy({
          by: ['earned_at'],
          where: { user_id: userId, earned_at: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
        this.prisma.earning.aggregate({
          where: { user_id: userId, earned_at: { gte: prevStart, lte: prevEnd } },
          _sum: { amount: true },
        }),
        this.prisma.cost.aggregate({
          where: { user_id: userId, cost_date: { gte: prevStart, lte: prevEnd } },
          _sum: { amount: true },
        }),
      ]);

    const grossIncome = Number((earningsAgg._sum.amount as Decimal | null) ?? 0);
    const totalCosts = Number((costsAgg._sum.amount as Decimal | null) ?? 0);
    const netIncome = grossIncome - totalCosts;

    const prevGross = Number((prevEarningsAgg._sum.amount as Decimal | null) ?? 0);
    const prevCosts = Number((prevCostsAgg._sum.amount as Decimal | null) ?? 0);
    const prevNet = prevGross - prevCosts;

    const totalFuel = costs
      .filter((c) => c.fuel_log != null)
      .reduce((s, c) => s + Number(c.amount as Decimal), 0);
    const odometers = costs
      .filter((c) => c.fuel_log != null)
      .map((c) => Number(c.fuel_log!.odometer_km as Decimal))
      .filter((km) => km > 0)
      .sort((a, b) => a - b);
    const costPerKm = calculateCostPerKm(
      totalFuel,
      odometers[0] ?? null,
      odometers[odometers.length - 1] ?? null,
    );

    const { tax_amount } = calculateMonthlyTax(grossIncome, totalFuel);

    const defaultDay = { date: `${month}-01`, net: 0 };
    const dailyNets = dailyEarnings.map((g) => ({
      date: (g.earned_at as Date).toISOString().slice(0, 10),
      net: Math.round(Number((g._sum.amount as Decimal | null) ?? 0) * 100) / 100,
    }));
    const bestDay =
      dailyNets.length > 0 ? dailyNets.reduce((b, d) => (d.net > b.net ? d : b)) : defaultDay;
    const worstDay =
      dailyNets.length > 0 ? dailyNets.reduce((w, d) => (d.net < w.net ? d : w)) : defaultDay;

    const installmentCovered = financing
      ? Math.min(
          Number(financing.monthly_installment as Decimal),
          Math.max(0, netIncome),
        )
      : 0;

    let distribution = null;
    let health = null;
    if (financing) {
      const installment = Number(financing.monthly_installment as Decimal);
      distribution = calculateDistribution(installment, totalCosts, Number(financing.desired_income as Decimal));
      health = calculateFinancingHealth(installment, grossIncome);
    }

    return {
      month,
      gross_income: Math.round(grossIncome * 100) / 100,
      total_costs: Math.round(totalCosts * 100) / 100,
      net_income: Math.round(netIncome * 100) / 100,
      trips: earningsAgg._count.id,
      cost_per_km: costPerKm,
      tax_amount,
      estimated_tax: tax_amount,
      installment_covered: Math.round(installmentCovered * 100) / 100,
      best_day: bestDay,
      worst_day: worstDay,
      vs_previous_month: {
        gross_income: Math.round((grossIncome - prevGross) * 100) / 100,
        net_income: Math.round((netIncome - prevNet) * 100) / 100,
      },
      next_month_projection: {
        gross_income: Math.round(grossIncome * 100) / 100,
        net_income: Math.round(netIncome * 100) / 100,
      },
      distribution,
      health,
    };
  }

  async generateMonthlyPdf(userId: string, month: string): Promise<Buffer> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const report = await this.getMonthlyReport(userId, month);

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('Rota Financeira', { align: 'center' });
      doc.fontSize(14).font('Helvetica').text(`Relatório Mensal — ${month}`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Motorista: ${user.name}`);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`);
      doc.moveDown();

      // Resumo financeiro
      doc.fontSize(14).font('Helvetica-Bold').text('Resumo Financeiro');
      doc.fontSize(12).font('Helvetica');
      doc.text(`Ganho Bruto: R$ ${report.gross_income.toFixed(2)}`);
      doc.text(`Total de Custos: R$ ${report.total_costs.toFixed(2)}`);
      doc.text(`Renda Líquida: R$ ${report.net_income.toFixed(2)}`);
      doc.text(`Corridas/Entregas: ${report.trips}`);
      doc.text(`Custo por Km: ${report.cost_per_km != null ? `R$ ${report.cost_per_km.toFixed(2)}` : '—'}`);
      doc.text(`IR Estimado: R$ ${report.tax_amount.toFixed(2)}`);
      doc.moveDown();

      if (report.distribution) {
        doc.fontSize(14).font('Helvetica-Bold').text('Distribuição do Faturamento');
        doc.fontSize(12).font('Helvetica');
        doc.text(`Parcela: ${report.distribution.pct_installment}%`);
        doc.text(`Custos: ${report.distribution.pct_costs}%`);
        doc.text(`Renda: ${report.distribution.pct_income}%`);
        doc.moveDown();
      }

      if (report.health) {
        doc.fontSize(14).font('Helvetica-Bold').text('Saúde do Financiamento');
        doc.fontSize(12).font('Helvetica');
        doc.text(`Comprometimento: ${report.health.ratio}%`);
        doc.text(`Status: ${report.health.status}`);
        doc.moveDown();
      }

      doc.end();
    });
  }

  async getAnnualReport(userId: string, year: number) {
    const months: MonthlyReportData[] = [];

    for (let m = 1; m <= 12; m++) {
      const monthStr = `${year}-${String(m).padStart(2, '0')}`;
      const refDate = new Date(year, m - 1, 1);
      if (refDate > new Date()) break;
      const data = await this.getMonthlyReport(userId, monthStr);
      months.push(data);
    }

    const totalGross = months.reduce((s, m) => s + m.gross_income, 0);
    const totalCosts = months.reduce((s, m) => s + m.total_costs, 0);
    const totalNet = months.reduce((s, m) => s + m.net_income, 0);
    const totalTax = months.reduce((s, m) => s + m.tax_amount, 0);

    const monthlyGrossValues = months.map((m) => m.gross_income);
    const projection = calculateProjection(monthlyGrossValues);

    return {
      year,
      months,
      totals: {
        gross_income: Math.round(totalGross * 100) / 100,
        total_costs: Math.round(totalCosts * 100) / 100,
        net_income: Math.round(totalNet * 100) / 100,
        total_tax: Math.round(totalTax * 100) / 100,
      },
      next_month_projection: projection,
    };
  }

  /** Retorna o mês formatado para o relatório corrente. */
  currentMonth(): string {
    return formatMonth(new Date());
  }
}
