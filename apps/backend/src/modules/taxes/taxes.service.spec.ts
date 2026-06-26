import { Test, TestingModule } from '@nestjs/testing';
import { TaxStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TaxesService } from './taxes.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma: any = {
  earning: { aggregate: jest.fn() },
  cost: { aggregate: jest.fn() },
  taxRecord: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
};

const zeroAgg = { _sum: { amount: null } };

describe('TaxesService', () => {
  let service: TaxesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.earning.aggregate.mockResolvedValue(zeroAgg);
    mockPrisma.cost.aggregate.mockResolvedValue(zeroAgg);
    mockPrisma.taxRecord.findUnique.mockResolvedValue(null);
    mockPrisma.taxRecord.upsert.mockResolvedValue({
      user_id: 'u1', month: new Date('2026-05-01'), tax_amount: 0, status: TaxStatus.PENDING,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaxesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(TaxesService);
  });

  describe('getMonthlyTax', () => {
    it('retorna o campo month igual ao parâmetro recebido', async () => {
      const result = await service.getMonthlyTax('u1', '2026-05');
      expect((result as Record<string, unknown>).month).toBe('2026-05');
    });

    it('consulta o banco com intervalos de datas distintos para meses distintos', async () => {
      await service.getMonthlyTax('u1', '2026-05');
      const mayGte: Date = mockPrisma.earning.aggregate.mock.calls[0][0].where.earned_at.gte;

      jest.clearAllMocks();
      mockPrisma.earning.aggregate.mockResolvedValue(zeroAgg);
      mockPrisma.cost.aggregate.mockResolvedValue(zeroAgg);
      mockPrisma.taxRecord.upsert.mockResolvedValue({
        user_id: 'u1', month: new Date('2026-06-01'), tax_amount: 0, status: TaxStatus.PENDING,
      });

      await service.getMonthlyTax('u1', '2026-06');
      const junGte: Date = mockPrisma.earning.aggregate.mock.calls[0][0].where.earned_at.gte;

      expect(mayGte.getTime()).not.toBe(junGte.getTime());
      expect(mayGte.getTime()).toBeLessThan(junGte.getTime());
    });

    it('retorna gross_income=0 e tax_amount=0 para usuário sem ganhos', async () => {
      const result = await service.getMonthlyTax('u1', '2026-05') as Record<string, unknown>;
      expect(result.gross_income).toBe(0);
      expect(result.tax_amount).toBe(0);
    });
  });
});
