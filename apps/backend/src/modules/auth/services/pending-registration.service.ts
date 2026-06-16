import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../redis/redis.module';
import { OTP_EXPIRES_IN_MS } from './otp.service';

export interface PendingRegistration {
  name: string;
  cpf: string; // criptografado
  cpf_hash: string;
  email: string; // criptografado
  email_hash: string;
  phone: string; // criptografado
  phone_hash: string;
  password_hash: string;
}

/**
 * Armazena temporariamente os dados de cadastro entre POST /auth/register e
 * POST /auth/verify-otp. O usuário só é persistido no banco após a confirmação
 * do OTP — OtpCode.user_id é nulo durante o cadastro (docs/03-DATABASE-SCHEMA.md).
 */
@Injectable()
export class PendingRegistrationService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  private key(phoneHash: string): string {
    return `register:pending:${phoneHash}`;
  }

  async save(phoneHash: string, data: PendingRegistration): Promise<void> {
    await this.redis.set(this.key(phoneHash), JSON.stringify(data), 'PX', OTP_EXPIRES_IN_MS);
  }

  async get(phoneHash: string): Promise<PendingRegistration | null> {
    const raw = await this.redis.get(this.key(phoneHash));
    return raw ? (JSON.parse(raw) as PendingRegistration) : null;
  }

  async delete(phoneHash: string): Promise<void> {
    await this.redis.del(this.key(phoneHash));
  }
}
