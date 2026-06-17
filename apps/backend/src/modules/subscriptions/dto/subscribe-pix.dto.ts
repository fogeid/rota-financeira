import { IsIn } from 'class-validator';

export class SubscribePixDto {
  @IsIn(['premium_yearly'], {
    message: 'PIX disponível apenas para o plano anual',
  })
  plan_id!: 'premium_yearly';
}
