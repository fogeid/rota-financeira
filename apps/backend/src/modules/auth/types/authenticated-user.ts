import { Plan } from '@prisma/client';

/** Payload do JWT de acesso — docs/05-SECURITY.md seção 4 */
export interface JwtAccessPayload {
  sub: string;
  plan: Plan;
  iat?: number;
  exp?: number;
}

export type AuthenticatedUser = JwtAccessPayload;
