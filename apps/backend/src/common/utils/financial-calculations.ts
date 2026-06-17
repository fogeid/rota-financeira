/**
 * Fórmulas financeiras críticas — docs/06-BUSINESS-RULES.md.
 * Todas são funções puras sem side effects para facilitar testes unitários.
 * NÃO alterar sem atualizar docs/06-BUSINESS-RULES.md (CLAUDE.md regra 9).
 */

/** Arredondamento HALF_UP com n casas decimais (docs/06-BUSINESS-RULES.md seção 1). */
export function roundHalfUp(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

// ─────────────────────────────────────────────────────────
// SEÇÃO 1 — Meta Diária
// ─────────────────────────────────────────────────────────

/**
 * Calcula a meta diária conforme seção 1 do business rules.
 * @param monthlyInstallment   Financing.monthly_installment
 * @param estimatedMonthlyCosts Média de custos dos últimos ≤3 meses (0 se sem histórico)
 * @param desiredIncome        Financing.desired_income
 * @param workDaysPerMonth     Financing.work_days_per_month
 */
export function calculateDailyGoal(
  monthlyInstallment: number,
  estimatedMonthlyCosts: number,
  desiredIncome: number,
  workDaysPerMonth: number,
): number {
  if (workDaysPerMonth <= 0) {
    throw new Error('work_days_per_month deve ser maior que zero');
  }
  const monthly = monthlyInstallment + estimatedMonthlyCosts + desiredIncome;
  return roundHalfUp(monthly / workDaysPerMonth);
}

/**
 * Calcula a meta mensal total (denominador da distribuição dos R$100).
 * Seção 7: meta_mensal_total = parcela + custos_estimados + renda_desejada
 */
export function calculateMonthlyGoal(
  monthlyInstallment: number,
  estimatedMonthlyCosts: number,
  desiredIncome: number,
): number {
  return roundHalfUp(monthlyInstallment + estimatedMonthlyCosts + desiredIncome);
}

/**
 * Média simples de uma lista de valores (para custos estimados de ≤3 meses).
 * Retorna 0 quando a lista está vazia (sem histórico).
 */
export function averageOf(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

// ─────────────────────────────────────────────────────────
// SEÇÃO 3 — Custo por Km
// ─────────────────────────────────────────────────────────

/**
 * Calcula custo/km conforme seção 3.
 * @param totalFuelAmount Total de combustível no mês (R$)
 * @param firstOdometer   Menor odômetro do mês (km inicial)
 * @param lastOdometer    Maior odômetro do mês (km final)
 * @returns R$/km arredondado HALF_UP, ou null quando indisponível (seção 3: exibir "—")
 */
export function calculateCostPerKm(
  totalFuelAmount: number,
  firstOdometer: number | null,
  lastOdometer: number | null,
): number | null {
  if (firstOdometer === null || lastOdometer === null) return null;
  const kmDriven = lastOdometer - firstOdometer;
  if (kmDriven <= 0 || totalFuelAmount <= 0) return null;
  return roundHalfUp(totalFuelAmount / kmDriven);
}

// ─────────────────────────────────────────────────────────
// SEÇÃO 4 — Progresso da Parcela
// ─────────────────────────────────────────────────────────

/**
 * Calcula percentual de progresso da parcela conforme seção 4.
 * Pode ultrapassar 100% (invariante 3 — docs/06-BUSINESS-RULES.md seção 14).
 * @param accumulatedNetIncome Lucros líquidos acumulados no mês
 * @param monthlyInstallment   Financing.monthly_installment
 */
export function calculateInstallmentProgress(
  accumulatedNetIncome: number,
  monthlyInstallment: number,
): number {
  if (monthlyInstallment <= 0) return 0;
  return roundHalfUp((accumulatedNetIncome / monthlyInstallment) * 100);
}

// ─────────────────────────────────────────────────────────
// SEÇÃO 6 — Saúde Financeira
// ─────────────────────────────────────────────────────────

export type HealthStatus = 'HEALTHY' | 'WARNING' | 'DANGER';

/**
 * Calcula ratio e status de saúde financeira do financiamento (seção 6).
 * @param monthlyInstallment Financing.monthly_installment
 * @param avgGrossIncome3m   Média dos ganhos brutos mensais dos últimos ≤3 meses
 */
export function calculateFinancingHealth(
  monthlyInstallment: number,
  avgGrossIncome3m: number,
): { ratio: number; status: HealthStatus } {
  if (avgGrossIncome3m <= 0) return { ratio: 100, status: 'DANGER' };
  const ratio = roundHalfUp((monthlyInstallment / avgGrossIncome3m) * 100);
  let status: HealthStatus;
  if (ratio < 40) {
    status = 'HEALTHY';
  } else if (ratio <= 50) {
    status = 'WARNING';
  } else {
    status = 'DANGER';
  }
  return { ratio, status };
}

// ─────────────────────────────────────────────────────────
// SEÇÃO 7 — Distribuição dos R$100
// ─────────────────────────────────────────────────────────

export interface DistributionResult {
  pct_installment: number;
  pct_costs: number;
  pct_income: number;
}

/**
 * Calcula a distribuição percentual dos R$100 (seção 7).
 * Invariante: pct_installment + pct_costs + pct_income = 100% sempre.
 */
export function calculateDistribution(
  monthlyInstallment: number,
  estimatedMonthlyCosts: number,
  desiredIncome: number,
): DistributionResult {
  const total = monthlyInstallment + estimatedMonthlyCosts + desiredIncome;
  if (total <= 0) return { pct_installment: 0, pct_costs: 0, pct_income: 0 };

  const pct_installment = roundHalfUp((monthlyInstallment / total) * 100);
  const pct_costs = roundHalfUp((estimatedMonthlyCosts / total) * 100);
  // Garante invariante: soma = 100%
  const pct_income = roundHalfUp(100 - pct_installment - pct_costs);
  return { pct_installment, pct_costs, pct_income };
}

// ─────────────────────────────────────────────────────────
// SEÇÃO 8 — IR Mensal (Carnê-Leão 2026)
// ─────────────────────────────────────────────────────────

/** Tabela progressiva IRPF 2026 — docs/06-BUSINESS-RULES.md seção 8. NÃO alterar sem aprovação. */
export const IRPF_2026 = [
  { limit: 2259.20, rate: 0,     deduction: 0 },
  { limit: 2826.65, rate: 0.075, deduction: 169.44 },
  { limit: 3751.05, rate: 0.15,  deduction: 381.44 },
  { limit: 4664.68, rate: 0.225, deduction: 662.77 },
  { limit: Infinity, rate: 0.275, deduction: 896.00 },
] as const;

export type TaxBracketLabel = 'Isento' | '7,5%' | '15%' | '22,5%' | '27,5%';

export interface TaxCalculationResult {
  gross_income: number;
  deductions: number;
  taxable_income: number;
  tax_amount: number;
  tax_bracket: TaxBracketLabel;
  effective_rate: number;
}

const BRACKET_LABELS: TaxBracketLabel[] = ['Isento', '7,5%', '15%', '22,5%', '27,5%'];

/**
 * Calcula o IR mensal conforme seção 8 do business rules.
 * IR_devido = (base_cálculo × alíquota) − dedução_da_faixa
 * Se IR_devido < 0: IR_devido = 0 (invariante 4)
 * @param grossIncome    Ganho bruto do mês
 * @param deductions     total_combustível + total_manutenção do mês
 */
export function calculateMonthlyTax(grossIncome: number, deductions: number): TaxCalculationResult {
  const taxableIncome = Math.max(0, grossIncome - deductions);

  let bracketIndex = 0;
  for (let i = 0; i < IRPF_2026.length; i++) {
    if (taxableIncome <= IRPF_2026[i].limit) {
      bracketIndex = i;
      break;
    }
    bracketIndex = i;
  }

  const bracket = IRPF_2026[bracketIndex];
  const rawTax = taxableIncome * bracket.rate - bracket.deduction;
  const taxAmount = roundHalfUp(Math.max(0, rawTax));
  const effectiveRate = taxableIncome > 0 ? roundHalfUp((taxAmount / taxableIncome) * 100) : 0;

  return {
    gross_income: roundHalfUp(grossIncome),
    deductions: roundHalfUp(deductions),
    taxable_income: roundHalfUp(taxableIncome),
    tax_amount: taxAmount,
    tax_bracket: BRACKET_LABELS[bracketIndex],
    effective_rate: effectiveRate,
  };
}

// ─────────────────────────────────────────────────────────
// SEÇÃO 9 — Projeção do Mês Seguinte
// ─────────────────────────────────────────────────────────

/**
 * Calcula projeção como média simples dos últimos ≤3 meses (seção 9).
 * Retorna null quando não há nenhum mês anterior ("Dados insuficientes").
 */
export function calculateProjection(monthlyValues: number[]): number | null {
  if (monthlyValues.length === 0) return null;
  const slice = monthlyValues.slice(-3);
  return roundHalfUp(slice.reduce((acc, v) => acc + v, 0) / slice.length);
}

// ─────────────────────────────────────────────────────────
// UTILITÁRIOS DE DATA
// ─────────────────────────────────────────────────────────

/** Retorna o primeiro dia do mês em UTC para uma data. */
export function firstDayOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/** Retorna o último dia do mês em UTC para uma data. */
export function lastDayOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

/** Parseia string "YYYY-MM" e retorna o primeiro dia do mês correspondente. */
export function parseMonthParam(month: string): Date {
  const [year, m] = month.split('-').map(Number);
  if (!year || !m || m < 1 || m > 12) {
    throw new Error(`Parâmetro month inválido: "${month}". Use YYYY-MM.`);
  }
  return new Date(year, m - 1, 1);
}

/** Formata Date para string "YYYY-MM". */
export function formatMonth(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}
