import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PLAN_KEY = 'require_plan';
export const RequirePlan = (plan: 'PRO') => SetMetadata(REQUIRE_PLAN_KEY, plan);
