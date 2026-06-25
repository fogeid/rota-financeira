import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AdminRole } from '@prisma/client';

export interface CurrentAdminUser {
  id: string;
  role: AdminRole;
}

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentAdminUser => {
    return ctx.switchToHttp().getRequest<{ user: CurrentAdminUser }>().user;
  },
);
