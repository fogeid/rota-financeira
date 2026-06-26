import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminRole, InfluencerTier, Plan, WithdrawalStatus } from '@prisma/client';
import { AdminService } from './admin.service';
import { AdminAuditService } from './admin-audit.service';
import { AdminRolesGuard } from './guards/admin-roles.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../common/services/encryption.service';
import { InfluencerService } from '../influencer/influencer.service';
import { ReferralService } from '../referral/referral.service';

const mockPrismaBase = {
  user: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), aggregate: jest.fn() },
  earning: { aggregate: jest.fn() },
  cost: { aggregate: jest.fn() },
  payment: { aggregate: jest.fn() },
  referral: { count: jest.fn() },
  refreshToken: { updateMany: jest.fn() },
  vehicle: { update: jest.fn() },
  influencerProfile: { count: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  influencerCommission: { aggregate: jest.fn(), findMany: jest.fn() },
  referralWithdrawal: { aggregate: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  adminAuditLog: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma: any = { ...mockPrismaBase, $transaction: jest.fn((cb: (tx: any) => Promise<unknown>) => cb(mockPrismaBase)) };

const mockEncryption = {
  decrypt: jest.fn((v: string) => v),
  hash: jest.fn((v: string) => `hash:${v}`),
  encrypt: jest.fn((v: string) => `enc:${v}`),
};

const mockInfluencerService = {
  approveInfluencer: jest.fn(),
  suspendOrRejectInfluencer: jest.fn(),
  findProfileByUserId: jest.fn(),
  createApprovedProfileDirectly: jest.fn(),
};

const mockReferralService = {
  deactivateMotoristCodeForInfluencer: jest.fn(),
};

const mockAuditService = {
  log: jest.fn(),
};

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EncryptionService, useValue: mockEncryption },
        { provide: InfluencerService, useValue: mockInfluencerService },
        { provide: ReferralService, useValue: mockReferralService },
        { provide: AdminAuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  describe('getDashboardOverview', () => {
    it('retorna métricas agregadas', async () => {
      mockPrisma.user.count.mockResolvedValue(100);
      mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount_cents: 50000 } });
      mockPrisma.referral.count.mockResolvedValue(10);
      mockPrisma.influencerProfile.count.mockResolvedValue(5);
      mockPrisma.influencerCommission.aggregate.mockResolvedValue({ _sum: { commission_amount: '200.00' } });
      mockPrisma.referralWithdrawal.aggregate.mockResolvedValue({ _count: { id: 3 }, _sum: { amount: '150.00' } });

      const result = await service.getDashboardOverview();

      expect(result.total_users).toBe(100);
      expect(result.revenue_this_month).toBe(500);
      expect(result.active_influencers).toBe(5);
      expect(result.pending_withdrawals.count).toBe(3);
    });
  });

  describe('listUsers', () => {
    it('retorna lista paginada com dados mascarados', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'u1',
          name: 'João',
          cpf: 'encrypted-cpf',
          phone: 'encrypted-phone',
          email: 'encrypted-email',
          plan: 'FREE',
          is_active: true,
          created_at: new Date(),
        },
      ]);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await service.listUsers(undefined, 1, 20);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).not.toHaveProperty('cpf');
      expect(result.data[0]).toHaveProperty('cpf_masked');
      expect(result.total).toBe(1);
    });
  });

  describe('approveInfluencer', () => {
    it('chama o InfluencerService e gera audit log', async () => {
      await service.approveInfluencer('profile-id', 'admin-id');

      expect(mockInfluencerService.approveInfluencer).toHaveBeenCalledWith('profile-id');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'admin-id',
        'approve_influencer',
        'InfluencerProfile',
        'profile-id',
      );
    });
  });

  describe('rejectInfluencer', () => {
    it('chama suspendOrRejectInfluencer com REJECTED e gera audit log', async () => {
      await service.rejectInfluencer('profile-id', 'motivo', 'admin-id');

      expect(mockInfluencerService.suspendOrRejectInfluencer).toHaveBeenCalledWith('profile-id', 'REJECTED');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'admin-id',
        'reject_influencer',
        'InfluencerProfile',
        'profile-id',
        { reason: 'motivo' },
      );
    });
  });

  describe('suspendInfluencer', () => {
    it('chama suspendOrRejectInfluencer com SUSPENDED e gera audit log', async () => {
      await service.suspendInfluencer('profile-id', 'inativo', 'admin-id');

      expect(mockInfluencerService.suspendOrRejectInfluencer).toHaveBeenCalledWith('profile-id', 'SUSPENDED');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'admin-id',
        'suspend_influencer',
        'InfluencerProfile',
        'profile-id',
        { reason: 'inativo' },
      );
    });
  });

  describe('updateInfluencerTier', () => {
    it('atualiza tier e commission_rate e gera audit log', async () => {
      mockPrisma.influencerProfile.findUnique.mockResolvedValue({
        id: 'profile-id',
        tier: InfluencerTier.MICRO,
        commission_rate: '3.00',
      });

      await service.updateInfluencerTier('profile-id', InfluencerTier.LARGE, 'admin-id');

      expect(mockPrisma.influencerProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tier: InfluencerTier.LARGE, commission_rate: 5.0 }),
        }),
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'admin-id',
        'update_influencer_tier',
        'InfluencerProfile',
        'profile-id',
        expect.objectContaining({ updated: { tier: InfluencerTier.LARGE, commission_rate: 5.0 } }),
      );
    });
  });

  describe('markWithdrawalPaid', () => {
    it('atualiza status para PAID e gera audit log', async () => {
      mockPrisma.referralWithdrawal.findUnique.mockResolvedValue({ id: 'w1', amount: '50.00' });

      await service.markWithdrawalPaid('w1', 'admin-id');

      expect(mockPrisma.referralWithdrawal.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: WithdrawalStatus.PAID, processed_at: expect.any(Date) } }),
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'admin-id',
        'mark_withdrawal_paid',
        'ReferralWithdrawal',
        'w1',
        { amount: 50 },
      );
    });
  });

  describe('getAuditLogs', () => {
    it('SUPER_ADMIN pode filtrar por outro admin_id', async () => {
      mockPrisma.adminAuditLog.findMany.mockResolvedValue([]);
      mockPrisma.adminAuditLog.count.mockResolvedValue(0);

      await service.getAuditLogs(
        { id: 'super-id', role: AdminRole.SUPER_ADMIN },
        'other-admin-id',
        undefined,
        1,
        20,
      );

      expect(mockPrisma.adminAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ admin_id: 'other-admin-id' }) }),
      );
    });

    it('SUPPORT_DRIVER ignora filtro externo e só vê o próprio histórico', async () => {
      mockPrisma.adminAuditLog.findMany.mockResolvedValue([]);
      mockPrisma.adminAuditLog.count.mockResolvedValue(0);

      await service.getAuditLogs(
        { id: 'support-id', role: AdminRole.SUPPORT_DRIVER },
        'other-admin-id', // este filtro deve ser ignorado
        undefined,
        1,
        20,
      );

      expect(mockPrisma.adminAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ admin_id: 'support-id' }) }),
      );
    });
  });

  describe('deactivateUser', () => {
    it('desativa usuário, revoga todos os refresh tokens ativos e gera audit log', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', is_active: true });
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });

      await service.deactivateUser('u1', 'admin-id');

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { is_active: false } }),
      );
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { user_id: 'u1', revoked_at: null },
        data: { revoked_at: expect.any(Date) },
      });
      expect(mockAuditService.log).toHaveBeenCalledWith('admin-id', 'deactivate_user', 'User', 'u1');
    });
  });

  describe('grantPremium', () => {
    it('eleva o plano para PRO com plan_granted_by=ADMIN_COURTESY e gera audit log', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', plan: Plan.FREE, plan_granted_by: null });

      const result = await service.grantPremium('u1', 'admin-id');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { plan: Plan.PRO, plan_granted_by: 'ADMIN_COURTESY', plan_expires_at: null },
      });
      expect(mockAuditService.log).toHaveBeenCalledWith('admin-id', 'grant_premium_courtesy', 'User', 'u1', {});
      expect(result.message).toBe('Premium concedido por cortesia');
    });

    it('lança 404 se o usuário não existir', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.grantPremium('inexistente', 'admin-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('revokePremium', () => {
    it('rebaixa o plano para FREE quando plan_granted_by é ADMIN_COURTESY', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', plan: Plan.PRO, plan_granted_by: 'ADMIN_COURTESY' });

      const result = await service.revokePremium('u1', 'admin-id');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { plan: Plan.FREE, plan_granted_by: null },
      });
      expect(mockAuditService.log).toHaveBeenCalledWith('admin-id', 'revoke_premium_courtesy', 'User', 'u1', {});
      expect(result.message).toBe('Premium de cortesia removido');
    });

    it('bloqueia a remoção quando o usuário tem assinatura paga (plan_granted_by=PAYMENT)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', plan: Plan.PRO, plan_granted_by: 'PAYMENT' });

      await expect(service.revokePremium('u1', 'admin-id')).rejects.toThrow(BadRequestException);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('makeInfluencer', () => {
    const dto = {
      channel_name: 'Canal do Test',
      channel_url: 'https://youtube.com/@test',
      followers: 15000,
      niche: 'finanças',
      tier: InfluencerTier.MICRO,
    };

    it('cria o perfil como APPROVED, desativa código de motorista e gera audit log', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      mockInfluencerService.findProfileByUserId.mockResolvedValue(null);
      mockInfluencerService.createApprovedProfileDirectly.mockResolvedValue({ id: 'profile-1', ...dto });
      mockReferralService.deactivateMotoristCodeForInfluencer.mockResolvedValue(undefined);

      const result = await service.makeInfluencer('u1', dto, 'admin-id');

      expect(mockInfluencerService.findProfileByUserId).toHaveBeenCalledWith('u1');
      expect(mockInfluencerService.createApprovedProfileDirectly).toHaveBeenCalledWith('u1', dto);
      expect(mockReferralService.deactivateMotoristCodeForInfluencer).toHaveBeenCalledWith('u1');
      expect(mockAuditService.log).toHaveBeenCalledWith('admin-id', 'make_influencer_direct', 'User', 'u1', { tier: dto.tier });
      expect(result).toMatchObject({ id: 'profile-1' });
    });

    it('bloqueia se o usuário já tem perfil de influencer', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      mockInfluencerService.findProfileByUserId.mockResolvedValue({ id: 'existing-profile' });

      await expect(service.makeInfluencer('u1', dto, 'admin-id')).rejects.toThrow(BadRequestException);
      expect(mockInfluencerService.createApprovedProfileDirectly).not.toHaveBeenCalled();
    });
  });
});

describe('AdminRolesGuard', () => {
  let guard: AdminRolesGuard;

  beforeEach(() => {
    guard = new AdminRolesGuard({
      getAllAndOverride: jest.fn(),
    } as never);
  });

  it('bloqueia SUPPORT_DRIVER em endpoint financeiro', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([AdminRole.SUPER_ADMIN]) };
    guard = new AdminRolesGuard(reflector as never);

    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: 'x', role: AdminRole.SUPPORT_DRIVER } }),
      }),
    } as never;

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('bloqueia SUPPORT_INFLUENCER em PATCH tier', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([AdminRole.SUPER_ADMIN]) };
    guard = new AdminRolesGuard(reflector as never);

    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: 'x', role: AdminRole.SUPPORT_INFLUENCER } }),
      }),
    } as never;

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('permite SUPPORT_DRIVER_INFLUENCER em rota de usuários', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([
        AdminRole.SUPER_ADMIN,
        AdminRole.SUPPORT_DRIVER,
        AdminRole.SUPPORT_DRIVER_INFLUENCER,
      ]),
    };
    guard = new AdminRolesGuard(reflector as never);

    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: 'x', role: AdminRole.SUPPORT_DRIVER_INFLUENCER } }),
      }),
    } as never;

    expect(guard.canActivate(context)).toBe(true);
  });

  it('permite quando não há restrição de roles declarada', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) };
    guard = new AdminRolesGuard(reflector as never);

    const context = { getHandler: jest.fn(), getClass: jest.fn() } as never;

    expect(guard.canActivate(context)).toBe(true);
  });
});
