import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Platform, SyncStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { Queue } from 'bullmq';
import { EncryptionService } from '../../common/services/encryption.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConnectIntegrationDto } from './dto/connect-integration.dto';
import { JOB_SYNC_USER, PLATFORM_SYNC_QUEUE } from './integrations.constants';

// Retry delays: 5min, 15min, 45min (docs/06-BUSINESS-RULES.md seção 12)
export const SYNC_RETRY_DELAYS_MS = [5 * 60_000, 15 * 60_000, 45 * 60_000];

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    @InjectQueue(PLATFORM_SYNC_QUEUE) private readonly syncQueue: Queue,
  ) {}

  async connect(userId: string, dto: ConnectIntegrationDto) {
    const existing = await this.prisma.platformCredential.findUnique({
      where: { user_id_platform: { user_id: userId, platform: dto.platform } },
    });
    if (existing) {
      throw new ConflictException(`Plataforma ${dto.platform} já conectada`);
    }

    // Encrypt credentials with user-derived key (HKDF) — docs/05-SECURITY.md seção 3
    const encryptedData = this.encryptCredentials(dto.credentials ?? {}, userId);

    await this.prisma.platformCredential.create({
      data: {
        user_id: userId,
        platform: dto.platform,
        encrypted_data: encryptedData,
        last_sync_status: SyncStatus.NEVER,
        is_active: true,
      },
    });

    // Trigger initial sync — non-fatal if queue (Redis) is unavailable
    try {
      await this.enqueueSyncUser(userId, dto.platform);
    } catch {
      // Credential saved; sync can be triggered manually when queue is available
    }

    return { message: 'Plataforma conectada. Sync iniciado.' };
  }

  async getStatus(userId: string) {
    const credentials = await this.prisma.platformCredential.findMany({
      where: { user_id: userId, is_active: true },
      select: {
        platform: true,
        is_active: true,
        last_sync_at: true,
        last_sync_status: true,
        last_sync_error: true,
      },
    });
    return { integrations: credentials };
  }

  async triggerManualSync(userId: string, platform: Platform) {
    const credential = await this.prisma.platformCredential.findUnique({
      where: { user_id_platform: { user_id: userId, platform } },
    });
    if (!credential || !credential.is_active) {
      throw new NotFoundException(`Plataforma ${platform} não está conectada`);
    }
    if (credential.last_sync_status === SyncStatus.IN_PROGRESS) {
      throw new HttpException('Sync já em andamento para esta plataforma', HttpStatus.TOO_MANY_REQUESTS);
    }

    try {
      await this.enqueueSyncUser(userId, platform);
    } catch {
      throw new ServiceUnavailableException('Fila de sync indisponível. Verifique se o Redis está rodando.');
    }
    return { message: 'Sync iniciado. Você será notificado quando concluir.' };
  }

  async disconnect(userId: string, platform: Platform) {
    const credential = await this.prisma.platformCredential.findUnique({
      where: { user_id_platform: { user_id: userId, platform } },
    });
    if (!credential) {
      throw new NotFoundException(`Plataforma ${platform} não está conectada`);
    }

    // Remove credentials immediately — docs/05-SECURITY.md seção 7
    await this.prisma.platformCredential.delete({
      where: { user_id_platform: { user_id: userId, platform } },
    });

    return { message: 'Plataforma desconectada e credenciais removidas' };
  }

  /**
   * Enqueue an individual user sync job with custom retry backoff.
   */
  async enqueueSyncUser(userId: string, platform: Platform): Promise<void> {
    await this.syncQueue.add(
      JOB_SYNC_USER,
      { userId, platform },
      {
        attempts: 4, // 1 initial + 3 retries
        backoff: { type: 'custom' },
        removeOnComplete: true,
        removeOnFail: false,
        jobId: `sync-user_${userId}_${platform}_${Date.now()}`,
      },
    );
  }

  // ─── Encryption helpers (docs/05-SECURITY.md seção 3) ────────────────────────

  encryptCredentials(credentials: object, userId: string): string {
    const key = this.encryption.deriveUserKey(userId);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const data = JSON.stringify(credentials);
    const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
  }

  decryptCredentials(encryptedData: string, userId: string): Record<string, string> {
    const key = this.encryption.deriveUserKey(userId);
    const buf = Buffer.from(encryptedData, 'base64');
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const ciphertext = buf.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    return JSON.parse(decrypted) as Record<string, string>;
  }
}
