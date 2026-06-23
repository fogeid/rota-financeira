import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpCode, OtpPurpose } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { sha256Hex } from '../../../common/utils/hash.util';
import { OtpDeliveryService } from './otp-delivery.service';

export const OTP_EXPIRES_IN_MS = 5 * 60 * 1000; // 5 minutos — docs/05-SECURITY.md seção 4
export const OTP_MAX_ATTEMPTS = 3; // docs/05-SECURITY.md seção 4

export type OtpVerificationFailureReason = 'NOT_FOUND' | 'EXPIRED' | 'INVALID_CODE' | 'TOO_MANY_ATTEMPTS';

export type OtpVerificationResult =
  | { success: true; otp: OtpCode }
  | { success: false; reason: OtpVerificationFailureReason };

/**
 * Geração, envio e verificação de códigos OTP — docs/04-API-SPEC.md (AUTH) e
 * docs/05-SECURITY.md seção 4. O código em texto puro NUNCA é persistido nem logado.
 */
@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly delivery: OtpDeliveryService,
    private readonly config: ConfigService,
  ) {}

  private generateCode(): string {
    return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
  }

  /** Gera um novo código OTP, persiste o hash e envia ao usuário. */
  async generateAndSend(params: { phone: string; phoneHash: string; purpose: OtpPurpose; userId?: string }): Promise<OtpCode> {
    const bypassMode = this.config.get<string>('OTP_BYPASS_MODE') === 'true';
    const code = bypassMode
      ? (this.config.get<string>('OTP_BYPASS_CODE') ?? this.generateCode())
      : this.generateCode();

    const otp = await this.prisma.otpCode.create({
      data: {
        user_id: params.userId,
        phone_hash: params.phoneHash,
        code_hash: sha256Hex(code),
        purpose: params.purpose,
        expires_at: new Date(Date.now() + OTP_EXPIRES_IN_MS),
      },
    });

    await this.delivery.send(params.phone, code, params.purpose);

    return otp;
  }

  /** Verifica o código informado contra o OTP mais recente válido para o telefone/propósito. */
  async verify(params: { phoneHash: string; code: string; purpose: OtpPurpose }): Promise<OtpVerificationResult> {
    const otp = await this.prisma.otpCode.findFirst({
      where: {
        phone_hash: params.phoneHash,
        purpose: params.purpose,
        used_at: null,
      },
      orderBy: { created_at: 'desc' },
    });

    if (!otp) {
      return { success: false, reason: 'NOT_FOUND' };
    }

    if (otp.expires_at < new Date()) {
      return { success: false, reason: 'EXPIRED' };
    }

    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      return { success: false, reason: 'TOO_MANY_ATTEMPTS' };
    }

    if (sha256Hex(params.code) !== otp.code_hash) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      const remaining = OTP_MAX_ATTEMPTS - (otp.attempts + 1);
      return { success: false, reason: remaining <= 0 ? 'TOO_MANY_ATTEMPTS' : 'INVALID_CODE' };
    }

    return { success: true, otp };
  }

  /** Marca o OTP como utilizado, impedindo reuso. */
  async markUsed(otpId: string): Promise<void> {
    await this.prisma.otpCode.update({
      where: { id: otpId },
      data: { used_at: new Date() },
    });
  }
}
