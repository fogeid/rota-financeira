import { BadRequestException, ConflictException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { OtpPurpose, Plan } from '@prisma/client';
import { ReferralService } from '../referral/referral.service';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../common/services/encryption.service';
import { cleanCpf } from '../../common/validators/cpf.validator';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginThrottleService } from './services/login-throttle.service';
import { OTP_EXPIRES_IN_MS, OtpService, OtpVerificationFailureReason } from './services/otp.service';
import { OTP_RESEND_MIN_INTERVAL_SECONDS, OtpResendThrottleService } from './services/otp-resend-throttle.service';
import { PendingRegistrationService } from './services/pending-registration.service';
import { TokenPair, TokenService } from './services/token.service';

const BCRYPT_COST = 12; // CLAUDE.md regra absoluta — bcrypt custo 12

export interface AuthResponse extends TokenPair {
  user: {
    id: string;
    name: string;
    plan: Plan;
    trial_ends_at: Date | null;
  };
}

/**
 * Regras de negócio do módulo Auth — docs/04-API-SPEC.md (AUTH) e docs/05-SECURITY.md.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly tokenService: TokenService,
    private readonly otpService: OtpService,
    private readonly otpResendThrottle: OtpResendThrottleService,
    private readonly loginThrottle: LoginThrottleService,
    private readonly pendingRegistration: PendingRegistrationService,
    private readonly referralService: ReferralService,
  ) {}

  /** POST /auth/register — valida unicidade e envia OTP. Usuário só é criado na confirmação. */
  async register(dto: RegisterDto): Promise<{ message: string; otp_expires_in: number }> {
    const cpfDigits = cleanCpf(dto.cpf);
    const cpfHash = this.encryption.hash(cpfDigits);
    const emailHash = this.encryption.hash(dto.email);
    const phoneHash = this.encryption.hash(dto.phone);

    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ cpf_hash: cpfHash }, { email_hash: emailHash }, { phone_hash: phoneHash }] },
    });

    if (existing) {
      throw new ConflictException('CPF, e-mail ou telefone já cadastrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);

    await this.pendingRegistration.save(phoneHash, {
      name: dto.name,
      cpf: this.encryption.encrypt(cpfDigits),
      cpf_hash: cpfHash,
      email: this.encryption.encrypt(dto.email),
      email_hash: emailHash,
      phone: this.encryption.encrypt(dto.phone),
      phone_hash: phoneHash,
      password_hash: passwordHash,
      referral_code: dto.referral_code,
    });

    await this.otpService.generateAndSend({ phone: dto.phone, phoneHash, purpose: OtpPurpose.REGISTRATION });

    return { message: 'OTP enviado para o telefone informado', otp_expires_in: OTP_EXPIRES_IN_MS / 1000 };
  }

  /** POST /auth/verify-otp — confirma cadastro pendente e emite tokens. */
  async verifyOtp(dto: VerifyOtpDto): Promise<AuthResponse> {
    const phoneHash = this.encryption.hash(dto.phone);

    const result = await this.otpService.verify({ phoneHash, code: dto.code, purpose: dto.purpose });

    if (!result.success) {
      throw this.otpFailureToException(result.reason);
    }

    if (dto.purpose !== OtpPurpose.REGISTRATION) {
      throw new BadRequestException('Propósito de OTP não suportado neste endpoint');
    }

    const pending = await this.pendingRegistration.get(phoneHash);
    if (!pending) {
      throw new BadRequestException('Cadastro expirado. Inicie o cadastro novamente.');
    }

    await this.otpService.markUsed(result.otp.id);

    // Trial padrão: 14 dias para todos os novos usuários (ajustado abaixo se veio de indicação USER)
    const defaultTrialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const user = await this.prisma.user.create({
      data: {
        name: pending.name,
        cpf: pending.cpf,
        cpf_hash: pending.cpf_hash,
        email: pending.email,
        email_hash: pending.email_hash,
        phone: pending.phone,
        phone_hash: pending.phone_hash,
        password_hash: pending.password_hash,
        trial_ends_at: defaultTrialEndsAt,
      },
    });

    // Inicializa saldo e código de indicação do novo usuário
    await this.referralService.initForNewUser(user.id, user.name);

    // Processa indicação recebida (se informou código)
    if (pending.referral_code) {
      const result = await this.referralService.processReferralOnRegister(user.id, pending.referral_code);
      if (result && result.trialDays !== 14) {
        // Código de motorista USER dá apenas 7 dias (default já era 14 para influencer/sem código)
        await this.prisma.user.update({
          where: { id: user.id },
          data: { trial_ends_at: new Date(Date.now() + result.trialDays * 24 * 60 * 60 * 1000) },
        });
      }
    }

    await this.pendingRegistration.delete(phoneHash);

    const tokens = await this.tokenService.issueTokenPair(user.id, user.plan);

    return {
      ...tokens,
      user: { id: user.id, name: user.name, plan: user.plan, trial_ends_at: user.trial_ends_at },
    };
  }

  /** POST /auth/login — login por CPF e senha com bloqueio após 5 tentativas. */
  async login(dto: LoginDto, ipAddress: string, deviceInfo?: string): Promise<AuthResponse> {
    const cpfHash = this.encryption.hash(cleanCpf(dto.cpf));

    const blocked = await this.loginThrottle.getBlockRemainingSeconds(cpfHash);
    if (blocked !== null) {
      throw this.accountLockedException(blocked);
    }

    const user = await this.prisma.user.findUnique({ where: { cpf_hash: cpfHash } });
    const passwordMatches = user ? await bcrypt.compare(dto.password, user.password_hash) : false;

    if (!user || !passwordMatches || user.deleted_at) {
      await this.loginThrottle.recordFailure(cpfHash);
      await this.prisma.loginAttempt.create({
        data: { user_id: user?.id, cpf_hash: cpfHash, ip_address: ipAddress, success: false },
      });

      const blockedNow = await this.loginThrottle.getBlockRemainingSeconds(cpfHash);
      if (blockedNow !== null) {
        throw this.accountLockedException(blockedNow);
      }

      throw new UnauthorizedException('Credenciais inválidas');
    }

    await this.loginThrottle.reset(cpfHash);
    await this.prisma.loginAttempt.create({
      data: { user_id: user.id, cpf_hash: cpfHash, ip_address: ipAddress, success: true },
    });

    const tokens = await this.tokenService.issueTokenPair(user.id, user.plan, deviceInfo);

    return {
      ...tokens,
      user: { id: user.id, name: user.name, plan: user.plan, trial_ends_at: user.trial_ends_at },
    };
  }

  /** POST /auth/refresh — rotaciona o refresh token. */
  async refresh(dto: RefreshDto, deviceInfo?: string): Promise<TokenPair> {
    const tokens = await this.tokenService.rotateRefreshToken(dto.refresh_token, deviceInfo);
    if (!tokens) {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
    return tokens;
  }

  /** POST /auth/logout — revoga o refresh token informado. */
  async logout(dto: LogoutDto): Promise<{ message: string }> {
    await this.tokenService.revokeRefreshToken(dto.refresh_token);
    return { message: 'Logout realizado com sucesso' };
  }

  /** POST /auth/resend-otp — reenvia código respeitando limites de taxa. */
  async resendOtp(dto: ResendOtpDto): Promise<{ message: string; retry_after: number }> {
    const phoneHash = this.encryption.hash(dto.phone);

    const check = await this.otpResendThrottle.check(phoneHash, dto.purpose);
    if (!check.allowed) {
      throw new HttpException(
        { message: 'Limite de reenvios atingido. Tente novamente mais tarde.', retry_after: check.retry_after },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.otpService.generateAndSend({ phone: dto.phone, phoneHash, purpose: dto.purpose });
    await this.otpResendThrottle.record(phoneHash, dto.purpose);

    return { message: 'Novo código enviado', retry_after: OTP_RESEND_MIN_INTERVAL_SECONDS };
  }

  /** POST /auth/forgot-password — sempre responde com sucesso para evitar enumeração. */
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const phoneHash = this.encryption.hash(dto.phone);
    const user = await this.prisma.user.findUnique({ where: { phone_hash: phoneHash } });

    if (user && !user.deleted_at) {
      await this.otpService.generateAndSend({
        phone: dto.phone,
        phoneHash,
        purpose: OtpPurpose.PASSWORD_RESET,
        userId: user.id,
      });
    }

    return { message: 'OTP enviado' };
  }

  /** POST /auth/reset-password — define nova senha e revoga sessões existentes. */
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const phoneHash = this.encryption.hash(dto.phone);

    const result = await this.otpService.verify({ phoneHash, code: dto.code, purpose: OtpPurpose.PASSWORD_RESET });
    if (!result.success) {
      throw this.otpFailureToException(result.reason);
    }

    const user = await this.prisma.user.findUnique({ where: { phone_hash: phoneHash } });
    if (!user) {
      throw new BadRequestException('Código inválido');
    }

    await this.otpService.markUsed(result.otp.id);

    const passwordHash = await bcrypt.hash(dto.new_password, BCRYPT_COST);
    await this.prisma.user.update({ where: { id: user.id }, data: { password_hash: passwordHash } });
    await this.tokenService.revokeAllUserTokens(user.id);

    return { message: 'Senha alterada com sucesso' };
  }

  private accountLockedException(retryAfterSeconds: number): HttpException {
    // 423 Locked não está presente no enum HttpStatus desta versão do Nest — docs/04-API-SPEC.md POST /auth/login
    const LOCKED = 423;
    return new HttpException(
      { message: 'Conta bloqueada por excesso de tentativas', retry_after: retryAfterSeconds },
      LOCKED,
    );
  }

  private otpFailureToException(reason: OtpVerificationFailureReason): HttpException {
    switch (reason) {
      case 'EXPIRED':
        return new BadRequestException('Código expirado');
      case 'TOO_MANY_ATTEMPTS':
        return new HttpException({ message: 'Muitas tentativas. Solicite um novo código.' }, HttpStatus.TOO_MANY_REQUESTS);
      case 'NOT_FOUND':
      case 'INVALID_CODE':
      default:
        return new BadRequestException('Código inválido');
    }
  }
}
