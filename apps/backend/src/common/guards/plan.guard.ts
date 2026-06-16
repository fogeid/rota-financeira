import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_PLAN_KEY } from '../decorators/require-plan.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPlan = this.reflector.getAllAndOverride<string>(REQUIRE_PLAN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPlan) return true;

    const request = context.switchToHttp().getRequest<{ user: { sub: string } }>();
    const userId = request.user?.sub;
    if (!userId) return false;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, trial_ends_at: true },
    });

    if (!user) return false;

    if (user.plan === 'PRO') return true;

    // Trial ativo conta como PRO
    if (user.trial_ends_at && user.trial_ends_at > new Date()) return true;

    throw new ForbiddenException('Recurso disponível apenas no plano PRO');
  }
}
