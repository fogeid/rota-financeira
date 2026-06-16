import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { OtpPurpose, Plan, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../common/services/encryption.service';
import { maskCpf, maskEmail, maskPhone } from '../../common/utils/mask.util';
import { OtpService } from '../auth/services/otp.service';
import { TokenService } from '../auth/services/token.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangePhoneDto } from './dto/change-phone.dto';
import { ChangePhoneVerifyDto } from './dto/change-phone-verify.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { UpdateBiometryDto } from './dto/update-biometry.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const BCRYPT_COST = 12; // CLAUDE.md regra absoluta — bcrypt custo 12

export interface UserProfileResponse {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  plan: Plan;
  trial_ends_at: Date | null;
  plan_expires_at: Date | null;
  biometry_enabled: boolean;
  created_at: Date;
}

/**
 * Regras de negócio do módulo Users — docs/04-API-SPEC.md (USERS) e docs/05-SECURITY.md.
 * Dados sensíveis (CPF, e-mail, telefone) nunca são retornados sem máscara.
 */
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly otpService: OtpService,
    private readonly tokenService: TokenService,
  ) {}

  private async getUserOrThrow(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return user;
  }

  private toProfileResponse(user: User): UserProfileResponse {
    return {
      id: user.id,
      name: user.name,
      email: maskEmail(this.encryption.decrypt(user.email)),
      phone: maskPhone(this.encryption.decrypt(user.phone)),
      cpf: maskCpf(this.encryption.decrypt(user.cpf)),
      plan: user.plan,
      trial_ends_at: user.trial_ends_at,
      plan_expires_at: user.plan_expires_at,
      biometry_enabled: user.biometry_enabled,
      created_at: user.created_at,
    };
  }

  /** GET /users/me */
  async getProfile(userId: string): Promise<UserProfileResponse> {
    const user = await this.getUserOrThrow(userId);
    return this.toProfileResponse(user);
  }

  /** PATCH /users/me — atualiza nome e/ou e-mail, requer confirmação de senha. */
  async updateProfile(userId: string, dto: UpdateUserDto): Promise<UserProfileResponse> {
    const user = await this.getUserOrThrow(userId);

    const passwordMatches = await bcrypt.compare(dto.current_password, user.password_hash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Senha incorreta');
    }

    const data: { name?: string; email?: string; email_hash?: string } = {};

    if (dto.name !== undefined) {
      data.name = dto.name;
    }

    if (dto.email !== undefined) {
      const emailHash = this.encryption.hash(dto.email);
      if (emailHash !== user.email_hash) {
        const existing = await this.prisma.user.findUnique({ where: { email_hash: emailHash } });
        if (existing) {
          throw new ConflictException('E-mail já em uso');
        }
        data.email = this.encryption.encrypt(dto.email);
        data.email_hash = emailHash;
      }
    }

    const updated = await this.prisma.user.update({ where: { id: user.id }, data });
    return this.toProfileResponse(updated);
  }

  /** POST /users/me/change-password */
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.getUserOrThrow(userId);

    const passwordMatches = await bcrypt.compare(dto.current_password, user.password_hash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Senha incorreta');
    }

    const passwordHash = await bcrypt.hash(dto.new_password, BCRYPT_COST);
    await this.prisma.user.update({ where: { id: user.id }, data: { password_hash: passwordHash } });

    return { message: 'Senha alterada com sucesso' };
  }

  /** POST /users/me/change-phone — envia OTP para o novo número. */
  async changePhone(userId: string, dto: ChangePhoneDto): Promise<{ message: string }> {
    const user = await this.getUserOrThrow(userId);

    const passwordMatches = await bcrypt.compare(dto.current_password, user.password_hash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Senha incorreta');
    }

    const newPhoneHash = this.encryption.hash(dto.new_phone);
    if (newPhoneHash !== user.phone_hash) {
      const existing = await this.prisma.user.findUnique({ where: { phone_hash: newPhoneHash } });
      if (existing) {
        throw new ConflictException('Telefone já está em uso');
      }
    }

    await this.otpService.generateAndSend({
      phone: dto.new_phone,
      phoneHash: newPhoneHash,
      purpose: OtpPurpose.PHONE_CHANGE,
      userId: user.id,
    });

    return { message: 'OTP enviado para o novo número' };
  }

  /** POST /users/me/change-phone/verify — confirma a troca de telefone. */
  async changePhoneVerify(userId: string, dto: ChangePhoneVerifyDto): Promise<{ message: string }> {
    const user = await this.getUserOrThrow(userId);
    const newPhoneHash = this.encryption.hash(dto.new_phone);

    const result = await this.otpService.verify({
      phoneHash: newPhoneHash,
      code: dto.code,
      purpose: OtpPurpose.PHONE_CHANGE,
    });

    if (!result.success) {
      throw new BadRequestException('Código inválido ou expirado');
    }

    if (result.otp.user_id !== user.id) {
      throw new BadRequestException('Código inválido ou expirado');
    }

    await this.otpService.markUsed(result.otp.id);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { phone: this.encryption.encrypt(dto.new_phone), phone_hash: newPhoneHash },
    });

    return { message: 'Telefone atualizado com sucesso' };
  }

  /** PATCH /users/me/biometry */
  async updateBiometry(userId: string, dto: UpdateBiometryDto): Promise<{ biometry_enabled: boolean }> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { biometry_enabled: dto.enabled },
    });

    return { biometry_enabled: user.biometry_enabled };
  }

  /** DELETE /users/me — soft delete + revogação imediata de sessões — docs/05-SECURITY.md seção 8. */
  async deleteAccount(userId: string, dto: DeleteAccountDto): Promise<{ message: string }> {
    const user = await this.getUserOrThrow(userId);

    const passwordMatches = await bcrypt.compare(dto.password, user.password_hash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Senha incorreta');
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { deleted_at: new Date() } });
    await this.tokenService.revokeAllUserTokens(user.id);

    return { message: 'Conta marcada para exclusão. Seus dados serão removidos em até 30 dias.' };
  }
}
