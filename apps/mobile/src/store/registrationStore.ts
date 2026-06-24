import { create } from 'zustand';

interface VehicleData {
  plate: string;
  brand: string;
  model: string;
  year: number;
  fuel_efficiency: number;
}

interface FinancingData {
  monthly_installment: string;
  due_day: string;
  desired_income: string;
  work_days_per_month: string;
}

interface RegistrationState {
  referralCode: string | null;
  vehicleData: VehicleData | null;
  financingData: FinancingData | null;
  setReferralCode: (code: string | null) => void;
  setVehicleData: (data: VehicleData) => void;
  setFinancingData: (data: FinancingData) => void;
  reset: () => void;
}

export const useRegistrationStore = create<RegistrationState>((set) => ({
  referralCode: null,
  vehicleData: null,
  financingData: null,
  setReferralCode: (referralCode) => set({ referralCode }),
  setVehicleData: (vehicleData) => set({ vehicleData }),
  setFinancingData: (financingData) => set({ financingData }),
  reset: () => set({ referralCode: null, vehicleData: null, financingData: null }),
}));
