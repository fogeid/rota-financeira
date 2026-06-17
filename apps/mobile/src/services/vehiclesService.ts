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

  async updateVehicle(payload: VehicleInput): Promise<VehicleData> {
    const { data } = await api.put<VehicleData>('/vehicles/me', payload);
    return data;
  },
};
