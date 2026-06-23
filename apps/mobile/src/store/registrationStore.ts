import { create } from 'zustand';

interface VehicleData {
  plate: string;
  brand: string;
  model: string;
  year: number;
}

interface FinancingData {
  installmentValue: string;
  totalInstallments: string;
  remainingInstallments: string;
  desiredIncome: string;
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
