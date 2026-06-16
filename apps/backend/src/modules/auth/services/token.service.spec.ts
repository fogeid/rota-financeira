import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Plan } from '@prisma/client';
import { sha256Hex } from '../../../common/utils/hash.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { TokenService } from './token.service';

describe('TokenService', () => {
  let service: TokenService;
  let jwt: { sign: jest.Mock };
  let config: ConfigService;
  let prisma: {
    refreshToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };

  beforeEach(() => {
    jwt = { sign: jest.fn().mockReturnValue('signed-access-token') };

    config = {
      getOrThrow: jest.fn().mockReturnValue('access-secret-com-32-caracteres-min'),
      get: jest.fn((_key: string, fallback?: string) => fallback),
    } as unknown as ConfigService;

    prisma = {
      refreshToken: {
        create: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    service = new TokenService(jwt as unknown as JwtService, config, prisma as unknown as PrismaService);
  });

  describe('issueTokenPair', () => {
    it('assina o access token via JwtService e persiste o hash do refresh token', async () => {
      const tokens = await service.issueTokenPair('user-1', Plan.FREE);

      expect(tokens.access_token).toBe('signed-access-token');
      expect(tokens.refresh_token).toMatch(/^[0-9a-f]{128}$/); // 64 bytes em hex

      expect(prisma.refreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          user_id: 'user-1',
          token_hash: sha256Hex(tokens.refresh_token),
        }),
      });
    });
  });

  describe('rotateRefreshToken', () => {
    it('retorna null quando o refresh token não existe', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      const result = await service.rotateRefreshToken('token-inexistente');

      expect(result).toBeNull();
      expect(prisma.refreshToken.update).not.toHaveBeenCalled();
    });

    it('retorna null quando o refresh token já foi revogado', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        user_id: 'user-1',
        revoked_at: new Date(),
        expires_at: new Date(Date.now() + 60_000),
        user: { plan: Plan.FREE },
      });

      const result = await service.rotateRefreshToken('token-revogado');

      expect(result).toBeNull();
    });

    it('retorna null quando o refresh token está expirado', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        user_id: 'user-1',
        revoked_at: null,
        expires_at: new Date(Date.now() - 1000),
        user: { plan: Plan.FREE },
      });

      const result = await service.rotateRefreshToken('token-expirado');

      expect(result).toBeNull();
    });

    it('revoga o token atual e emite um novo par quando o token é válido', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        user_id: 'user-1',
        revoked_at: null,
        expires_at: new Date(Date.now() + 60_000),
        user: { plan: Plan.PRO },
      });

      const tokens = await service.rotateRefreshToken('token-valido');

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt-1' },
        data: { revoked_at: expect.any(Date) },
      });
      expect(tokens).not.toBeNull();
      expect(tokens?.access_token).toBe('signed-access-token');
      expect(tokens?.refresh_token).toMatch(/^[0-9a-f]{128}$/);
    });
  });

  describe('revokeRefreshToken', () => {
    it('revoga o refresh token pelo hash do valor informado', async () => {
      await service.revokeRefreshToken('meu-refresh-token');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { token_hash: sha256Hex('meu-refresh-token'), revoked_at: null },
        data: { revoked_at: expect.any(Date) },
      });
    });
  });

  describe('revokeAllUserTokens', () => {
    it('revoga todos os refresh tokens ativos do usuário', async () => {
      await service.revokeAllUserTokens('user-1');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { user_id: 'user-1', revoked_at: null },
        data: { revoked_at: expect.any(Date) },
      });
    });
  });
});
