import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Serviço de e-mail via SendGrid.
 * Se SENDGRID_API_KEY não estiver configurado, loga o conteúdo (útil em dev).
 */
@Injectable()
export class EmailService {
  private readonly apiKey: string | undefined;
  private readonly fromEmail: string;

  constructor(
    config: ConfigService,
    @Inject('LOGGER') private readonly logger: LoggerService,
  ) {
    this.apiKey = config.get<string>('SENDGRID_API_KEY');
    this.fromEmail = config.get<string>('SENDGRID_FROM_EMAIL', 'noreply@rotafinanceira.app');
  }

  async send({ to, subject, html }: SendEmailParams): Promise<void> {
    if (!this.apiKey) {
      this.logger.log({ message: '[EmailService] SENDGRID_API_KEY não configurada — e-mail não enviado', to, subject });
      return;
    }

    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: this.fromEmail, name: 'Rota Financeira' },
        subject,
        content: [{ type: 'text/html', value: html }],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error({ message: '[EmailService] Falha ao enviar e-mail via SendGrid', to, subject, status: res.status, body });
    } else {
      this.logger.log({ message: '[EmailService] E-mail enviado com sucesso', to, subject });
    }
  }

  buildInfluencerMonthlyReportHtml(params: {
    channelName: string;
    referenceMonth: string;
    activeSubscribers: number;
    commissionAmount: number;
    nextPaymentDate: string;
  }): string {
    const { channelName, referenceMonth, activeSubscribers, commissionAmount, nextPaymentDate } = params;
    const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Relatório de Comissão</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,system-ui,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden">
        <tr><td style="background:#2ECC8A;padding:24px 32px">
          <p style="margin:0;color:#fff;font-size:20px;font-weight:700">Rota Financeira</p>
          <p style="margin:4px 0 0;color:#d1fae5;font-size:13px">Portal do Influencer</p>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="margin:0 0 8px;font-size:15px;color:#475569">Olá, <strong>${channelName}</strong>!</p>
          <p style="margin:0 0 24px;font-size:14px;color:#64748b">
            Aqui está o resumo da sua comissão referente a <strong>${referenceMonth}</strong>:
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
            <tr style="background:#f8fafc">
              <td style="padding:12px 16px;font-size:13px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0">Métrica</td>
              <td style="padding:12px 16px;font-size:13px;color:#64748b;font-weight:600;text-align:right;border-bottom:1px solid #e2e8f0">Valor</td>
            </tr>
            <tr>
              <td style="padding:14px 16px;font-size:14px;color:#334155;border-bottom:1px solid #f1f5f9">Assinantes ativos</td>
              <td style="padding:14px 16px;font-size:14px;color:#334155;text-align:right;font-weight:600;border-bottom:1px solid #f1f5f9">${activeSubscribers}</td>
            </tr>
            <tr>
              <td style="padding:14px 16px;font-size:14px;color:#334155">Comissão do mês</td>
              <td style="padding:14px 16px;font-size:14px;color:#2ECC8A;text-align:right;font-weight:700">${brl(commissionAmount)}</td>
            </tr>
          </table>
          <div style="background:#f0fdf4;border:1px solid #bbf7d4;border-radius:12px;padding:16px;margin-top:24px">
            <p style="margin:0;font-size:13px;color:#166534">
              <strong>Pagamento previsto:</strong> ${nextPaymentDate}<br>
              O pagamento é realizado via PIX automático após D+30 do ciclo de faturamento.
            </p>
          </div>
          <p style="margin:24px 0 0;font-size:13px;color:#94a3b8">
            Acesse o <a href="https://dashboard.rotafinanceira.app" style="color:#2ECC8A;text-decoration:none;font-weight:600">dashboard</a>
            para ver o histórico completo e baixar materiais de divulgação.
          </p>
        </td></tr>
        <tr><td style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0">
          <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center">
            Rota Financeira — programa Rota Indica<br>
            <a href="mailto:parceiros@rotafinanceira.app" style="color:#2ECC8A">parceiros@rotafinanceira.app</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }
}
