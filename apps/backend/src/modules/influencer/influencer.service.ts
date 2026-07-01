import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  LoggerService,
  NotFoundException,
} from '@nestjs/common';
import { InfluencerStatus, InfluencerTier, WithdrawalStatus } from '@prisma/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../common/services/email.service';
import { EncryptionService } from '../../common/services/encryption.service';
import { ReferralService } from '../referral/referral.service';
import { ApplyInfluencerDto } from './dto/apply-influencer.dto';
import { UpdatePixKeyDto } from './dto/update-pix-key.dto';
import { getDefaultCommissionRate, getTierByFollowers } from './influencer.constants';

@Injectable()
export class InfluencerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly encryption: EncryptionService,
    private readonly referralService: ReferralService,
    @Inject('LOGGER') private readonly logger: LoggerService,
  ) {}

  async apply(dto: ApplyInfluencerDto) {
    const existing = await this.prisma.influencerApplication.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Candidatura já enviada para este e-mail');
    }

    const tier = getTierByFollowers(dto.followers);

    await this.prisma.influencerApplication.create({
      data: {
        name: dto.name,
        email: dto.email.toLowerCase(),
        channel_name: dto.channel_name,
        channel_url: dto.channel_url,
        followers: dto.followers,
        niche: dto.niche,
        tier,
      },
    });

    this.logger.log({ message: 'Candidatura de influencer recebida', email: dto.email, tier });

    return { message: 'Solicitação recebida. Retornaremos em até 3 dias úteis.' };
  }

  async getMyProfile(userId: string) {
    const profile = await this.prisma.influencerProfile.findUnique({
      where: { user_id: userId },
      include: {
        commissions: {
          orderBy: { reference_month: 'desc' },
          take: 12,
        },
      },
    });

    if (!profile) throw new NotFoundException('Perfil de influencer não encontrado');

    return {
      status: profile.status,
      tier: profile.tier,
      channel_name: profile.channel_name,
      channel_url: profile.channel_url,
      commission_rate: Number(profile.commission_rate),
      approved_at: profile.approved_at,
      commissions: profile.commissions.map((c) => ({
        reference_month: c.reference_month,
        active_subscribers: c.active_subscribers,
        commission_amount: Number(c.commission_amount),
        status: c.status,
        paid_at: c.paid_at,
      })),
    };
  }

  /** GET /influencer/dashboard — dados completos para o dashboard web */
  async getDashboard(userId: string) {
    const profile = await this.prisma.influencerProfile.findUnique({
      where: { user_id: userId },
      include: {
        user: {
          include: {
            referral_code: true,
          },
        },
        commissions: {
          orderBy: { reference_month: 'desc' },
          take: 12,
        },
      },
    });

    if (!profile) throw new NotFoundException('Perfil de influencer não encontrado');
    if (profile.status !== InfluencerStatus.APPROVED) {
      throw new ForbiddenException('Acesso restrito a influencers aprovados');
    }

    const referralCode = profile.user.referral_code;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const clicks = referralCode?.clicks ?? 0;

    const registrations = referralCode
      ? await this.prisma.referral.count({
          where: {
            referral_code_id: referralCode.id,
            created_at: { gte: monthStart, lt: monthEnd },
          },
        })
      : 0;

    const activeSubscribers = referralCode
      ? await this.prisma.referral.count({
          where: {
            referral_code_id: referralCode.id,
            status: 'CONVERTED',
          },
        })
      : 0;

    const currentCommission = activeSubscribers * Number(profile.commission_rate);

    // Conversão: total de convertidos / cliques × 100
    const totalConversions = referralCode
      ? await this.prisma.referral.count({
          where: { referral_code_id: referralCode.id, status: 'CONVERTED' },
        })
      : 0;
    const conversionRate = clicks > 0 ? Math.round((totalConversions / clicks) * 1000) / 10 : 0;

    // Retenção: assinantes ativos mês atual / assinantes mês anterior × 100
    const prevMonth = profile.commissions[0];
    const subscriberRetention =
      prevMonth && prevMonth.active_subscribers > 0
        ? Math.round((activeSubscribers / prevMonth.active_subscribers) * 1000) / 10
        : null;

    const totalEarned = profile.commissions.reduce(
      (sum, c) => sum + Number(c.commission_amount),
      0,
    );

    const nextPaymentDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      .toISOString()
      .slice(0, 10);

    const slug = referralCode?.slug ?? referralCode?.code ?? '';
    const link = `https://motoristarico.app/i/${slug}`;

    return {
      channel_name: profile.channel_name,
      link,
      tier: profile.tier,
      commission_rate: Number(profile.commission_rate),
      pix_key: profile.pix_key ?? null,
      current_month: {
        clicks,
        registrations,
        active_subscribers: activeSubscribers,
        commission: currentCommission,
      },
      history: profile.commissions.map((c) => ({
        month: c.reference_month.toISOString().slice(0, 7),
        active_subscribers: c.active_subscribers,
        commission: Number(c.commission_amount),
        status: c.status,
        paid_at: c.paid_at,
      })),
      total_earned: totalEarned,
      next_payment_date: nextPaymentDate,
      conversion_rate: conversionRate,
      subscriber_retention: subscriberRetention,
    };
  }

  /** PATCH /influencer/pix-key — cadastra ou atualiza chave PIX do influencer */
  async updatePixKey(userId: string, dto: UpdatePixKeyDto) {
    const profile = await this.prisma.influencerProfile.findUnique({ where: { user_id: userId } });
    if (!profile) throw new NotFoundException('Perfil de influencer não encontrado');
    if (profile.status !== InfluencerStatus.APPROVED) {
      throw new ForbiddenException('Acesso restrito a influencers aprovados');
    }

    await this.prisma.influencerProfile.update({
      where: { user_id: userId },
      data: { pix_key: dto.pix_key },
    });

    return { message: 'Chave PIX atualizada com sucesso', pix_key: dto.pix_key };
  }

  /** PATCH /admin/influencer/:id/approve — aprova influencer e desativa código de motorista. */
  async approveInfluencer(profileId: string): Promise<void> {
    const profile = await this.prisma.influencerProfile.findUnique({ where: { id: profileId } });
    if (!profile) throw new NotFoundException('Perfil de influencer não encontrado');

    await this.prisma.influencerProfile.update({
      where: { id: profileId },
      data: { status: InfluencerStatus.APPROVED, approved_at: new Date() },
    });

    await this.referralService.deactivateMotoristCodeForInfluencer(profile.user_id);
  }

  async findProfileByUserId(userId: string) {
    return this.prisma.influencerProfile.findUnique({ where: { user_id: userId } });
  }

  async createApprovedProfileDirectly(
    userId: string,
    data: { channel_name: string; channel_url: string; followers: number; niche: string; tier: InfluencerTier },
  ) {
    const commissionRate = getDefaultCommissionRate(data.tier);
    return this.prisma.influencerProfile.create({
      data: {
        user_id: userId,
        channel_name: data.channel_name,
        channel_url: data.channel_url,
        followers: data.followers,
        niche: data.niche,
        tier: data.tier,
        commission_rate: commissionRate,
        status: InfluencerStatus.APPROVED,
        approved_at: new Date(),
      },
    });
  }

  /** PATCH /admin/influencer/:id/suspend — suspende ou rejeita influencer e reativa código de motorista. */
  async suspendOrRejectInfluencer(profileId: string, newStatus: 'SUSPENDED' | 'REJECTED'): Promise<void> {
    const profile = await this.prisma.influencerProfile.findUnique({ where: { id: profileId } });
    if (!profile) throw new NotFoundException('Perfil de influencer não encontrado');

    await this.prisma.influencerProfile.update({
      where: { id: profileId },
      data: { status: newStatus as InfluencerStatus },
    });

    await this.referralService.reactivateMotoristCodeAfterInfluencerRemoval(profile.user_id);
  }

  /**
   * Job mensal: calcula comissão de cada influencer aprovado com base nos
   * assinantes ativos cujo referral veio do seu link.
   * Rodado no primeiro dia de cada mês para o mês anterior.
   */
  async processMonthlyCommissions(): Promise<void> {
    const now = new Date();
    const referenceMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth(), 1);

    const influencers = await this.prisma.influencerProfile.findMany({
      where: { status: InfluencerStatus.APPROVED },
      include: {
        user: {
          include: {
            referral_code: true,
          },
        },
      },
    });

    for (const influencer of influencers) {
      const referralCode = influencer.user.referral_code;
      if (!referralCode) continue;

      const activeSubscribers = await this.prisma.referral.count({
        where: {
          referral_code_id: referralCode.id,
          status: { in: ['CONVERTED'] },
          converted_at: { gte: monthStart, lt: monthEnd },
        },
      });

      if (activeSubscribers === 0) continue;

      const commissionAmount =
        activeSubscribers * Number(influencer.commission_rate);

      await this.prisma.influencerCommission.upsert({
        where: {
          influencer_id_reference_month: {
            influencer_id: influencer.id,
            reference_month: referenceMonth,
          },
        },
        create: {
          influencer_id: influencer.id,
          reference_month: referenceMonth,
          active_subscribers: activeSubscribers,
          commission_amount: commissionAmount,
          status: WithdrawalStatus.PENDING,
        },
        update: {
          active_subscribers: activeSubscribers,
          commission_amount: commissionAmount,
        },
      });

      this.logger.log({
        message: 'Comissão mensal calculada para influencer',
        influencerId: influencer.id,
        activeSubscribers,
        commissionAmount,
        referenceMonth,
        pixKey: influencer.pix_key ?? 'não cadastrada',
      });

      // E-mail mensal automático para o influencer
      const userEmail = influencer.user.email
        ? (() => { try { return this.encryption.decrypt(influencer.user.email); } catch { return null; } })()
        : null;

      if (userEmail) {
        const refMonthLabel = format(referenceMonth, 'MMMM yyyy', { locale: ptBR });
        const nextPayDate = format(new Date(now.getFullYear(), now.getMonth() + 1, 1), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
        const html = this.emailService.buildInfluencerMonthlyReportHtml({
          channelName: influencer.channel_name,
          referenceMonth: refMonthLabel,
          activeSubscribers,
          commissionAmount,
          nextPaymentDate: nextPayDate,
        });
        await this.emailService.send({
          to: userEmail,
          subject: `Seu relatório de comissão de ${refMonthLabel} — Motorista Rico`,
          html,
        });
      }
    }

    this.logger.log({ message: 'Comissões mensais de influencers processadas', count: influencers.length });
  }
}
