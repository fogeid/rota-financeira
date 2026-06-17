import { api } from './api';

export interface VehicleData {
  id: string;
  model: string;
  year: number;
  plate: string;
  fuel_efficiency: number;
}

export type VehicleInput = Omit<VehicleData, 'id'>;

export const vehiclesService = {
  async getVehicle(): Promise<VehicleData> {
    const { data } = await api.get<VehicleData>('/vehicles/me');
    return data;
  },

  async upsertVehicle(payload: VehicleInput): Promise<VehicleData> {
    try {
      const { data } = await api.put<VehicleData>('/vehicles/me', payload);
      return data;
    } catch (err: unknown) {
      // 404 → vehicle doesn't exist yet, create it
      if ((err as { response?: { status?: number } })?.response?.status === 404) {
        const { data } = await api.post<VehicleData>('/vehicles', payload);
        return data;
      }
      throw err;
    }
  },
};
