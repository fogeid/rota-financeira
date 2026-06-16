import type { CostItem, CostsSummary, CostsListResponse } from '../../types/api';

const THIS_MONTH = new Date().toISOString().slice(0, 7);
const D = (d: number) => {
  const date = new Date();
  date.setDate(d);
  return date.toISOString().slice(0, 10);
};

const MOCK_COSTS: CostItem[] = [
  {
    id: 'c1', type: 'FUEL', amount: 236.00, cost_date: D(10),
    fuel_log: { gas_station: 'Posto Ipiranga', liters: 40.0, price_per_liter: 5.90, odometer_km: 48320 },
  },
  {
    id: 'c2', type: 'FUEL', amount: 189.00, cost_date: D(3),
    fuel_log: { gas_station: 'Posto Shell', liters: 32.0, price_per_liter: 5.90, odometer_km: 47800 },
  },
  {
    id: 'c3', type: 'MAINTENANCE', amount: 280.00, description: 'Troca de óleo 5W30', cost_date: D(5),
    maintenance_log: { service_type: 'Troca de óleo', current_odometer_km: 48000, next_service_km: 53000, reminder_enabled: true },
  },
  {
    id: 'c4', type: 'MAINTENANCE', amount: 40.00, description: 'Alinhamento e balanceamento', cost_date: D(2),
    maintenance_log: { service_type: 'Alinhamento', current_odometer_km: 47500, next_service_km: 57500, reminder_enabled: false },
  },
  { id: 'c5', type: 'CAR_WASH', amount: 35.00, description: 'Lavagem simples', cost_date: D(8) },
  { id: 'c6', type: 'CAR_WASH', amount: 80.00, description: 'Lavagem completa', cost_date: D(1) },
  { id: 'c7', type: 'OTHER', amount: 120.00, description: 'Estacionamento mensal', cost_date: D(1) },
];

export const costsMock = {
  async list(params?: { month?: string; type?: string }): Promise<CostsListResponse> {
    await delay(400);
    let data = [...MOCK_COSTS];
    if (params?.type) data = data.filter((c) => c.type === params.type);
    return { data, total: data.length, page: 1 };
  },

  async summary(month?: string): Promise<CostsSummary> {
    await delay(350);
    return {
      month: month ?? THIS_MONTH,
      total: 980.00,
      cost_per_km: 0.42,
      km_driven: 2333,
      by_type: {
        FUEL: { total: 425.00, percentage: 43.4 },
        MAINTENANCE: { total: 320.00, percentage: 32.6 },
        CAR_WASH: { total: 115.00, percentage: 11.8 },
        OTHER: { total: 120.00, percentage: 12.2 },
      },
    };
  },

  async create(data: Omit<CostItem, 'id'>): Promise<CostItem> {
    await delay(600);
    return { ...data, id: String(Date.now()) };
  },

  async remove(id: string): Promise<void> {
    await delay(400);
  },
};

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
