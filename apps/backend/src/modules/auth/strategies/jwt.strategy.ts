import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtAccessPayload } from '../types/authenticated-user';

/**
 * Valida o access token (HS256, 15min) enviado no header Authorization: Bearer.
 * Verifica is_active a cada requisição para bloquear imediatamente usuários desativados.
 * docs/05-SECURITY.md seção 4.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtAccessPayload): Promise<JwtAccessPayload> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, is_active: true },
    });

    if (!user || !user.is_active) {
      throw new UnauthorizedException('Conta desativada ou inexistente');
    }

    return payload;
  }
}
