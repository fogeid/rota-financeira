import { IsEnum, IsIn, IsString } from 'class-validator';

enum PaymentMethodDto {
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
}

export class SubscribeDto {
  @IsIn(['premium_monthly', 'premium_yearly'], {
    message: 'plan_id deve ser premium_monthly ou premium_yearly',
  })
  plan_id!: 'premium_monthly' | 'premium_yearly';

  @IsEnum(PaymentMethodDto)
  payment_method!: PaymentMethodDto;

  /** Token do Pagar.me — NUNCA o número do cartão (docs/05-SECURITY.md regra 5) */
  @IsString()
  card_token!: string;
}
