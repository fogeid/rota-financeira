import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(
    adminId: string,
    action: string,
    targetType: string,
    targetId: string,
    details?: object,
  ): Promise<void> {
    await this.prisma.adminAuditLog.create({
      data: { admin_id: adminId, action, target_type: targetType, target_id: targetId, details },
    });
  }
}
