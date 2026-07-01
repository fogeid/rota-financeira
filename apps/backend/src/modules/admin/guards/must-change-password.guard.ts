import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { CurrentAdminUser } from '../decorators/current-admin.decorator';

@Injectable()
export class MustChangePasswordGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request & { user?: CurrentAdminUser }>();
    if (req.user?.must_change_password && !req.url.includes('/auth/change-password')) {
      throw new ForbiddenException('Você precisa trocar sua senha antes de continuar.');
    }
    return true;
  }
}
