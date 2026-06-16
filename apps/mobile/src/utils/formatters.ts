export function formatCpfInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function stripCpfMask(value: string): string {
  return value.replace(/\D/g, '');
}

export function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return `+55${digits}`;
  if (digits.length <= 7) return `+55 (${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `+55 (${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function stripPhoneMask(value: string): string {
  const digits = value.replace(/\D/g, '');
  return `+55${digits.slice(-11)}`;
}

export function formatCurrency(value: number): string {
  return `R$ ${Math.abs(value).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

export function maskCpf(cpf: string): string {
  // Shows only middle digits: ***.456.***-**
  if (cpf.length < 11) return '***.***.***-**';
  return `***.${cpf.slice(3, 6)}.***-**`;
}
