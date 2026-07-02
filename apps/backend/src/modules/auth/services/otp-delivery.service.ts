import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpPurpose } from '@prisma/client';

@Injectable()
export class OtpDeliveryService {
  constructor(
    private readonly config: ConfigService,
    @Inject('LOGGER') private readonly logger: LoggerService,
  ) {}

  async send(phone: string, code: string, purpose: OtpPurpose): Promise<void> {
    const bypassMode = this.config.get<string>('OTP_BYPASS_MODE') === 'true';
    const nodeEnv = this.config.get<string>('NODE_ENV');

    if (bypassMode && nodeEnv === 'production') {
      throw new Error('OTP_BYPASS_MODE não pode estar ativo em produção');
    }

    if (bypassMode) {
      this.logger.warn(`[DEV] OTP bypass ativo — SMS não enviado (purpose=${purpose})`);
      return;
    }

    await this.sendViaZenvia(phone, code);
    this.logger.log(`SMS OTP enviado (purpose=${purpose})`);
  }

  private async sendViaZenvia(phone: string, code: string): Promise<void> {
    const apiToken = this.config.get<string>('ZENVIA_API_TOKEN');
    if (!apiToken) {
      throw new Error('ZENVIA_API_TOKEN não configurado — configure o .env ou ative OTP_BYPASS_MODE=true para desenvolvimento');
    }

    const e164 = phone.startsWith('+') ? phone : `+55${phone.replace(/\D/g, '')}`;
    const message = `Seu código Motorista Rico: ${code}. Válido por 5 minutos. Não compartilhe.`;

    const response = await fetch('https://api.zenvia.com/v2/channels/sms/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-TOKEN': apiToken,
      },
      body: JSON.stringify({
        from: 'MotoristaRico',
        to: e164,
        contents: [{ type: 'text', text: message }],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Zenvia erro ${response.status}: ${body}`);
    }
  }
}
