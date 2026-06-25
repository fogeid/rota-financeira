import { Injectable, NotFoundException } from '@nestjs/common';
import { AdminRole, InfluencerStatus, InfluencerTier, Plan, WithdrawalStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../common/services/encryption.service';
import { maskCpf, maskEmail, maskPhone } from '../../common/utils/mask.util';
import { InfluencerService } from '../influencer/influencer.service';
import { getDefaultCommissionRate } from '../influencer/influencer.constants';
import { AdminAuditService } from './admin-audit.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly influencerService: InfluencerService,
    private readonly auditService: AdminAuditService,
  ) {}

  // ── Dashboard ────────────────────────────────────────────────────────────

  async getDashboardOverview() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [
      totalUsers,
      newUsersThisMonth,
      activePremium,
      revenueThisMonth,
      referralConversions,
      activeInfluencers,
      influencerCommissions,
      pendingWithdrawals,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deleted_at: null } }),
      this.prisma.user.count({ where: { deleted_at: null, created_at: { gte: monthStart, lt: monthEnd } } }),
      this.prisma.user.count({ where: { plan: Plan.PRO, is_active: true, deleted_at: null } }),
      this.prisma.payment.aggregate({
        _sum: { amount_cents: true },
        where: { status: 'PAID', paid_at: { gte: monthStart, lt: monthEnd } },
      }),
      this.prisma.referral.count({
        where: { status: 'CONVERTED', converted_at: { gte: monthStart, lt: monthEnd } },
      }),
      this.prisma.influencerProfile.count({ where: { status: InfluencerStatus.APPROVED } }),
      this.prisma.influencerCommission.aggregate({
        _sum: { commission_amount: true },
        where: { reference_month: { gte: monthStart, lt: monthEnd } },
      }),
      this.prisma.referralWithdrawal.aggregate({
        _count: { id: true },
        _sum: { amount: true },
        where: { status: WithdrawalStatus.PENDING },
      }),
    ]);

    const conversionRate = totalUsers > 0 ? Math.round((activePremium / totalUsers) * 1000) / 10 : 0;

    return {
      total_users: totalUsers,
      new_users_this_month: newUsersThisMonth,
      active_premium: activePremium,
      conversion_rate: conversionRate,
      revenue_this_month: (revenueThisMonth._sum.amount_cents ?? 0) / 100,
      referral_conversions_this_month: referralConversions,
      active_influencers: activeInfluencers,
      influencer_commissions_this_month: Number(influencerCommissions._sum.commission_amount ?? 0),
      pending_withdrawals: {
        count: pendingWithdrawals._count.id,
        total_amount: Number(pendingWithdrawals._sum.amount ?? 0),
      },
    };
  }

  // ── Usuários ─────────────────────────────────────────────────────────────

  async listUsers(search: string | undefined, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = { deleted_at: null };

    if (search) {
      const emailHash = this.encryption.hash(search.toLowerCase());
      const cpfHash = this.encryption.hash(search.replace(/\D/g, ''));
      const phoneHash = this.encryption.hash(search);
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email_hash: emailHash },
        { cpf_hash: cpfHash },
        { phone_hash: phoneHash },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          name: true,
          cpf: true,
          phone: true,
          email: true,
          plan: true,
          is_active: true,
          created_at: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((u) => ({
        id: u.id,
        name: u.name,
        cpf_masked: maskCpf(this.encryption.decrypt(u.cpf)),
        phone_masked: maskPhone(this.encryption.decrypt(u.phone)),
        email_masked: maskEmail(this.encryption.decrypt(u.email)),
        plan: u.plan,
        is_active: u.is_active,
        created_at: u.created_at,
      })),
      total,
      page,
    };
  }

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deleted_at: null },
      include: {
        vehicle: true,
        financing: true,
        subscriptions: { orderBy: { created_at: 'desc' }, take: 1 },
      },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [earningsSum, costsSum] = await Promise.all([
      this.prisma.earning.aggregate({
        _sum: { amount: true },
        where: { user_id: userId, earned_at: { gte: monthStart, lt: monthEnd } },
      }),
      this.prisma.cost.aggregate({
        _sum: { amount: true },
        where: { user_id: userId, cost_date: { gte: monthStart, lt: monthEnd } },
      }),
    ]);

    const latestSubscription = user.subscriptions[0] ?? null;

    return {
      id: user.id,
      name: user.name,
      cpf_masked: maskCpf(this.encryption.decrypt(user.cpf)),
      email_masked: maskEmail(this.encryption.decrypt(user.email)),
      phone_masked: maskPhone(this.encryption.decrypt(user.phone)),
      plan: user.plan,
      subscription_status: latestSubscription?.status ?? null,
      is_active: user.is_active,
      created_at: user.created_at,
      trial_ends_at: user.trial_ends_at,
      plan_expires_at: user.plan_expires_at,
      current_month_summary: {
        earnings: Number(earningsSum._sum.amount ?? 0),
        costs: Number(costsSum._sum.amount ?? 0),
      },
    };
  }

  async deactivateUser(userId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId, deleted_at: null } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    await this.prisma.user.update({ where: { id: userId }, data: { is_active: false } });
    await this.prisma.refreshToken.updateMany({
      where: { user_id: userId, revoked_at: null },
      data: { revoked_at: new Date() },
    });
    await this.auditService.log(adminId, 'deactivate_user', 'User', userId);

    return { message: 'Usuário desativado' };
  }

  async reactivateUser(userId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId, deleted_at: null } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    await this.prisma.user.update({ where: { id: userId }, data: { is_active: true } });
    await this.auditService.log(adminId, 'reactivate_user', 'User', userId);

    return { message: 'Usuário reativado' };
  }

  // ── Influencers ───────────────────────────────────────────────────────────

  async listInfluencers(status: InfluencerStatus | undefined) {
    const influencers = await this.prisma.influencerProfile.findMany({
      where: status ? { status } : {},
      orderBy: { created_at: 'desc' },
      include: { user: { select: { name: true } } },
    });

    return {
      data: influencers.map((p) => ({
        id: p.id,
        user_name: p.user.name,
        channel_name: p.channel_name,
        channel_url: p.channel_url,
        followers: p.followers,
        niche: p.niche,
        tier: p.tier,
        status: p.status,
        created_at: p.created_at,
      })),
    };
  }

  async getInfluencerById(profileId: string) {
    const profile = await this.prisma.influencerProfile.findUnique({
      where: { id: profileId },
      include: {
        user: { select: { id: true, name: true, referral_code: true } },
        commissions: { orderBy: { reference_month: 'desc' }, take: 12 },
      },
    });
    if (!profile) throw new NotFoundException('Perfil de influencer não encontrado');

    const referralCode = profile.user.referral_code;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [clicks, registrations, activeSubscribers] = await Promise.all([
      Promise.resolve(referralCode?.clicks ?? 0),
      referralCode
        ? this.prisma.referral.count({
            where: { referral_code_id: referralCode.id, created_at: { gte: monthStart, lt: monthEnd } },
          })
        : Promise.resolve(0),
      referralCode
        ? this.prisma.referral.count({ where: { referral_code_id: referralCode.id, status: 'CONVERTED' } })
        : Promise.resolve(0),
    ]);

    return {
      id: profile.id,
      user_id: profile.user.id,
      user_name: profile.user.name,
      channel_name: profile.channel_name,
      channel_url: profile.channel_url,
      followers: profile.followers,
      niche: profile.niche,
      tier: profile.tier,
      status: profile.status,
      commission_rate: Number(profile.commission_rate),
      pix_key: profile.pix_key,
      approved_at: profile.approved_at,
      created_at: profile.created_at,
      dashboard: {
        current_month: { clicks, registrations, active_subscribers: activeSubscribers },
        history: profile.commissions.map((c) => ({
          month: c.reference_month.toISOString().slice(0, 7),
          active_subscribers: c.active_subscribers,
          commission: Number(c.commission_amount),
          status: c.status,
        })),
      },
    };
  }

  async approveInfluencer(profileId: string, adminId: string) {
    await this.influencerService.approveInfluencer(profileId);
    await this.auditService.log(adminId, 'approve_influencer', 'InfluencerProfile', profileId);
    return { message: 'Influencer aprovado' };
  }

  async rejectInfluencer(profileId: string, reason: string, adminId: string) {
    await this.influencerService.suspendOrRejectInfluencer(profileId, 'REJECTED');
    await this.auditService.log(adminId, 'reject_influencer', 'InfluencerProfile', profileId, { reason });
    return { message: 'Influencer rejeitado' };
  }

  async suspendInfluencer(profileId: string, reason: string, adminId: string) {
    await this.influencerService.suspendOrRejectInfluencer(profileId, 'SUSPENDED');
    await this.auditService.log(adminId, 'suspend_influencer', 'InfluencerProfile', profileId, { reason });
    return { message: 'Influencer suspenso' };
  }

  async updateInfluencerTier(profileId: string, tier: InfluencerTier, adminId: string) {
    const profile = await this.prisma.influencerProfile.findUnique({ where: { id: profileId } });
    if (!profile) throw new NotFoundException('Perfil de influencer não encontrado');

    const commission_rate = getDefaultCommissionRate(tier);
    const previous = { tier: profile.tier, commission_rate: Number(profile.commission_rate) };

    await this.prisma.influencerProfile.update({
      where: { id: profileId },
      data: { tier, commission_rate },
    });

    await this.auditService.log(adminId, 'update_influencer_tier', 'InfluencerProfile', profileId, {
      previous,
      updated: { tier, commission_rate },
    });

    return { message: 'Tier atualizado' };
  }

  // ── Financeiro ────────────────────────────────────────────────────────────

  async listWithdrawals(status: WithdrawalStatus | undefined) {
    const withdrawals = await this.prisma.referralWithdrawal.findMany({
      where: status ? { status } : {},
      orderBy: { created_at: 'desc' },
      include: { user: { select: { name: true } } },
    });

    return {
      data: withdrawals.map((w) => ({
        id: w.id,
        user_name: w.user.name,
        amount: Number(w.amount),
        pix_key: w.pix_key,
        status: w.status,
        created_at: w.created_at,
      })),
    };
  }

  async markWithdrawalPaid(withdrawalId: string, adminId: string) {
    const withdrawal = await this.prisma.referralWithdrawal.findUnique({ where: { id: withdrawalId } });
    if (!withdrawal) throw new NotFoundException('Saque não encontrado');

    await this.prisma.referralWithdrawal.update({
      where: { id: withdrawalId },
      data: { status: WithdrawalStatus.PAID, processed_at: new Date() },
    });

    await this.auditService.log(adminId, 'mark_withdrawal_paid', 'ReferralWithdrawal', withdrawalId, {
      amount: Number(withdrawal.amount),
    });

    return { message: 'Saque marcado como pago' };
  }

  async listCommissions(month: string | undefined) {
    let referenceMonth: { gte: Date; lt: Date } | undefined;
    if (month) {
      const [year, mon] = month.split('-').map(Number);
      const start = new Date(year, mon - 1, 1);
      const end = new Date(year, mon, 1);
      referenceMonth = { gte: start, lt: end };
    }

    const commissions = await this.prisma.influencerCommission.findMany({
      where: referenceMonth ? { reference_month: referenceMonth } : {},
      orderBy: { reference_month: 'desc' },
      include: { influencer: { select: { channel_name: true } } },
    });

    return {
      data: commissions.map((c) => ({
        id: c.id,
        influencer_name: c.influencer.channel_name,
        reference_month: c.reference_month.toISOString().slice(0, 7),
        active_subscribers: c.active_subscribers,
        commission_amount: Number(c.commission_amount),
        status: c.status,
        paid_at: c.paid_at,
      })),
    };
  }

  // ── Auditoria ─────────────────────────────────────────────────────────────

  async getAuditLogs(
    currentAdmin: { id: string; role: AdminRole },
    adminIdFilter: string | undefined,
    action: string | undefined,
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};

    if (currentAdmin.role !== AdminRole.SUPER_ADMIN) {
      // Suporte vê apenas o próprio histórico, ignorando filtro passado na query
      where.admin_id = currentAdmin.id;
    } else if (adminIdFilter) {
      where.admin_id = adminIdFilter;
    }

    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      this.prisma.adminAuditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: { admin: { select: { name: true } } },
      }),
      this.prisma.adminAuditLog.count({ where }),
    ]);

    return {
      data: logs.map((l) => ({
        id: l.id,
        admin_name: l.admin.name,
        action: l.action,
        target_type: l.target_type,
        target_id: l.target_id,
        details: l.details,
        created_at: l.created_at,
      })),
      total,
      page,
    };
  }
}
