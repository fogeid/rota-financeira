import { Test, TestingModule } from '@nestjs/testing';
import { CostType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { CostsService } from './costs.service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma: any = {
  cost: { create: jest.fn(), findMany: jest.fn() },
  vehicle: { findUnique: jest.fn() },
};

const mockAlerts = { checkHighCostPerKm: jest.fn() };

const baseFuelCost = {
  id: 'c1',
  user_id: 'u1',
  type: CostType.FUEL,
  amount: 200,
  cost_date: new Date('2026-06-20'),
  description: null,
  created_at: new Date(),
  fuel_log: { gas_station: 'Posto Teste', liters: 35, price_per_liter: 5.71, odometer_km: 50000 },
  maintenance: null,
};

describe('CostsService', () => {
  let service: CostsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CostsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AlertsService, useValue: mockAlerts },
      ],
    }).compile();
    service = module.get(CostsService);
  });

  describe('create', () => {
    it('cria custo FUEL com fuel_log aninhado (formato documentado)', async () => {
      mockPrisma.cost.create.mockResolvedValue(baseFuelCost);
      mockAlerts.checkHighCostPerKm.mockResolvedValue(undefined);

      const result = await service.create('u1', {
        type: CostType.FUEL,
        amount: 200,
        cost_date: '2026-06-20',
        fuel_log: { gas_station: 'Posto Teste', liters: 35, price_per_liter: 5.71, odometer_km: 50000 },
      });

      expect(result.type).toBe(CostType.FUEL);
      const createCall = mockPrisma.cost.create.mock.calls[0][0];
      expect(createCall.data.fuel_log.create.gas_station).toBe('Posto Teste');
      expect(createCall.data.fuel_log.create.liters).toBe(35);
    });

    it('cria custo FUEL com campos flat (compatibilidade legada)', async () => {
      mockPrisma.cost.create.mockResolvedValue(baseFuelCost);
      mockAlerts.checkHighCostPerKm.mockResolvedValue(undefined);

      await service.create('u1', {
        type: CostType.FUEL,
        amount: 200,
        cost_date: '2026-06-20',
        gas_station: 'Posto Flat',
        liters: 40,
        price_per_liter: 5.5,
        odometer_km: 51000,
      });

      const createCall = mockPrisma.cost.create.mock.calls[0][0];
      expect(createCall.data.fuel_log.create.gas_station).toBe('Posto Flat');
      expect(createCall.data.fuel_log.create.liters).toBe(40);
    });

    it('fuel_log aninhado tem precedência sobre campos flat quando ambos presentes', async () => {
      mockPrisma.cost.create.mockResolvedValue(baseFuelCost);
      mockAlerts.checkHighCostPerKm.mockResolvedValue(undefined);

      await service.create('u1', {
        type: CostType.FUEL,
        amount: 200,
        cost_date: '2026-06-20',
        fuel_log: { gas_station: 'Nested Posto', liters: 35 },
        gas_station: 'Flat Posto',
        liters: 99,
      });

      const createCall = mockPrisma.cost.create.mock.calls[0][0];
      expect(createCall.data.fuel_log.create.gas_station).toBe('Nested Posto');
      expect(createCall.data.fuel_log.create.liters).toBe(35);
    });
  });
});
