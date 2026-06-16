import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/** Telefone brasileiro em formato E.164: +55 + DDD (2 dígitos) + número (8 ou 9 dígitos) */
const BR_PHONE_REGEX = /^\+55\d{10,11}$/;

export function isValidBrazilianPhone(value: string): boolean {
  return typeof value === 'string' && BR_PHONE_REGEX.test(value);
}

@ValidatorConstraint({ name: 'isBrazilianPhone', async: false })
class IsBrazilianPhoneConstraint implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    return isValidBrazilianPhone(value);
  }

  defaultMessage(): string {
    return 'Telefone inválido. Use o formato +5511999998888';
  }
}

export function IsBrazilianPhone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsBrazilianPhoneConstraint,
    });
  };
}
