import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { OtpPurpose } from '@prisma/client';

/**
 * Envio de códigos OTP por SMS. O provedor de SMS ainda não está definido em
 * docs/02-TECH-STACK.md — esta implementação é um stub que NUNCA loga o código
 * ou o telefone (docs/05-SECURITY.md seção 9), pronta para ser substituída por
 * uma integração real (ex: Twilio, Zenvia) sem alterar OtpService.
 */
@Injectable()
export class OtpDeliveryService {
  constructor(@Inject('LOGGER') private readonly logger: LoggerService) {}

  async send(_phone: string, _code: string, purpose: OtpPurpose): Promise<void> {
    this.logger.log(`OTP gerado para envio (purpose=${purpose})`);
  }
}
