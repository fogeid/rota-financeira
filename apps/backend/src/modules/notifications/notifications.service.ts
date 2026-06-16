import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FcmService } from '../../common/services/fcm.service';
import { ListNotificationsDto } from './dto/list-notifications.dto';

export interface CreateNotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  /** FCM device token — optional until token management is implemented */
  fcmToken?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fcm: FcmService,
  ) {}

  async create(userId: string, payload: CreateNotificationPayload): Promise<void> {
    const notification = await this.prisma.notification.create({
      data: {
        user_id: userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        // Prisma requires explicit JsonNull for nullable JSON fields
        data: payload.data !== undefined
          ? (payload.data as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        sent_at: new Date(),
      },
    });

    // Send FCM push if we have a device token
    if (payload.fcmToken) {
      const stringData: Record<string, string> = {
        notification_id: notification.id,
        type: payload.type,
      };
      await this.fcm.sendToToken(payload.fcmToken, payload.title, payload.body, stringData);
    }
  }

  async list(userId: string, dto: ListNotificationsDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      user_id: userId,
      ...(dto.unread === true ? { read_at: null } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, total_pages: Math.ceil(total / limit) },
    };
  }

  async markRead(userId: string, notificationId: string): Promise<void> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification) throw new NotFoundException('Notificação não encontrada');
    if (notification.user_id !== userId) throw new ForbiddenException();

    if (!notification.read_at) {
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { read_at: new Date() },
      });
    }
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { user_id: userId, read_at: null },
      data: { read_at: new Date() },
    });
  }
}
