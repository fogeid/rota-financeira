import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Valida CPF por dígitos verificadores — docs/05-SECURITY.md seção 5.
 * Aceita o valor formatado (123.456.789-09) ou apenas dígitos.
 */
export function isValidCpf(value: string): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  const cpf = value.replace(/\D/g, '');

  if (cpf.length !== 11) {
    return false;
  }

  // CPFs com todos os dígitos iguais são inválidos (ex: 00000000000)
  if (/^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  const digits = cpf.split('').map(Number);

  const calcCheckDigit = (length: number): number => {
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += digits[i] * (length + 1 - i);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  const firstCheckDigit = calcCheckDigit(9);
  const secondCheckDigit = calcCheckDigit(10);

  return firstCheckDigit === digits[9] && secondCheckDigit === digits[10];
}

@ValidatorConstraint({ name: 'isCpf', async: false })
class IsCpfConstraint implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    return isValidCpf(value);
  }

  defaultMessage(): string {
    return 'CPF inválido';
  }
}

export function IsCpf(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsCpfConstraint,
    });
  };
}

/** Remove formatação, retornando apenas os 11 dígitos do CPF. */
export function cleanCpf(value: string): string {
  return value.replace(/\D/g, '');
}
