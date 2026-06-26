import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { ReportsService } from './reports.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma: any = {
  earning: {
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
  cost: {
    aggregate: jest.fn(),
    findMany: jest.fn(),
  },
  financing: {
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
};

const emptyAgg = { _sum: { amount: null }, _count: { id: 0 } };
const zeroAgg = { _sum: { amount: 0 } };

function setupDefaultMocks() {
  mockPrisma.earning.aggregate.mockResolvedValue(emptyAgg);
  mockPrisma.cost.aggregate.mockResolvedValue(zeroAgg);
  mockPrisma.financing.findUnique.mockResolvedValue(null);
  mockPrisma.cost.findMany.mockResolvedValue([]);
  mockPrisma.earning.groupBy.mockResolvedValue([]);
}

describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    setupDefaultMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(ReportsService);
  });

  describe('getMonthlyReport', () => {
    it('retorna o campo month igual ao parâmetro recebido — não usa data atual', async () => {
      const result = await service.getMonthlyReport('user-1', '2026-05');
      expect(result.month).toBe('2026-05');
    });

    it('retorna months diferentes para meses diferentes (regressão: parâmetro ignorado)', async () => {
      const mayResult = await service.getMonthlyReport('user-1', '2026-05');
      const junResult = await service.getMonthlyReport('user-1', '2026-06');

      expect(mayResult.month).toBe('2026-05');
      expect(junResult.month).toBe('2026-06');
    });

    it('consulta o banco com intervalos de datas distintos para meses distintos', async () => {
      await service.getMonthlyReport('user-1', '2026-05');
      const mayGte: Date = mockPrisma.earning.aggregate.mock.calls[0][0].where.earned_at.gte;
      const mayLte: Date = mockPrisma.earning.aggregate.mock.calls[0][0].where.earned_at.lte;

      jest.clearAllMocks();
      setupDefaultMocks();

      await service.getMonthlyReport('user-1', '2026-06');
      const junGte: Date = mockPrisma.earning.aggregate.mock.calls[0][0].where.earned_at.gte;
      const junLte: Date = mockPrisma.earning.aggregate.mock.calls[0][0].where.earned_at.lte;

      // Os intervalos devem ser diferentes — se o parâmetro for ignorado,
      // ambos os meses usariam as mesmas datas (mês atual) e este teste falharia
      expect(mayGte.getTime()).not.toBe(junGte.getTime());
      expect(mayLte.getTime()).not.toBe(junLte.getTime());

      // maio deve ser anterior a junho
      expect(mayGte.getTime()).toBeLessThan(junGte.getTime());
      expect(mayLte.getTime()).toBeLessThan(junLte.getTime());
    });

    it('retorna zeros para usuário sem dados no período', async () => {
      const result = await service.getMonthlyReport('user-1', '2026-03');

      expect(result.gross_income).toBe(0);
      expect(result.total_costs).toBe(0);
      expect(result.net_income).toBe(0);
      expect(result.trips).toBe(0);
    });

    it('calcula net_income como gross_income menos total_costs', async () => {
      mockPrisma.earning.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 1000 }, _count: { id: 20 } }) // mês atual
        .mockResolvedValueOnce({ _sum: { amount: 0 } }); // mês anterior
      mockPrisma.cost.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 300 } }) // mês atual
        .mockResolvedValueOnce({ _sum: { amount: 0 } }); // mês anterior

      const result = await service.getMonthlyReport('user-1', '2026-05');

      expect(result.gross_income).toBe(1000);
      expect(result.total_costs).toBe(300);
      expect(result.net_income).toBe(700);
    });
  });

  describe('currentMonth', () => {
    it('retorna string no formato YYYY-MM', () => {
      const month = service.currentMonth();
      expect(month).toMatch(/^\d{4}-\d{2}$/);
    });
  });
});
