/**
 * Script de validação das fórmulas financeiras — docs/06-BUSINESS-RULES.md
 * Rodar: npx ts-node scripts/validate-formulas.ts
 */

import {
  calculateDailyGoal,
  calculateCostPerKm,
  calculateInstallmentProgress,
  calculateMonthlyTax,
  calculateDistribution,
  calculateFinancingHealth,
  roundHalfUp,
} from '../src/common/utils/financial-calculations';

let passed = 0;
let failed = 0;

function assert(description: string, actual: unknown, expected: unknown): void {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    console.log(`  ✅ ${description}`);
    passed++;
  } else {
    console.error(`  ❌ ${description}`);
    console.error(`     expected: ${JSON.stringify(expected)}`);
    console.error(`     actual  : ${JSON.stringify(actual)}`);
    failed++;
  }
}

function assertClose(description: string, actual: number, expected: number, epsilon = 0.01): void {
  const ok = Math.abs(actual - expected) <= epsilon;
  if (ok) {
    console.log(`  ✅ ${description}`);
    passed++;
  } else {
    console.error(`  ❌ ${description}`);
    console.error(`     expected: ${expected} (±${epsilon})`);
    console.error(`     actual  : ${actual}`);
    failed++;
  }
}

// ──────────────────────────────────────────────────────────
// Seção 1 — Meta Diária
// meta_diária = (parcela + custos_estimados + renda_desejada) / dias_trabalho
// ──────────────────────────────────────────────────────────
console.log('\n=== Seção 1 — Meta Diária ===');

assert('Exemplo do documento: (2500+1500+2000)/22 = 272.73',
  calculateDailyGoal(2500, 1500, 2000, 22), 272.73);

assert('Custo zero: (2000+0+1000)/20 = 150.00',
  calculateDailyGoal(2000, 0, 1000, 20), 150.00);

assert('Arredondamento HALF_UP: (1000+500+300)/7 = 257.14',
  calculateDailyGoal(1000, 500, 300, 7), 257.14);

assert('Renda zero: (3000+500+0)/25 = 140.00',
  calculateDailyGoal(3000, 500, 0, 25), 140.00);

assert('Parcela pequena: (800+200+1000)/15 = 133.33',
  calculateDailyGoal(800, 200, 1000, 15), 133.33);

assert('Valores grandes: (5000+3000+4000)/30 = 400.00',
  calculateDailyGoal(5000, 3000, 4000, 30), 400.00);

assert('1 dia de trabalho: (1000+0+0)/1 = 1000.00',
  calculateDailyGoal(1000, 0, 0, 1), 1000.00);

assert('Frações: (999.99+0.01+0)/10 = 100.00',
  calculateDailyGoal(999.99, 0.01, 0, 10), 100.00);

assert('Todos iguais: (100+100+100)/3 = 100.00',
  calculateDailyGoal(100, 100, 100, 3), 100.00);

assert('Mínimo prático: (500+300+700)/22 = 68.18',
  calculateDailyGoal(500, 300, 700, 22), 68.18);

try {
  calculateDailyGoal(1000, 0, 0, 0);
  console.error('  ❌ Deve lançar erro com work_days=0');
  failed++;
} catch {
  console.log('  ✅ Lança erro com work_days=0');
  passed++;
}

// ──────────────────────────────────────────────────────────
// Seção 3 — Custo por Km
// custo_por_km = total_combustível_mês / km_rodados_mês
// ──────────────────────────────────────────────────────────
console.log('\n=== Seção 3 — Custo por Km ===');

assert('0 km rodados → null (exibir "—")',
  calculateCostPerKm(500, 50000, 50000), null);

assert('odômetros nulos → null',
  calculateCostPerKm(500, null, null), null);

assert('1 km rodado: 10.00/1 = 10.00 R$/km',
  calculateCostPerKm(10.00, 1000, 1001), 10.00);

assert('10.000 km: 3000/10000 = 0.30 R$/km',
  calculateCostPerKm(3000, 0, 10000), 0.30);

assert('Caso típico: 450/1500 = 0.30 R$/km',
  calculateCostPerKm(450, 50000, 51500), 0.30);

assert('Combustível zero → null',
  calculateCostPerKm(0, 50000, 51000), null);

assert('Odômetro final menor → null (km negativo)',
  calculateCostPerKm(100, 51000, 50000), null);

// ──────────────────────────────────────────────────────────
// Seção 4 — Progresso da Parcela
// progresso = acumulado / parcela * 100
// ──────────────────────────────────────────────────────────
console.log('\n=== Seção 4 — Progresso da Parcela ===');

assert('0%: sem lucro acumulado',
  calculateInstallmentProgress(0, 2000), 0);

assert('50%: acumulado = parcela/2',
  calculateInstallmentProgress(1000, 2000), 50);

assert('100%: acumulado = parcela (parcela paga)',
  calculateInstallmentProgress(2000, 2000), 100);

assert('150%: pode ultrapassar 100% (invariante 3)',
  calculateInstallmentProgress(3000, 2000), 150);

assert('Parcela zero → 0% (sem erro)',
  calculateInstallmentProgress(1000, 0), 0);

assert('Lucro negativo → negativo (dia de prejuízo, invariante 2)',
  calculateInstallmentProgress(-500, 2000), -25);

// ──────────────────────────────────────────────────────────
// Seção 8 — IR Mensal (Carnê-Leão 2026)
// ──────────────────────────────────────────────────────────
console.log('\n=== Seção 8 — IR Mensal (IRPF 2026) ===');

// Faixa 1: até R$ 2.259,20 → isento
const ir1 = calculateMonthlyTax(2000, 0);
assert('Faixa isenta: R$ 2.000 → IR = 0',
  ir1.tax_amount, 0);
assert('Faixa isenta: bracket = Isento',
  ir1.tax_bracket, 'Isento');

// Faixa 2: R$ 2.259,21 – R$ 2.826,65 → 7,5% - R$ 169,44
const ir2 = calculateMonthlyTax(2500, 0);
// IR = 2500 * 0.075 - 169.44 = 187.50 - 169.44 = 18.06
assertClose('Faixa 7,5%: R$ 2.500 → IR ≈ 18.06', ir2.tax_amount, 18.06);
assert('Faixa 7,5%: bracket = 7,5%', ir2.tax_bracket, '7,5%');

// Faixa 3: R$ 2.826,66 – R$ 3.751,05 → 15% - R$ 381,44
const ir3 = calculateMonthlyTax(3500, 0);
// IR = 3500 * 0.15 - 381.44 = 525 - 381.44 = 143.56
assertClose('Faixa 15%: R$ 3.500 → IR ≈ 143.56', ir3.tax_amount, 143.56);
assert('Faixa 15%: bracket = 15%', ir3.tax_bracket, '15%');

// Faixa 4: R$ 3.751,06 – R$ 4.664,68 → 22,5% - R$ 662,77
const ir4 = calculateMonthlyTax(4000, 0);
// IR = 4000 * 0.225 - 662.77 = 900 - 662.77 = 237.23
assertClose('Faixa 22,5%: R$ 4.000 → IR ≈ 237.23', ir4.tax_amount, 237.23);
assert('Faixa 22,5%: bracket = 22,5%', ir4.tax_bracket, '22,5%');

// Faixa 5: acima de R$ 4.664,68 → 27,5% - R$ 896,00
const ir5 = calculateMonthlyTax(6000, 0);
// IR = 6000 * 0.275 - 896 = 1650 - 896 = 754
assertClose('Faixa 27,5%: R$ 6.000 → IR ≈ 754.00', ir5.tax_amount, 754.00);
assert('Faixa 27,5%: bracket = 27,5%', ir5.tax_bracket, '27,5%');

// Com deduções: base_cálculo = ganho - deduções
const ir6 = calculateMonthlyTax(5000, 1000); // base = 4000
assertClose('Com deduções: ganho=5000, ded=1000 → base=4000 → IR ≈ 237.23', ir6.tax_amount, 237.23);

// IR nunca negativo (invariante 4)
const ir7 = calculateMonthlyTax(2000, 5000); // base_cálculo = 0
assert('IR_devido nunca negativo: ganho=2000, ded=5000 → IR = 0', ir7.tax_amount, 0);

// ──────────────────────────────────────────────────────────
// Seção 7 — Distribuição dos R$100
// Invariante 14.1: pct_parcela + pct_custos + pct_renda = 100%
// ──────────────────────────────────────────────────────────
console.log('\n=== Seção 7 — Invariante Distribuição = 100% ===');

const combinations = [
  [2500, 1500, 2000],
  [1000, 1000, 1000],
  [500, 0, 1500],
  [3000, 2000, 5000],
  [100, 100, 100],
  [9999.99, 0.01, 0],
  [1, 1, 1],
  [1500, 500, 3000],
];

for (const [inst, costs, income] of combinations) {
  const d = calculateDistribution(inst, costs, income);
  const sum = roundHalfUp(d.pct_installment + d.pct_costs + d.pct_income);
  assert(`Distribuição soma 100%: parcela=${inst} custos=${costs} renda=${income}`, sum, 100);
}

// ──────────────────────────────────────────────────────────
// Seção 6 — Saúde Financeira
// ──────────────────────────────────────────────────────────
console.log('\n=== Seção 6 — Saúde Financeira ===');

assert('HEALTHY: ratio=2000/6000=33.33% < 40%',
  calculateFinancingHealth(2000, 6000).status, 'HEALTHY');
assert('WARNING: ratio=2400/6000=40% (limite inferior)',
  calculateFinancingHealth(2400, 6000).status, 'WARNING');
assert('WARNING: ratio=3000/6000=50% (limite superior)',
  calculateFinancingHealth(3000, 6000).status, 'WARNING');
assert('DANGER: ratio=3100/6000=51.67% > 50%',
  calculateFinancingHealth(3100, 6000).status, 'DANGER');
assert('DANGER: renda média = 0',
  calculateFinancingHealth(1000, 0).status, 'DANGER');

// ──────────────────────────────────────────────────────────
// Resultado final
// ──────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Total: ${passed + failed} testes | ✅ ${passed} passando | ❌ ${failed} falhando`);
if (failed > 0) {
  console.error('\n⚠️  FALHAS ENCONTRADAS — corrigir antes de fazer PR!');
  process.exit(1);
} else {
  console.log('\n✅ Todas as fórmulas validadas com sucesso!');
  process.exit(0);
}
