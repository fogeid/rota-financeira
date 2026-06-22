import {
  BadRequestException,
  Inject,
  Injectable,
  LoggerService,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType, ReferralStatus, ReferralType, WithdrawalStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  MIN_WITHDRAWAL_AMOUNT,
  calculateCashback,
  getReferralLevel,
  getNextLevelAt,
} from './referral.constants';
import { WithdrawDto } from './dto/withdraw.dto';

function maskName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

@Injectable()
export class ReferralService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    @Inject('LOGGER') private readonly logger: LoggerService,
  ) {}

  /** Gera código único baseado no nome do usuário + sufixo numérico aleatório. */
  async generateUniqueCode(name: string): Promise<string> {
    const prefix = name
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 6)
      .padEnd(6, 'X');

    for (let attempt = 0; attempt < 10; attempt++) {
      const suffix = String(Math.floor(Math.random() * 90) + 10);
      const code = `${prefix}${suffix}`;
      const existing = await this.prisma.referralCode.findUnique({ where: { code } });
      if (!existing) return code;
    }

    // Fallback: random 8-char alphanumeric
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let fallback = '';
    for (let i = 0; i < 8; i++) fallback += chars[Math.floor(Math.random() * chars.length)];
    return fallback;
  }

  /** Inicializa ReferralCode + ReferralBalance para novo usuário (chamado no cadastro). */
  async initForNewUser(userId: string, name: string): Promise<void> {
    const code = await this.generateUniqueCode(name);
    await this.prisma.$transaction([
      this.prisma.referralCode.create({ data: { user_id: userId, code } }),
      this.prisma.referralBalance.create({ data: { user_id: userId } }),
    ]);
  }

  /**
   * Processa indicação quando novo usuário se cadastra com referral_code.
   * Retorna o número de dias de trial a aplicar (7 para USER, 14 para INFLUENCER).
   * Retorna null se código inválido (sem efeito).
   */
  async processReferralOnRegister(
    newUserId: string,
    referralCode: string,
  ): Promise<{ trialDays: number } | null> {
    const code = await this.prisma.referralCode.findUnique({ where: { code: referralCode } });

    if (!code) return null;
    if (code.user_id === newUserId) return null; // invariante: auto-indicação proibida

    await this.prisma.$transaction([
      this.prisma.referral.create({
        data: {
          referral_code_id: code.id,
          referred_user_id: newUserId,
          status: ReferralStatus.REGISTERED,
        },
      }),
      this.prisma.referralCode.update({
        where: { id: code.id },
        data: { clicks: { increment: 1 } },
      }),
    ]);

    return { trialDays: code.type === ReferralType.USER ? 7 : 14 };
  }

  /**
   * Chamado pelo webhook payment.paid quando um usuário converte para Premium.
   * Invariantes: só processa se assinante veio por referral USER (não INFLUENCER,
   * cuja comissão é calculada mensalmente). docs/06-BUSINESS-RULES.md seção 16.2.
   */
  async handlePaymentConversion(subscriberUserId: string): Promise<void> {
    const referral = await this.prisma.referral.findUnique({
      where: { referred_user_id: subscriberUserId },
      include: { referral_code: true },
    });

    if (!referral) return;
    if (referral.status === ReferralStatus.CONVERTED) return;

    const now = new Date();

    if (referral.referral_code.type === ReferralType.INFLUENCER) {
      // Para influencer: apenas atualiza status — comissão calculada no job mensal
      await this.prisma.referral.update({
        where: { id: referral.id },
        data: { status: ReferralStatus.CONVERTED, converted_at: now },
      });
      return;
    }

    // Canal motorista: calcular cashback pelo nível APÓS esta conversão
    const balance = await this.prisma.referralBalance.findUnique({
      where: { user_id: referral.referral_code.user_id },
    });
    const newConversions = (balance?.conversions ?? 0) + 1;
    const cashbackAmount = calculateCashback(newConversions);

    await this.prisma.$transaction([
      this.prisma.referral.update({
        where: { id: referral.id },
        data: {
          status: ReferralStatus.CONVERTED,
          converted_at: now,
          cashback_amount: cashbackAmount,
        },
      }),
      this.prisma.referralBalance.update({
        where: { user_id: referral.referral_code.user_id },
        data: {
          pending: { increment: cashbackAmount },
          total_earned: { increment: cashbackAmount },
          conversions: { increment: 1 },
        },
      }),
    ]);

    await this.notifications.create(referral.referral_code.user_id, {
      type: NotificationType.CASHBACK_PENDING,
      title: 'Nova conversão!',
      body: `R$ ${cashbackAmount.toFixed(2).replace('.', ',')} de cashback ficará disponível em 30 dias.`,
    });

    this.logger.log({
      message: 'Cashback pendente creditado',
      referrerUserId: referral.referral_code.user_id,
      cashbackAmount,
      newConversions,
    });
  }

  /** Job D+30: move pending → available para todas as conversões com 30+ dias. */
  async releaseD30Cashback(): Promise<void> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const pendingReferrals = await this.prisma.referral.findMany({
      where: {
        status: ReferralStatus.CONVERTED,
        cashback_paid_at: null,
        converted_at: { lte: thirtyDaysAgo },
        cashback_amount: { not: null },
        referral_code: { type: ReferralType.USER },
      },
      include: { referral_code: { select: { user_id: true } } },
    });

    for (const referral of pendingReferrals) {
      const amount = Number(referral.cashback_amount!);
      const referrerUserId = referral.referral_code.user_id;

      await this.prisma.$transaction([
        this.prisma.referralBalance.update({
          where: { user_id: referrerUserId },
          data: {
            pending: { decrement: amount },
            available: { increment: amount },
          },
        }),
        this.prisma.referral.update({
          where: { id: referral.id },
          data: { cashback_paid_at: new Date() },
        }),
      ]);

      await this.notifications.create(referrerUserId, {
        type: NotificationType.CASHBACK_AVAILABLE,
        title: 'Cashback disponível!',
        body: `R$ ${amount.toFixed(2).replace('.', ',')} disponível para saque via PIX.`,
      });
    }

    if (pendingReferrals.length > 0) {
      this.logger.log({ message: 'Cashback D+30 liberado', count: pendingReferrals.length });
    }
  }

  async getMyReferral(userId: string) {
    const [code, balance, referrals] = await Promise.all([
      this.prisma.referralCode.findUnique({ where: { user_id: userId } }),
      this.prisma.referralBalance.findUnique({ where: { user_id: userId } }),
      this.prisma.referral.findMany({
        where: { referral_code: { user_id: userId } },
        include: { referred_user: { select: { name: true } } },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    if (!code) throw new NotFoundException('Código de indicação não encontrado');

    const conversions = balance?.conversions ?? 0;

    return {
      code: code.code,
      link: `https://rotafinanceira.app/i/${code.code}`,
      level: getReferralLevel(conversions),
      conversions,
      next_level_at: getNextLevelAt(conversions),
      balance: {
        available: Number(balance?.available ?? 0),
        pending: Number(balance?.pending ?? 0),
        total_earned: Number(balance?.total_earned ?? 0),
        total_withdrawn: Number(balance?.total_withdrawn ?? 0),
      },
      referrals: referrals.map((r) => ({
        name: maskName(r.referred_user.name),
        status: r.status,
        converted_at: r.converted_at,
      })),
    };
  }

  async validateCode(code: string) {
    const referralCode = await this.prisma.referralCode.findUnique({
      where: { code },
      include: { user: { select: { name: true } } },
    });

    if (!referralCode) {
      return { valid: false };
    }

    return {
      valid: true,
      referrer_name: referralCode.user.name.split(' ')[0],
    };
  }

  async withdraw(userId: string, dto: WithdrawDto) {
    const balance = await this.prisma.referralBalance.findUnique({ where: { user_id: userId } });
    const available = Number(balance?.available ?? 0);

    if (available < MIN_WITHDRAWAL_AMOUNT) {
      throw new BadRequestException('Saldo insuficiente. Mínimo R$ 20,00');
    }
    if (dto.amount > available) {
      throw new BadRequestException('Valor solicitado maior que o saldo disponível');
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthCount = await this.prisma.referralWithdrawal.count({
      where: { user_id: userId, created_at: { gte: startOfMonth } },
    });

    const withdrawal = await this.prisma.$transaction(async (tx) => {
      const w = await tx.referralWithdrawal.create({
        data: { user_id: userId, amount: dto.amount, pix_key: dto.pix_key, status: WithdrawalStatus.PENDING },
      });
      await tx.referralBalance.update({
        where: { user_id: userId },
        data: {
          available: { decrement: dto.amount },
          total_withdrawn: { increment: dto.amount },
        },
      });
      return w;
    });

    if (monthCount >= 10) {
      this.logger.warn({ message: 'Saque requer revisão manual', userId, monthlyCount: monthCount + 1 });
    }

    return {
      message: 'Saque solicitado. PIX será enviado em até 1 dia útil.',
      withdrawal_id: withdrawal.id,
    };
  }

  async getWithdrawals(userId: string) {
    const withdrawals = await this.prisma.referralWithdrawal.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });

    return {
      withdrawals: withdrawals.map((w) => ({
        id: w.id,
        amount: Number(w.amount),
        status: w.status,
        pix_key: w.pix_key,
        created_at: w.created_at,
        processed_at: w.processed_at,
      })),
    };
  }
}
