import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface PagarmeCustomer {
  id: string;
}

export interface PagarmeSubscription {
  id: string;
  status: string;
  current_cycle: {
    start_at: string;
    end_at: string;
  };
}

export interface PagarmePixCharge {
  id: string;
  last_transaction: {
    qr_code: string;
    qr_code_url: string;
    expires_at: string;
  };
}

@Injectable()
export class PagarmeService {
  private readonly baseUrl = 'https://api.pagar.me/core/v5';
  private readonly apiKey: string;
  private readonly webhookSecret: string;

  constructor(config: ConfigService) {
    this.apiKey = config.getOrThrow<string>('PAGARME_API_KEY');
    this.webhookSecret = config.getOrThrow<string>('PAGARME_WEBHOOK_SECRET');
  }

  async createCustomer(params: {
    name: string;
    email: string;
    externalId: string;
  }): Promise<PagarmeCustomer> {
    const response = await this.request<PagarmeCustomer>('POST', '/customers', {
      name: params.name,
      email: params.email,
      code: params.externalId,
      type: 'individual',
    });
    return response;
  }

  async createCardSubscription(params: {
    customerId: string;
    planId: string;
    cardToken: string;
    amountCents: number;
    intervalType: 'month' | 'year';
  }): Promise<PagarmeSubscription> {
    const response = await this.request<PagarmeSubscription>('POST', '/subscriptions', {
      customer_id: params.customerId,
      payment_method: 'credit_card',
      credit_card: { card_token: params.cardToken },
      pricing_scheme: {
        price: params.amountCents,
        scheme_type: 'unit',
      },
      interval: params.intervalType,
      interval_count: 1,
      billing_type: 'prepaid',
      items: [
        {
          description: 'Motorista Rico Premium',
          pricing_scheme: {
            price: params.amountCents,
            scheme_type: 'unit',
          },
          quantity: 1,
        },
      ],
    });
    return response;
  }

  async createPixCharge(params: {
    customerId: string;
    amountCents: number;
  }): Promise<PagarmePixCharge> {
    const expiresAt = new Date(Date.now() + 30 * 60_000).toISOString();
    const response = await this.request<PagarmePixCharge>('POST', '/charges', {
      customer_id: params.customerId,
      payment_method: 'pix',
      amount: params.amountCents,
      pix: { expires_at: expiresAt },
    });
    return response;
  }

  async cancelSubscription(pagarmeSubId: string): Promise<void> {
    await this.request('DELETE', `/subscriptions/${pagarmeSubId}`);
  }

  /** Valida assinatura HMAC-SHA256 do webhook — docs/05-SECURITY.md seção 7 */
  validateWebhookSignature(payload: string, signature: string): boolean {
    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(expected, 'hex'),
        Buffer.from(signature, 'hex'),
      );
    } catch {
      // Buffer lengths differ → invalid signature
      return false;
    }
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const credentials = Buffer.from(`${this.apiKey}:`).toString('base64');
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'unknown error');
      throw new InternalServerErrorException(
        `Pagar.me API error ${response.status}: ${text}`,
      );
    }

    if (response.status === 204) {
      return undefined as unknown as T;
    }

    return response.json() as Promise<T>;
  }
}
