import { z } from 'zod';

export const registerStep1Schema = z.object({
  name: z.string().min(3, 'Nome deve ter ao menos 3 caracteres'),
  cpf: z.string().min(14, 'CPF inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
});

export const registerStep2Schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Precisa de letra maiúscula')
    .regex(/[0-9]/, 'Precisa de número')
    .regex(/[@$!%*?&]/, 'Precisa de caractere especial (@$!%*?&)'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
});

const CURRENT_YEAR = new Date().getFullYear();

export const registerStep3Schema = z.object({
  plate: z.string().min(7, 'Placa inválida').max(8),
  brand: z.string().min(2, 'Informe a marca'),
  model: z.string().min(2, 'Informe o modelo'),
  year: z
    .string()
    .regex(/^\d{4}$/, 'Ano inválido')
    .refine((y) => Number(y) >= 1990 && Number(y) <= CURRENT_YEAR + 1, {
      message: `Ano entre 1990 e ${CURRENT_YEAR + 1}`,
    }),
});

export const registerStep4Schema = z.object({
  installmentValue: z.string().min(1, 'Informe o valor da parcela'),
  totalInstallments: z
    .string()
    .regex(/^\d+$/, 'Número inválido')
    .refine((v) => Number(v) >= 1 && Number(v) <= 120, 'Entre 1 e 120 parcelas'),
  remainingInstallments: z.string().regex(/^\d+$/, 'Número inválido'),
  desiredIncome: z.string().min(1, 'Informe a renda desejada'),
}).refine(
  (d) => Number(d.remainingInstallments) <= Number(d.totalInstallments),
  { message: 'Parcelas restantes não pode ser maior que o total', path: ['remainingInstallments'] },
);
