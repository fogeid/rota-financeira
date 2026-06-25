import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AdminRole } from '@prisma/client';
import { CurrentAdminUser } from '../decorators/current-admin.decorator';

interface AdminJwtPayload {
  sub: string;
  role: AdminRole;
  type: string;
}

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow<string>('ADMIN_JWT_SECRET'),
    });
  }

  validate(payload: AdminJwtPayload): CurrentAdminUser {
    if (payload.type !== 'admin') {
      throw new UnauthorizedException('Token inválido para esta área');
    }
    return { id: payload.sub, role: payload.role };
  }
}
