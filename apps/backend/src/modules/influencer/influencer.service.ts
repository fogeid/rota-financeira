import {
  ConflictException,
  Inject,
  Injectable,
  LoggerService,
  NotFoundException,
} from '@nestjs/common';
import { InfluencerStatus, ReferralType, WithdrawalStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ApplyInfluencerDto } from './dto/apply-influencer.dto';
import { getDefaultCommissionRate, getTierByFollowers } from './influencer.constants';

@Injectable()
export class InfluencerService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('LOGGER') private readonly logger: LoggerService,
  ) {}

  async apply(userId: string, dto: ApplyInfluencerDto) {
    const existing = await this.prisma.influencerProfile.findUnique({ where: { user_id: userId } });
    if (existing) {
      throw new ConflictException('Candidatura já enviada anteriormente');
    }

    const tier = getTierByFollowers(dto.followers);
    const commissionRate = getDefaultCommissionRate(tier);

    await this.prisma.influencerProfile.create({
      data: {
        user_id: userId,
        channel_name: dto.channel_name,
        channel_url: dto.channel_url,
        followers: dto.followers,
        niche: dto.niche,
        tier,
        commission_rate: commissionRate,
        status: InfluencerStatus.PENDING,
      },
    });

    this.logger.log({ message: 'Candidatura de influencer recebida', userId, tier });

    return {
      message: 'Candidatura enviada! Entraremos em contato em até 3 dias úteis.',
      tier,
      commission_rate: commissionRate,
    };
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
            referral_code: {
              where: { type: ReferralType.INFLUENCER },
            },
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
    }

    this.logger.log({ message: 'Comissões mensais de influencers processadas', count: influencers.length });
  }
}
