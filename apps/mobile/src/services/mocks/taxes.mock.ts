import type { TaxMonth } from '../../types/api';

const months = ['2026-06', '2026-05', '2026-04', '2026-03', '2026-02', '2026-01'];

const MOCK_TAX_MONTHS: TaxMonth[] = [
  {
    month: '2026-06', gross_income: 4218.50, deductions: 1300.00, taxable_income: 2918.50,
    tax_amount: 187.22, tax_bracket: '15%',
    reserve_message: 'Reserve R$ 187,22 este mês para o carnê-leão',
    due_date: '2026-06-30', status: 'PENDING',
  },
  {
    month: '2026-05', gross_income: 3900.00, deductions: 1100.00, taxable_income: 2800.00,
    tax_amount: 161.56, tax_bracket: '15%',
    reserve_message: 'Reserve R$ 161,56 para o carnê-leão',
    due_date: '2026-05-31', status: 'PAID',
  },
  {
    month: '2026-04', gross_income: 4100.00, deductions: 950.00, taxable_income: 3150.00,
    tax_amount: 210.34, tax_bracket: '15%',
    reserve_message: 'Reserve R$ 210,34 para o carnê-leão',
    due_date: '2026-04-30', status: 'PAID',
  },
  {
    month: '2026-03', gross_income: 3600.00, deductions: 800.00, taxable_income: 2800.00,
    tax_amount: 161.56, tax_bracket: '15%',
    reserve_message: 'Reserve R$ 161,56 para o carnê-leão',
    due_date: '2026-03-31', status: 'OVERDUE',
  },
  {
    month: '2026-02', gross_income: 2100.00, deductions: 400.00, taxable_income: 1700.00,
    tax_amount: 0, tax_bracket: 'Isento',
    reserve_message: 'Você está isento de IR este mês',
    due_date: '2026-02-28', status: 'PAID',
  },
  {
    month: '2026-01', gross_income: 3200.00, deductions: 700.00, taxable_income: 2500.00,
    tax_amount: 18.03, tax_bracket: '7,5%',
    reserve_message: 'Reserve R$ 18,03 para o carnê-leão',
    due_date: '2026-01-31', status: 'PAID',
  },
];

export const taxesMock = {
  async monthly(month?: string): Promise<TaxMonth> {
    await delay(400);
    const m = month ?? '2026-06';
    return MOCK_TAX_MONTHS.find((t) => t.month === m) ?? MOCK_TAX_MONTHS[0];
  },

  async history(): Promise<TaxMonth[]> {
    await delay(450);
    return MOCK_TAX_MONTHS;
  },

  async markPaid(month: string): Promise<TaxMonth> {
    await delay(500);
    const item = MOCK_TAX_MONTHS.find((t) => t.month === month);
    if (!item) throw new Error('Mês não encontrado');
    item.status = 'PAID';
    return item;
  },
};

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
