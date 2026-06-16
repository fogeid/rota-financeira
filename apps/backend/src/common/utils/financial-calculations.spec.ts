import {
  averageOf,
  calculateCostPerKm,
  calculateDailyGoal,
  calculateDistribution,
  calculateFinancingHealth,
  calculateInstallmentProgress,
  calculateMonthlyTax,
  calculateProjection,
  firstDayOfMonth,
  formatMonth,
  lastDayOfMonth,
  parseMonthParam,
  roundHalfUp,
} from './financial-calculations';

// ─────────────────────────────────────────────────────────
// roundHalfUp
// ─────────────────────────────────────────────────────────
describe('roundHalfUp', () => {
  it('arredonda 2.345 para 2.35 (HALF_UP)', () => {
    expect(roundHalfUp(2.345)).toBe(2.35);
  });

  it('arredonda 2.344 para 2.34', () => {
    expect(roundHalfUp(2.344)).toBe(2.34);
  });

  it('respeita casas decimais customizadas', () => {
    expect(roundHalfUp(12.3456, 3)).toBe(12.346);
  });
});

// ─────────────────────────────────────────────────────────
// SEÇÃO 1 — Meta Diária
// ─────────────────────────────────────────────────────────
describe('calculateDailyGoal', () => {
  it('calcula meta diária corretamente', () => {
    // (1200 + 800 + 3000) / 22 = 5000 / 22 = 227.27...
    expect(calculateDailyGoal(1200, 800, 3000, 22)).toBe(227.27);
  });

  it('retorna meta com custos estimados zero (sem histórico — seção 1 borda)', () => {
    // meta_diária quando não há histórico de custos → estimatedCosts = 0
    expect(calculateDailyGoal(1200, 0, 3000, 22)).toBe(roundHalfUp(4200 / 22));
  });

  it('retorna meta com apenas 1 mês de histórico', () => {
    const estimatedCosts = averageOf([600]); // 1 mês apenas
    expect(estimatedCosts).toBe(600);
    const goal = calculateDailyGoal(1200, estimatedCosts, 3000, 22);
    expect(goal).toBe(roundHalfUp(4800 / 22));
  });

  it('usa média de até 3 meses para custos estimados', () => {
    const estimatedCosts = averageOf([600, 800, 700]); // 3 meses
    expect(estimatedCosts).toBeCloseTo(700);
    const goal = calculateDailyGoal(1200, estimatedCosts, 3000, 22);
    expect(goal).toBe(roundHalfUp(4900 / 22));
  });

  it('lança erro quando work_days_per_month = 0', () => {
    expect(() => calculateDailyGoal(1200, 800, 3000, 0)).toThrow();
  });
});

// ─────────────────────────────────────────────────────────
// averageOf
// ─────────────────────────────────────────────────────────
describe('averageOf', () => {
  it('retorna 0 para lista vazia', () => {
    expect(averageOf([])).toBe(0);
  });

  it('retorna o valor para lista com 1 elemento', () => {
    expect(averageOf([500])).toBe(500);
  });

  it('calcula média de 3 valores', () => {
    expect(averageOf([300, 600, 900])).toBe(600);
  });
});

// ─────────────────────────────────────────────────────────
// SEÇÃO 3 — Custo por Km
// ─────────────────────────────────────────────────────────
describe('calculateCostPerKm', () => {
  it('calcula custo/km corretamente', () => {
    // R$300 de combustível / (54500 - 54000) = R$0.60/km
    expect(calculateCostPerKm(300, 54000, 54500)).toBe(0.6);
  });

  it('retorna null quando não há registros de combustível (totalFuel = 0)', () => {
    expect(calculateCostPerKm(0, 54000, 54500)).toBeNull();
  });

  it('retorna null quando firstOdometer é null', () => {
    expect(calculateCostPerKm(300, null, 54500)).toBeNull();
  });

  it('retorna null quando lastOdometer é null', () => {
    expect(calculateCostPerKm(300, 54000, null)).toBeNull();
  });

  it('retorna null quando km rodados = 0 (odômetros iguais)', () => {
    expect(calculateCostPerKm(300, 54000, 54000)).toBeNull();
  });

  it('retorna null quando lastOdometer < firstOdometer (dado inválido)', () => {
    expect(calculateCostPerKm(300, 54500, 54000)).toBeNull();
  });

  it('arredonda HALF_UP com 2 casas decimais', () => {
    // 100 / 30 = 3.3333... → 3.33
    expect(calculateCostPerKm(100, 0, 30)).toBe(3.33);
  });
});

// ─────────────────────────────────────────────────────────
// SEÇÃO 4 — Progresso da Parcela
// ─────────────────────────────────────────────────────────
describe('calculateInstallmentProgress', () => {
  it('calcula 50% quando acumulado = metade da parcela', () => {
    expect(calculateInstallmentProgress(600, 1200)).toBe(50);
  });

  it('calcula 100% quando acumulado = parcela exata', () => {
    expect(calculateInstallmentProgress(1200, 1200)).toBe(100);
  });

  it('pode ultrapassar 100% (invariante 3 — borda)', () => {
    expect(calculateInstallmentProgress(1500, 1200)).toBe(125);
  });

  it('retorna 0 quando parcela = 0', () => {
    expect(calculateInstallmentProgress(1500, 0)).toBe(0);
  });

  it('retorna 0 quando acumulado = 0', () => {
    expect(calculateInstallmentProgress(0, 1200)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────
// SEÇÃO 6 — Saúde Financeira
// ─────────────────────────────────────────────────────────
describe('calculateFinancingHealth', () => {
  it('status HEALTHY quando parcela < 40% da renda', () => {
    const { ratio, status } = calculateFinancingHealth(800, 3000);
    expect(ratio).toBe(roundHalfUp((800 / 3000) * 100));
    expect(status).toBe('HEALTHY');
  });

  it('status WARNING quando ratio entre 40% e 50%', () => {
    // 1200 / 3000 = 40%
    const { status } = calculateFinancingHealth(1200, 3000);
    expect(status).toBe('WARNING');
  });

  it('status DANGER quando ratio > 50%', () => {
    const { status } = calculateFinancingHealth(1600, 3000);
    expect(status).toBe('DANGER');
  });

  it('status DANGER quando renda = 0', () => {
    const { ratio, status } = calculateFinancingHealth(1200, 0);
    expect(ratio).toBe(100);
    expect(status).toBe('DANGER');
  });
});

// ─────────────────────────────────────────────────────────
// SEÇÃO 7 — Distribuição dos R$100
// ─────────────────────────────────────────────────────────
describe('calculateDistribution', () => {
  it('soma sempre 100%', () => {
    const d = calculateDistribution(1200, 800, 3000);
    expect(d.pct_installment + d.pct_costs + d.pct_income).toBe(100);
  });

  it('retorna zeros quando total = 0', () => {
    const d = calculateDistribution(0, 0, 0);
    expect(d).toEqual({ pct_installment: 0, pct_costs: 0, pct_income: 0 });
  });

  it('calcula proporções corretas', () => {
    // 1000 + 1000 + 3000 = 5000. pct_installment = 20%, pct_costs = 20%, pct_income = 60%
    const d = calculateDistribution(1000, 1000, 3000);
    expect(d.pct_installment).toBe(20);
    expect(d.pct_costs).toBe(20);
    expect(d.pct_income).toBe(60);
  });
});

// ─────────────────────────────────────────────────────────
// SEÇÃO 8 — IR Mensal (Carnê-Leão 2026)
// ─────────────────────────────────────────────────────────
describe('calculateMonthlyTax', () => {
  it('faixa Isento: renda ≤ R$2.259,20 — IR = 0', () => {
    const r = calculateMonthlyTax(2000, 0);
    expect(r.tax_amount).toBe(0);
    expect(r.tax_bracket).toBe('Isento');
    expect(r.effective_rate).toBe(0);
  });

  it('faixa 7,5%: renda entre R$2.259,21 e R$2.826,65', () => {
    // base = 2600, IR = 2600 × 7.5% − 169.44 = 195 − 169.44 = 25.56
    const r = calculateMonthlyTax(2600, 0);
    expect(r.tax_bracket).toBe('7,5%');
    expect(r.tax_amount).toBe(roundHalfUp(2600 * 0.075 - 169.44));
  });

  it('faixa 15%: renda entre R$2.826,66 e R$3.751,05', () => {
    // base = 3200, IR = 3200 × 15% − 381.44 = 480 − 381.44 = 98.56
    const r = calculateMonthlyTax(3200, 0);
    expect(r.tax_bracket).toBe('15%');
    expect(r.tax_amount).toBe(roundHalfUp(3200 * 0.15 - 381.44));
  });

  it('faixa 22,5%: renda entre R$3.751,06 e R$4.664,68', () => {
    // base = 4000, IR = 4000 × 22.5% − 662.77 = 900 − 662.77 = 237.23
    const r = calculateMonthlyTax(4000, 0);
    expect(r.tax_bracket).toBe('22,5%');
    expect(r.tax_amount).toBe(roundHalfUp(4000 * 0.225 - 662.77));
  });

  it('faixa 27,5%: renda acima de R$4.664,68', () => {
    // base = 6000, IR = 6000 × 27.5% − 896 = 1650 − 896 = 754
    const r = calculateMonthlyTax(6000, 0);
    expect(r.tax_bracket).toBe('27,5%');
    expect(r.tax_amount).toBe(roundHalfUp(6000 * 0.275 - 896));
  });

  it('deduz combustível da base de cálculo', () => {
    // gross 6000, combustível 500 → taxable = 5500
    const r = calculateMonthlyTax(6000, 500);
    expect(r.taxable_income).toBe(5500);
    expect(r.deductions).toBe(500);
    expect(r.tax_amount).toBe(roundHalfUp(5500 * 0.275 - 896));
  });

  it('IR nunca negativo (invariante 4)', () => {
    // base na faixa 7.5% mas muito próximo do limite inferior — dedução pode exceder
    const r = calculateMonthlyTax(2260, 0);
    expect(r.tax_amount).toBeGreaterThanOrEqual(0);
  });

  it('retorna taxable_income = 0 quando deductions > grossIncome', () => {
    const r = calculateMonthlyTax(1000, 2000);
    expect(r.taxable_income).toBe(0);
    expect(r.tax_amount).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────
// SEÇÃO 9 — Projeção do Mês Seguinte
// ─────────────────────────────────────────────────────────
describe('calculateProjection', () => {
  it('retorna null quando não há meses anteriores', () => {
    expect(calculateProjection([])).toBeNull();
  });

  it('usa apenas o único mês disponível', () => {
    expect(calculateProjection([3000])).toBe(3000);
  });

  it('usa média de 2 meses quando há apenas 2', () => {
    expect(calculateProjection([3000, 4000])).toBe(3500);
  });

  it('usa média dos últimos 3 meses quando há exatamente 3', () => {
    expect(calculateProjection([3000, 4000, 5000])).toBe(4000);
  });

  it('usa apenas os últimos 3 de uma lista maior (seção 9)', () => {
    // com 5 meses, usa apenas os 3 últimos: 4000, 5000, 6000 → média = 5000
    expect(calculateProjection([1000, 2000, 4000, 5000, 6000])).toBe(5000);
  });
});

// ─────────────────────────────────────────────────────────
// Utilitários de data
// ─────────────────────────────────────────────────────────
describe('date utils', () => {
  it('firstDayOfMonth retorna o dia 1', () => {
    const d = firstDayOfMonth(new Date(2026, 5, 15)); // junho
    expect(d.getDate()).toBe(1);
    expect(d.getMonth()).toBe(5);
  });

  it('lastDayOfMonth retorna o último dia do mês', () => {
    const d = lastDayOfMonth(new Date(2026, 1, 10)); // fevereiro 2026
    expect(d.getDate()).toBe(28);
  });

  it('parseMonthParam parseia "2026-06" corretamente', () => {
    const d = parseMonthParam('2026-06');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(5);
    expect(d.getDate()).toBe(1);
  });

  it('parseMonthParam lança erro para formato inválido', () => {
    expect(() => parseMonthParam('2026-13')).toThrow();
    expect(() => parseMonthParam('not-a-date')).toThrow();
  });

  it('formatMonth formata data para "YYYY-MM"', () => {
    expect(formatMonth(new Date(2026, 5, 15))).toBe('2026-06');
  });
});
