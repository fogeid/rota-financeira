import { BadRequestException, ConflictException, HttpException, UnauthorizedException } from '@nestjs/common';
import { OtpPurpose, Plan } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { EncryptionService } from '../../common/services/encryption.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';
import { LoginThrottleService } from './services/login-throttle.service';
import { OtpResendThrottleService } from './services/otp-resend-throttle.service';
import { OtpService } from './services/otp.service';
import { PendingRegistrationService } from './services/pending-registration.service';
import { TokenService } from './services/token.service';

const BCRYPT_COST_FOR_TESTS = 4; // custo reduzido apenas para acelerar os testes

describe('AuthService', () => {
  let service: AuthService;

  let prisma: {
    user: { findFirst: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
    loginAttempt: { create: jest.Mock };
  };
  let encryption: { hash: jest.Mock; encrypt: jest.Mock };
  let tokenService: {
    issueTokenPair: jest.Mock;
    rotateRefreshToken: jest.Mock;
    revokeRefreshToken: jest.Mock;
    revokeAllUserTokens: jest.Mock;
  };
  let otpService: { verify: jest.Mock; generateAndSend: jest.Mock; markUsed: jest.Mock };
  let otpResendThrottle: { check: jest.Mock; record: jest.Mock };
  let loginThrottle: { getBlockRemainingSeconds: jest.Mock; recordFailure: jest.Mock; reset: jest.Mock };
  let pendingRegistration: { save: jest.Mock; get: jest.Mock; delete: jest.Mock };

  const baseUser = {
    id: 'user-1',
    name: 'Carlos Souza',
    cpf_hash: 'hash(11144477735)',
    email_hash: 'hash(carlos@email.com)',
    phone_hash: 'hash(+5511999998888)',
    password_hash: '',
    plan: Plan.FREE,
    trial_ends_at: null,
    deleted_at: null as Date | null,
  };

  beforeEach(() => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      loginAttempt: { create: jest.fn().mockResolvedValue({}) },
    };

    encryption = {
      hash: jest.fn((value: string) => `hash(${value})`),
      encrypt: jest.fn((value: string) => `enc(${value})`),
    };

    tokenService = {
      issueTokenPair: jest.fn().mockResolvedValue({ access_token: 'access', refresh_token: 'refresh' }),
      rotateRefreshToken: jest.fn(),
      revokeRefreshToken: jest.fn().mockResolvedValue(undefined),
      revokeAllUserTokens: jest.fn().mockResolvedValue(undefined),
    };

    otpService = {
      verify: jest.fn(),
      generateAndSend: jest.fn().mockResolvedValue({ id: 'otp-1' }),
      markUsed: jest.fn().mockResolvedValue(undefined),
    };

    otpResendThrottle = {
      check: jest.fn(),
      record: jest.fn().mockResolvedValue(undefined),
    };

    loginThrottle = {
      getBlockRemainingSeconds: jest.fn().mockResolvedValue(null),
      recordFailure: jest.fn().mockResolvedValue(undefined),
      reset: jest.fn().mockResolvedValue(undefined),
    };

    pendingRegistration = {
      save: jest.fn().mockResolvedValue(undefined),
      get: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    service = new AuthService(
      prisma as unknown as PrismaService,
      encryption as unknown as EncryptionService,
      tokenService as unknown as TokenService,
      otpService as unknown as OtpService,
      otpResendThrottle as unknown as OtpResendThrottleService,
      loginThrottle as unknown as LoginThrottleService,
      pendingRegistration as unknown as PendingRegistrationService,
    );
  });

  describe('register', () => {
    const dto = {
      name: 'Carlos Souza',
      cpf: '111.444.777-35',
      phone: '+5511999998888',
      email: 'carlos@email.com',
      password: 'Senha@123',
    };

    it('inicia o cadastro e envia OTP quando CPF é válido e ainda não está em uso', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      const result = await service.register(dto);

      expect(result.message).toBe('OTP enviado para o telefone informado');
      expect(pendingRegistration.save).toHaveBeenCalledWith(
        'hash(+5511999998888)',
        expect.objectContaining({
          name: 'Carlos Souza',
          cpf_hash: 'hash(11144477735)',
          email_hash: 'hash(carlos@email.com)',
          phone_hash: 'hash(+5511999998888)',
        }),
      );
      expect(otpService.generateAndSend).toHaveBeenCalledWith(
        expect.objectContaining({ phone: dto.phone, purpose: OtpPurpose.REGISTRATION }),
      );
    });

    it('rejeita o cadastro quando CPF, e-mail ou telefone já estão cadastrados', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'existing-user' });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      expect(pendingRegistration.save).not.toHaveBeenCalled();
      expect(otpService.generateAndSend).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const dto = { cpf: '111.444.777-35', password: 'Senha@123' };

    it('emite tokens e registra tentativa de sucesso quando CPF e senha estão corretos', async () => {
      const password_hash = await bcrypt.hash('Senha@123', BCRYPT_COST_FOR_TESTS);
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, password_hash });

      const result = await service.login(dto, '127.0.0.1');

      expect(result.access_token).toBe('access');
      expect(result.user.id).toBe('user-1');
      expect(loginThrottle.reset).toHaveBeenCalledWith('hash(11144477735)');
      expect(prisma.loginAttempt.create).toHaveBeenCalledWith({
        data: { user_id: 'user-1', cpf_hash: 'hash(11144477735)', ip_address: '127.0.0.1', success: true },
      });
    });

    it('rejeita login e registra tentativa falha quando a senha está incorreta', async () => {
      const password_hash = await bcrypt.hash('outra-senha', BCRYPT_COST_FOR_TESTS);
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, password_hash });

      await expect(service.login(dto, '127.0.0.1')).rejects.toThrow(UnauthorizedException);

      expect(loginThrottle.recordFailure).toHaveBeenCalledWith('hash(11144477735)');
      expect(prisma.loginAttempt.create).toHaveBeenCalledWith({
        data: { user_id: 'user-1', cpf_hash: 'hash(11144477735)', ip_address: '127.0.0.1', success: false },
      });
      expect(tokenService.issueTokenPair).not.toHaveBeenCalled();
    });

    it('rejeita login quando o CPF não está cadastrado', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(dto, '127.0.0.1')).rejects.toThrow(UnauthorizedException);

      expect(prisma.loginAttempt.create).toHaveBeenCalledWith({
        data: { user_id: undefined, cpf_hash: 'hash(11144477735)', ip_address: '127.0.0.1', success: false },
      });
    });

    it('rejeita login para contas com soft delete mesmo com senha correta', async () => {
      const password_hash = await bcrypt.hash('Senha@123', BCRYPT_COST_FOR_TESTS);
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, password_hash, deleted_at: new Date() });

      await expect(service.login(dto, '127.0.0.1')).rejects.toThrow(UnauthorizedException);
    });

    it('bloqueia a conta (HTTP 423) ao atingir a 5ª tentativa falha consecutiva', async () => {
      const password_hash = await bcrypt.hash('outra-senha', BCRYPT_COST_FOR_TESTS);
      prisma.user.findUnique.mockResolvedValue({ ...baseUser, password_hash });
      loginThrottle.getBlockRemainingSeconds
        .mockResolvedValueOnce(null) // verificação inicial: ainda não bloqueado
        .mockResolvedValueOnce(900); // após registrar a 5ª falha: bloqueado por 15min

      const error = await service.login(dto, '127.0.0.1').catch((e: unknown) => e);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(423);
      expect((error as HttpException).getResponse()).toEqual(
        expect.objectContaining({ message: 'Conta bloqueada por excesso de tentativas', retry_after: 900 }),
      );
    });

    it('rejeita login imediatamente (HTTP 423) quando o CPF já está bloqueado', async () => {
      loginThrottle.getBlockRemainingSeconds.mockResolvedValue(600);

      const error = await service.login(dto, '127.0.0.1').catch((e: unknown) => e);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(423);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('verifyOtp', () => {
    const dto = { phone: '+5511999998888', code: '123456', purpose: OtpPurpose.REGISTRATION };

    it('lança erro 400 "Código expirado" quando o OTP expirou', async () => {
      otpService.verify.mockResolvedValue({ success: false, reason: 'EXPIRED' });

      await expect(service.verifyOtp(dto)).rejects.toThrow(BadRequestException);
      await expect(service.verifyOtp(dto)).rejects.toThrow('Código expirado');
    });

    it('lança erro 400 "Código inválido" quando o código informado está errado', async () => {
      otpService.verify.mockResolvedValue({ success: false, reason: 'INVALID_CODE' });

      await expect(service.verifyOtp(dto)).rejects.toThrow('Código inválido');
    });

    it('lança erro quando o cadastro pendente expirou no Redis', async () => {
      otpService.verify.mockResolvedValue({ success: true, otp: { id: 'otp-1' } });
      pendingRegistration.get.mockResolvedValue(null);

      await expect(service.verifyOtp(dto)).rejects.toThrow('Cadastro expirado. Inicie o cadastro novamente.');
    });

    it('cria o usuário e emite tokens quando o OTP é válido', async () => {
      otpService.verify.mockResolvedValue({ success: true, otp: { id: 'otp-1' } });
      pendingRegistration.get.mockResolvedValue({
        name: 'Carlos Souza',
        cpf: 'enc(11144477735)',
        cpf_hash: 'hash(11144477735)',
        email: 'enc(carlos@email.com)',
        email_hash: 'hash(carlos@email.com)',
        phone: 'enc(+5511999998888)',
        phone_hash: 'hash(+5511999998888)',
        password_hash: 'bcrypt-hash',
      });
      prisma.user.create.mockResolvedValue({ ...baseUser });

      const result = await service.verifyOtp(dto);

      expect(otpService.markUsed).toHaveBeenCalledWith('otp-1');
      expect(pendingRegistration.delete).toHaveBeenCalledWith('hash(+5511999998888)');
      expect(result.access_token).toBe('access');
      expect(result.user).toEqual({ id: 'user-1', name: 'Carlos Souza', plan: Plan.FREE, trial_ends_at: null });
    });
  });

  describe('refresh', () => {
    it('retorna novos tokens quando o refresh token é válido (rotação)', async () => {
      tokenService.rotateRefreshToken.mockResolvedValue({ access_token: 'novo-access', refresh_token: 'novo-refresh' });

      const result = await service.refresh({ refresh_token: 'token-valido' });

      expect(result).toEqual({ access_token: 'novo-access', refresh_token: 'novo-refresh' });
      expect(tokenService.rotateRefreshToken).toHaveBeenCalledWith('token-valido', undefined);
    });

    it('lança 401 quando o refresh token é inválido, expirado ou revogado', async () => {
      tokenService.rotateRefreshToken.mockResolvedValue(null);

      await expect(service.refresh({ refresh_token: 'token-invalido' })).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('resetPassword', () => {
    const dto = { phone: '+5511999998888', code: '123456', new_password: 'NovaSenha@456' };

    it('atualiza a senha e revoga todas as sessões ao redefinir a senha', async () => {
      otpService.verify.mockResolvedValue({ success: true, otp: { id: 'otp-1' } });
      prisma.user.findUnique.mockResolvedValue({ ...baseUser });
      prisma.user.update.mockResolvedValue({ ...baseUser });

      const result = await service.resetPassword(dto);

      expect(result).toEqual({ message: 'Senha alterada com sucesso' });
      expect(otpService.markUsed).toHaveBeenCalledWith('otp-1');
      expect(tokenService.revokeAllUserTokens).toHaveBeenCalledWith('user-1');
    });

    it('lança erro quando o código de recuperação é inválido', async () => {
      otpService.verify.mockResolvedValue({ success: false, reason: 'INVALID_CODE' });

      await expect(service.resetPassword(dto)).rejects.toThrow(BadRequestException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});
