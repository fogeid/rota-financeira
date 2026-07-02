import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Plan, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { EncryptionService } from '../../common/services/encryption.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OtpService } from '../auth/services/otp.service';
import { TokenService } from '../auth/services/token.service';
import { UsersService } from './users.service';

const BCRYPT_COST_FOR_TESTS = 4;

describe('UsersService', () => {
  let service: UsersService;

  let prisma: {
    user: { findUnique: jest.Mock; update: jest.Mock };
  };
  let encryption: { hash: jest.Mock; encrypt: jest.Mock; decrypt: jest.Mock };
  let otpService: { generateAndSend: jest.Mock; verify: jest.Mock; markUsed: jest.Mock };
  let tokenService: { revokeAllUserTokens: jest.Mock };

  const makeUser = async (overrides: Partial<User> = {}): Promise<User> => ({
    id: 'user-1',
    name: 'Carlos Souza',
    cpf: 'enc(11144477735)',
    cpf_hash: 'hash(11144477735)',
    email: 'enc(carlos@email.com)',
    email_hash: 'hash(carlos@email.com)',
    phone: 'enc(+5511999998888)',
    phone_hash: 'hash(+5511999998888)',
    password_hash: await bcrypt.hash('Senha@123', BCRYPT_COST_FOR_TESTS),
    plan: Plan.FREE,
    trial_ends_at: null,
    plan_expires_at: null,
    is_active: true,
    biometry_enabled: false,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    plan_granted_by: null,
    ...overrides,
  });

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    encryption = {
      hash: jest.fn((value: string) => `hash(${value})`),
      encrypt: jest.fn((value: string) => `enc(${value})`),
      decrypt: jest.fn((value: string) => value.replace(/^enc\((.*)\)$/, '$1')),
    };

    otpService = {
      generateAndSend: jest.fn().mockResolvedValue({ id: 'otp-1' }),
      verify: jest.fn(),
      markUsed: jest.fn().mockResolvedValue(undefined),
    };

    tokenService = {
      revokeAllUserTokens: jest.fn().mockResolvedValue(undefined),
    };

    service = new UsersService(
      prisma as unknown as PrismaService,
      encryption as unknown as EncryptionService,
      otpService as unknown as OtpService,
      tokenService as unknown as TokenService,
    );
  });

  describe('getProfile', () => {
    it('retorna o perfil com campos sensíveis mascarados', async () => {
      prisma.user.findUnique.mockResolvedValue(await makeUser());

      const profile = await service.getProfile('user-1');

      expect(profile.id).toBe('user-1');
      expect(profile.cpf).toBe('***.444.***-**');
      expect(profile.email).toBe('c***@email.com');
      expect(profile.phone).toBe('+55119****8888');
    });

    it('lança NotFoundException quando o usuário não existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('inexistente')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('atualiza o nome quando a senha atual está correta', async () => {
      const user = await makeUser();
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.user.update.mockResolvedValue({ ...user, name: 'Carlos Novo' });

      const result = await service.updateProfile('user-1', { name: 'Carlos Novo', current_password: 'Senha@123' });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: expect.objectContaining({ name: 'Carlos Novo' }),
      });
      expect(result.name).toBe('Carlos Novo');
    });

    it('rejeita atualização quando a senha atual está incorreta', async () => {
      prisma.user.findUnique.mockResolvedValue(await makeUser());

      await expect(
        service.updateProfile('user-1', { name: 'Novo Nome', current_password: 'senhaErrada' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejeita atualização de e-mail quando o novo e-mail já está em uso', async () => {
      const user = await makeUser();
      prisma.user.findUnique
        .mockResolvedValueOnce(user) // busca pelo id
        .mockResolvedValueOnce({ id: 'outro-usuario' }); // busca por email_hash (conflito)

      await expect(
        service.updateProfile('user-1', { email: 'novo@email.com', current_password: 'Senha@123' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('changePassword', () => {
    it('altera a senha quando a senha atual está correta', async () => {
      prisma.user.findUnique.mockResolvedValue(await makeUser());
      prisma.user.update.mockResolvedValue({});

      const result = await service.changePassword('user-1', {
        current_password: 'Senha@123',
        new_password: 'NovaSenha@456',
      });

      expect(result).toEqual({ message: 'Senha alterada com sucesso' });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { password_hash: expect.any(String) },
      });
    });

    it('rejeita alteração de senha quando a senha atual está incorreta', async () => {
      prisma.user.findUnique.mockResolvedValue(await makeUser());

      await expect(
        service.changePassword('user-1', { current_password: 'senhaErrada', new_password: 'NovaSenha@456' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('updateBiometry', () => {
    it('ativa a biometria quando enabled = true', async () => {
      prisma.user.update.mockResolvedValue({ biometry_enabled: true });

      const result = await service.updateBiometry('user-1', { enabled: true });

      expect(result).toEqual({ biometry_enabled: true });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { biometry_enabled: true },
      });
    });
  });

  describe('deleteAccount — soft delete', () => {
    it('realiza soft delete e invalida todas as sessões quando a senha está correta', async () => {
      prisma.user.findUnique.mockResolvedValue(await makeUser());
      prisma.user.update.mockResolvedValue({});

      const result = await service.deleteAccount('user-1', {
        password: 'Senha@123',
        confirmation: 'EXCLUIR MINHA CONTA',
      });

      expect(result.message).toContain('marcada para exclusão');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { deleted_at: expect.any(Date) },
      });
      expect(tokenService.revokeAllUserTokens).toHaveBeenCalledWith('user-1');
    });

    it('rejeita exclusão quando a senha está incorreta', async () => {
      prisma.user.findUnique.mockResolvedValue(await makeUser());

      await expect(
        service.deleteAccount('user-1', { password: 'senhaErrada', confirmation: 'EXCLUIR MINHA CONTA' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(tokenService.revokeAllUserTokens).not.toHaveBeenCalled();
    });

    it('lança NotFoundException quando o usuário não existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteAccount('inexistente', { password: 'Senha@123', confirmation: 'EXCLUIR MINHA CONTA' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
