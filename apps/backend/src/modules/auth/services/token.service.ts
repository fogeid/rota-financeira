import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Plan } from '@prisma/client';
import * as crypto from 'crypto';
import * as ms from 'ms';
import type { StringValue } from 'ms';
import { PrismaService } from '../../../prisma/prisma.service';
import { sha256Hex } from '../../../common/utils/hash.util';
import { JwtAccessPayload } from '../types/authenticated-user';

export interface TokenPair {
  access_token: string;
  refresh_token: string;
}

/**
 * Geração e rotação de tokens — docs/05-SECURITY.md seção 4.
 * Access token: JWT HS256, 15min. Refresh token: 64 bytes aleatórios,
 * armazenado como SHA-256 hash, expira em 30 dias, rotacionado a cada uso.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  signAccessToken(payload: { sub: string; plan: Plan }): string {
    return this.jwt.sign(payload as JwtAccessPayload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES', '15m') as StringValue,
    });
  }

  /** Cria um novo par de tokens e persiste o refresh token (hash) no banco. */
  async issueTokenPair(userId: string, plan: Plan, deviceInfo?: string): Promise<TokenPair> {
    const access_token = this.signAccessToken({ sub: userId, plan });
    const refresh_token = crypto.randomBytes(64).toString('hex');
    const refreshExpiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES', '30d') as StringValue;

    await this.prisma.refreshToken.create({
      data: {
        user_id: userId,
        token_hash: sha256Hex(refresh_token),
        device_info: deviceInfo,
        expires_at: new Date(Date.now() + ms(refreshExpiresIn)),
      },
    });

    return { access_token, refresh_token };
  }

  /**
   * Rotaciona um refresh token: revoga o atual e emite um novo par.
   * Lança erro se o token não existir, estiver revogado ou expirado.
   */
  async rotateRefreshToken(refreshToken: string, deviceInfo?: string): Promise<TokenPair | null> {
    const tokenHash = sha256Hex(refreshToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { token_hash: tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revoked_at || stored.expires_at < new Date()) {
      return null;
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked_at: new Date() },
    });

    return this.issueTokenPair(stored.user_id, stored.user.plan, deviceInfo);
  }

  /** Revoga um refresh token pelo valor em texto puro recebido do client. */
  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const tokenHash = sha256Hex(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { token_hash: tokenHash, revoked_at: null },
      data: { revoked_at: new Date() },
    });
  }

  /** Revoga todos os refresh tokens ativos de um usuário (ex: exclusão de conta). */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { user_id: userId, revoked_at: null },
      data: { revoked_at: new Date() },
    });
  }
}
