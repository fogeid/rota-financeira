import { BadRequestException, HttpException, HttpStatus, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.module';
import { PrismaService } from '../../prisma/prisma.service';

const ADMIN_LOGIN_MAX_ATTEMPTS = 5;
const ADMIN_LOGIN_BLOCK_SECONDS = 15 * 60;

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async login(email: string, password: string) {
    const blockedTtl = await this.redis.ttl(`admin:blocked:${email}`);
    if (blockedTtl > 0) {
      throw new HttpException(
        { message: 'Muitas tentativas. Tente novamente em alguns minutos.', retry_after_seconds: blockedTtl },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const admin = await this.prisma.adminUser.findUnique({ where: { email } });

    if (!admin || !admin.is_active || !(await bcrypt.compare(password, admin.password_hash))) {
      await this.recordFailure(email);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    await this.redis.del(`admin:login:attempts:${email}`, `admin:blocked:${email}`);

    await this.prisma.adminUser.update({
      where: { id: admin.id },
      data: { last_login_at: new Date() },
    });

    const secret = this.config.getOrThrow<string>('ADMIN_JWT_SECRET');
    const payload = {
      sub: admin.id,
      role: admin.role,
      type: 'admin',
      must_change_password: admin.must_change_password,
    };

    const access_token = this.jwt.sign(payload, { secret, expiresIn: '15m' });
    const refresh_token = this.jwt.sign(payload, { secret, expiresIn: '30d' });

    return {
      access_token,
      refresh_token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        must_change_password: admin.must_change_password,
      },
    };
  }

  async changePassword(adminId: string, currentPassword: string, newPassword: string) {
    const admin = await this.prisma.adminUser.findUnique({ where: { id: adminId } });
    if (!admin) throw new UnauthorizedException('Admin não encontrado');
    const valid = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!valid) throw new UnauthorizedException('Senha atual incorreta');
    if (newPassword.length < 8) {
      throw new BadRequestException('A nova senha deve ter pelo menos 8 caracteres');
    }
    const password_hash = await bcrypt.hash(newPassword, 12);
    await this.prisma.adminUser.update({
      where: { id: adminId },
      data: { password_hash, must_change_password: false },
    });
    return { ok: true };
  }

  private async recordFailure(email: string): Promise<void> {
    const attemptsKey = `admin:login:attempts:${email}`;
    const attempts = await this.redis.incr(attemptsKey);
    if (attempts === 1) {
      await this.redis.expire(attemptsKey, ADMIN_LOGIN_BLOCK_SECONDS);
    }
    if (attempts >= ADMIN_LOGIN_MAX_ATTEMPTS) {
      await this.redis.set(`admin:blocked:${email}`, '1', 'EX', ADMIN_LOGIN_BLOCK_SECONDS);
    }
  }
}
