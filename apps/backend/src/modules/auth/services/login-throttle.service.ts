import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../redis/redis.module';

export const LOGIN_MAX_ATTEMPTS = 5;
export const LOGIN_BLOCK_DURATION_SECONDS = 15 * 60; // 15 minutos

/**
 * Bloqueio por tentativas de login — docs/05-SECURITY.md seção 4 e regra absoluta:
 * 5 tentativas falhas consecutivas por CPF → bloqueio de 15 minutos.
 * Contagem por cpf_hash (nunca por IP) para evitar bloquear IPs compartilhados.
 */
@Injectable()
export class LoginThrottleService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  private attemptsKey(cpfHash: string): string {
    return `login:attempts:${cpfHash}`;
  }

  private blockedKey(cpfHash: string): string {
    return `login:blocked:${cpfHash}`;
  }

  /** Retorna os segundos restantes de bloqueio, ou null se não estiver bloqueado. */
  async getBlockRemainingSeconds(cpfHash: string): Promise<number | null> {
    const ttl = await this.redis.ttl(this.blockedKey(cpfHash));
    return ttl > 0 ? ttl : null;
  }

  /** Registra uma falha de login. Bloqueia o CPF após 5 tentativas. */
  async recordFailure(cpfHash: string): Promise<void> {
    const key = this.attemptsKey(cpfHash);
    const attempts = await this.redis.incr(key);
    if (attempts === 1) {
      await this.redis.expire(key, LOGIN_BLOCK_DURATION_SECONDS);
    }
    if (attempts >= LOGIN_MAX_ATTEMPTS) {
      await this.redis.set(this.blockedKey(cpfHash), '1', 'EX', LOGIN_BLOCK_DURATION_SECONDS);
    }
  }

  /** Reseta a contagem de tentativas após login bem-sucedido. */
  async reset(cpfHash: string): Promise<void> {
    await this.redis.del(this.attemptsKey(cpfHash), this.blockedKey(cpfHash));
  }
}
