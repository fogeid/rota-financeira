import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { OtpPurpose } from '@prisma/client';
import { REDIS_CLIENT } from '../../../redis/redis.module';

export const OTP_RESEND_MAX = 5; // 5 reenvios por sessão / 30 min — docs/05-SECURITY.md seções 4 e 5
export const OTP_RESEND_WINDOW_SECONDS = 30 * 60;
export const OTP_RESEND_MIN_INTERVAL_SECONDS = 60; // intervalo mínimo entre reenvios — docs/05-SECURITY.md seção 4

export type OtpResendCheckResult = { allowed: true } | { allowed: false; retry_after: number };

/**
 * Controla a taxa de reenvio de OTP — docs/05-SECURITY.md seções 4 e 5:
 * máximo de 5 reenvios em 30 minutos e intervalo mínimo de 60s entre reenvios.
 */
@Injectable()
export class OtpResendThrottleService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  private countKey(phoneHash: string, purpose: OtpPurpose): string {
    return `otp:resend:count:${purpose}:${phoneHash}`;
  }

  private cooldownKey(phoneHash: string, purpose: OtpPurpose): string {
    return `otp:resend:cooldown:${purpose}:${phoneHash}`;
  }

  /** Verifica se um reenvio é permitido sem registrá-lo. */
  async check(phoneHash: string, purpose: OtpPurpose): Promise<OtpResendCheckResult> {
    const cooldownTtl = await this.redis.ttl(this.cooldownKey(phoneHash, purpose));
    if (cooldownTtl > 0) {
      return { allowed: false, retry_after: cooldownTtl };
    }

    const count = await this.redis.get(this.countKey(phoneHash, purpose));
    if (count !== null && Number(count) >= OTP_RESEND_MAX) {
      const windowTtl = await this.redis.ttl(this.countKey(phoneHash, purpose));
      return { allowed: false, retry_after: windowTtl > 0 ? windowTtl : OTP_RESEND_WINDOW_SECONDS };
    }

    return { allowed: true };
  }

  /** Registra um reenvio, incrementando o contador da janela e aplicando o cooldown. */
  async record(phoneHash: string, purpose: OtpPurpose): Promise<void> {
    const countKey = this.countKey(phoneHash, purpose);
    const count = await this.redis.incr(countKey);
    if (count === 1) {
      await this.redis.expire(countKey, OTP_RESEND_WINDOW_SECONDS);
    }
    await this.redis.set(this.cooldownKey(phoneHash, purpose), '1', 'EX', OTP_RESEND_MIN_INTERVAL_SECONDS);
  }
}
