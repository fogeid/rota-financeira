import { ConfigService } from '@nestjs/config';
import { OtpCode, OtpPurpose } from '@prisma/client';
import { sha256Hex } from '../../../common/utils/hash.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { OTP_MAX_ATTEMPTS, OtpService } from './otp.service';
import { OtpDeliveryService } from './otp-delivery.service';

describe('OtpService', () => {
  let service: OtpService;
  let prisma: {
    otpCode: {
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };
  let delivery: { send: jest.Mock };
  let config: { get: jest.Mock };

  const phoneHash = 'phone-hash';

  beforeEach(() => {
    prisma = {
      otpCode: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    delivery = { send: jest.fn().mockResolvedValue(undefined) };
    config = { get: jest.fn().mockReturnValue(undefined) };

    service = new OtpService(
      prisma as unknown as PrismaService,
      delivery as unknown as OtpDeliveryService,
      config as unknown as ConfigService,
    );
  });

  describe('generateAndSend', () => {
    it('persiste apenas o hash do código e envia o código em texto puro pelo delivery', async () => {
      prisma.otpCode.create.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ id: 'otp-1', attempts: 0, used_at: null, created_at: new Date(), ...data }) as Promise<OtpCode>,
      );

      const otp = await service.generateAndSend({
        phone: '+5511999998888',
        phoneHash,
        purpose: OtpPurpose.REGISTRATION,
      });

      expect(delivery.send).toHaveBeenCalledTimes(1);
      const [sentPhone, sentCode] = delivery.send.mock.calls[0] as [string, string];
      expect(sentPhone).toBe('+5511999998888');
      expect(sentCode).toMatch(/^\d{6}$/);
      expect(otp.code_hash).toBe(sha256Hex(sentCode));
      expect(otp.code_hash).not.toBe(sentCode);
    });
  });

  describe('verify', () => {
    it('retorna NOT_FOUND quando não há OTP pendente para o telefone/propósito', async () => {
      prisma.otpCode.findFirst.mockResolvedValue(null);

      const result = await service.verify({ phoneHash, code: '123456', purpose: OtpPurpose.REGISTRATION });

      expect(result).toEqual({ success: false, reason: 'NOT_FOUND' });
    });

    it('retorna EXPIRED quando o código já expirou', async () => {
      prisma.otpCode.findFirst.mockResolvedValue({
        id: 'otp-1',
        attempts: 0,
        expires_at: new Date(Date.now() - 1000),
        code_hash: sha256Hex('123456'),
      });

      const result = await service.verify({ phoneHash, code: '123456', purpose: OtpPurpose.REGISTRATION });

      expect(result).toEqual({ success: false, reason: 'EXPIRED' });
    });

    it('retorna INVALID_CODE e incrementa tentativas quando o código informado está errado', async () => {
      prisma.otpCode.findFirst.mockResolvedValue({
        id: 'otp-1',
        attempts: 0,
        expires_at: new Date(Date.now() + 60_000),
        code_hash: sha256Hex('123456'),
      });
      prisma.otpCode.update.mockResolvedValue({});

      const result = await service.verify({ phoneHash, code: '000000', purpose: OtpPurpose.REGISTRATION });

      expect(result).toEqual({ success: false, reason: 'INVALID_CODE' });
      expect(prisma.otpCode.update).toHaveBeenCalledWith({
        where: { id: 'otp-1' },
        data: { attempts: { increment: 1 } },
      });
    });

    it('retorna TOO_MANY_ATTEMPTS quando o limite de tentativas já foi atingido', async () => {
      prisma.otpCode.findFirst.mockResolvedValue({
        id: 'otp-1',
        attempts: OTP_MAX_ATTEMPTS,
        expires_at: new Date(Date.now() + 60_000),
        code_hash: sha256Hex('123456'),
      });

      const result = await service.verify({ phoneHash, code: '123456', purpose: OtpPurpose.REGISTRATION });

      expect(result).toEqual({ success: false, reason: 'TOO_MANY_ATTEMPTS' });
    });

    it('retorna TOO_MANY_ATTEMPTS quando um código errado esgota a última tentativa', async () => {
      prisma.otpCode.findFirst.mockResolvedValue({
        id: 'otp-1',
        attempts: OTP_MAX_ATTEMPTS - 1,
        expires_at: new Date(Date.now() + 60_000),
        code_hash: sha256Hex('123456'),
      });
      prisma.otpCode.update.mockResolvedValue({});

      const result = await service.verify({ phoneHash, code: '000000', purpose: OtpPurpose.REGISTRATION });

      expect(result).toEqual({ success: false, reason: 'TOO_MANY_ATTEMPTS' });
    });

    it('retorna sucesso quando o código está correto, dentro da validade e das tentativas', async () => {
      const otp = {
        id: 'otp-1',
        attempts: 0,
        expires_at: new Date(Date.now() + 60_000),
        code_hash: sha256Hex('123456'),
      };
      prisma.otpCode.findFirst.mockResolvedValue(otp);

      const result = await service.verify({ phoneHash, code: '123456', purpose: OtpPurpose.REGISTRATION });

      expect(result).toEqual({ success: true, otp });
    });
  });

  describe('markUsed', () => {
    it('marca o OTP como utilizado, impedindo reuso', async () => {
      prisma.otpCode.update.mockResolvedValue({});

      await service.markUsed('otp-1');

      expect(prisma.otpCode.update).toHaveBeenCalledWith({
        where: { id: 'otp-1' },
        data: { used_at: expect.any(Date) },
      });
    });
  });
});
