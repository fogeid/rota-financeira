import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, LoggerService } from '@nestjs/common';
import { EarningOrigin, Platform, SyncStatus } from '@prisma/client';
import { Job } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { AlertsService } from '../../alerts/alerts.service';
import { JOB_SYNC_DISPATCH, JOB_SYNC_USER, PLATFORM_SYNC_QUEUE } from '../integrations.constants';
import { IntegrationsService, SYNC_RETRY_DELAYS_MS } from '../integrations.service';

export { JOB_SYNC_DISPATCH, JOB_SYNC_USER };

interface SyncUserJobData {
  userId: string;
  platform: Platform;
}

/**
 * Processa sync de plataformas (Uber, 99, iFood).
 * Deduplicação por (user_id, platform, external_id) — docs/06-BUSINESS-RULES.md seção 12.
 * Retry: 3 tentativas com backoff 5min, 15min, 45min.
 * Após 3 falhas: marca FAILED e envia notificação F73.
 */
@Processor(PLATFORM_SYNC_QUEUE, {
  settings: {
    backoffStrategy: (attemptsMade: number) => {
      // attemptsMade is 1-based here (1 = first retry)
      return SYNC_RETRY_DELAYS_MS[Math.min(attemptsMade - 1, SYNC_RETRY_DELAYS_MS.length - 1)];
    },
  },
})
export class PlatformSyncProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integrationsService: IntegrationsService,
    private readonly alertsService: AlertsService,
    @Inject('LOGGER') private readonly logger: LoggerService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === JOB_SYNC_DISPATCH) {
      await this.dispatchUserSyncs();
    } else if (job.name === JOB_SYNC_USER) {
      await this.syncUserPlatform(job as Job<SyncUserJobData>);
    }
  }

  /** Daily dispatch: queue individual sync jobs for every active credential. */
  private async dispatchUserSyncs(): Promise<void> {
    const credentials = await this.prisma.platformCredential.findMany({
      where: { is_active: true },
      select: { user_id: true, platform: true },
    });

    for (const cred of credentials) {
      await this.integrationsService.enqueueSyncUser(cred.user_id, cred.platform);
    }

    this.logger.log(`Sync dispatch: ${credentials.length} integrações agendadas`);
  }

  /** Sync a single user's platform — decrypt credentials, import trips, deduplicate. */
  private async syncUserPlatform(job: Job<SyncUserJobData>): Promise<void> {
    const { userId, platform } = job.data;
    const userSlug = userId.slice(0, 8);

    const credential = await this.prisma.platformCredential.findUnique({
      where: { user_id_platform: { user_id: userId, platform } },
    });
    if (!credential || !credential.is_active) return;

    await this.prisma.platformCredential.update({
      where: { id: credential.id },
      data: { last_sync_status: SyncStatus.IN_PROGRESS },
    });

    // Decrypt credentials ONLY in memory — docs/05-SECURITY.md seção 7
    // _credentials would be passed to the real platform API client
    const _credentials = this.integrationsService.decryptCredentials(credential.encrypted_data, userId);
    void _credentials; // Used by platform client (stub — API not yet implemented)

    // Import trips from last 7 days — docs/06-BUSINESS-RULES.md seção 12
    const trips = await this.fetchTripsFromPlatform(platform, _credentials, userSlug);

    let imported = 0;
    for (const trip of trips) {
      const created = await this.upsertEarning(userId, platform, trip);
      if (created) imported++;
    }

    await this.prisma.platformCredential.update({
      where: { id: credential.id },
      data: {
        last_sync_status: SyncStatus.SUCCESS,
        last_sync_at: new Date(),
        last_sync_error: null,
        sync_retry_count: 0,
      },
    });

    this.logger.log(`Sync OK: user=${userId} platform=${platform} imported=${imported}`);

    await this.alertsService.notifySyncSuccess(userId);
  }

  /**
   * Stub: simulates platform API response with realistic trip data.
   * Replace with real API client per platform when SDKs are available.
   * Returns 3–8 trips/day for the last 7 days with:
   *   - started_at always in the past (today capped at now.getHours()-1)
   *   - earned_at at local noon to keep the calendar date stable across UTC offsets
   */
  private async fetchTripsFromPlatform(
    platform: Platform,
    _credentials: Record<string, string>,
    userSlug: string,
  ): Promise<PlatformTrip[]> {
    await new Promise((r) => setTimeout(r, 2000 + Math.random() * 1000));

    const now = new Date();
    const trips: PlatformTrip[] = [];

    for (let daysAgo = 0; daysAgo < 7; daysAgo++) {
      // Build day date using local constructor so getDate()/getMonth() reflect local calendar
      const ref = new Date(now);
      ref.setDate(ref.getDate() - daysAgo);
      const dayDate = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());

      // For today, only generate trips that have already happened
      const maxHour = daysAgo === 0 ? now.getHours() - 1 : 22;

      // Skip today if it's before 8am (no valid trip window)
      if (maxHour < 7) continue;

      const tripsPerDay = Math.floor(Math.random() * 5) + 3;
      const usedHours = new Set<number>();

      for (let i = 0; i < tripsPerDay; i++) {
        const range = maxHour - 7;
        if (range < 1) break;

        let hour: number;
        let attempts = 0;
        do {
          hour = 7 + Math.floor(Math.random() * range);
          attempts++;
        } while (usedHours.has(hour) && attempts < 20);
        if (usedHours.has(hour)) continue;
        usedHours.add(hour);

        const minute = Math.floor(Math.random() * 60);
        const startedAt = new Date(dayDate);
        startedAt.setHours(hour, minute, 0, 0);

        // noon keeps the calendar date stable for any UTC offset within ±11h
        const earnedAt = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 12, 0, 0, 0);

        // Build local date string to keep deterministic IDs consistent regardless of UTC offset
        const y = dayDate.getFullYear();
        const m = String(dayDate.getMonth() + 1).padStart(2, '0');
        const d = String(dayDate.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;

        trips.push({
          externalId: `${platform.toLowerCase()}_stub_${userSlug}_${dateStr}_${i}`,
          amount: parseFloat((Math.random() * 42 + 8).toFixed(2)),
          kmDriven: parseFloat((Math.random() * 17 + 3).toFixed(1)),
          startedAt,
          earnedAt,
        });
      }
    }

    return trips;
  }

  /**
   * Inserts a new Earning if no duplicate (user_id, platform, external_id) exists.
   * Constraint defined in schema: @@unique([user_id, platform, external_id]).
   */
  private async upsertEarning(userId: string, platform: Platform, trip: PlatformTrip): Promise<boolean> {
    if (!trip.externalId) return false;

    const exists = await this.prisma.earning.findUnique({
      where: { user_id_platform_external_id: { user_id: userId, platform, external_id: trip.externalId } },
    });
    if (exists) return false;

    await this.prisma.earning.create({
      data: {
        user_id: userId,
        platform,
        amount: trip.amount,
        km_driven: trip.kmDriven ?? null,
        started_at: trip.startedAt,
        earned_at: trip.earnedAt,
        origin: EarningOrigin.AUTO_SYNC,
        external_id: trip.externalId,
      },
    });
    return true;
  }

  /** Called on every failure — handles final failure (all retries exhausted). */
  @OnWorkerEvent('failed')
  async onFailed(job: Job, error: Error): Promise<void> {
    if (job.name !== JOB_SYNC_USER) return;

    const data = job.data as SyncUserJobData;
    const maxAttempts = job.opts.attempts ?? 1;

    if (job.attemptsMade >= maxAttempts) {
      this.logger.warn(
        `Sync FAILED final: user=${data.userId} platform=${data.platform} attempts=${job.attemptsMade}`,
      );
      await this.handleFinalSyncFailure(data, error);
    }
  }

  private async handleFinalSyncFailure(data: SyncUserJobData, error: Error): Promise<void> {
    const { userId, platform } = data;

    await this.prisma.platformCredential.update({
      where: { user_id_platform: { user_id: userId, platform } },
      data: {
        last_sync_status: SyncStatus.FAILED,
        last_sync_error: error.message.slice(0, 255),
        sync_retry_count: 3,
      },
    });

    // F73 — Sync falhou após 3 tentativas
    await this.alertsService.notifySyncFailed(userId, platform);
  }
}

interface PlatformTrip {
  externalId: string;
  amount: number;
  kmDriven?: number;
  startedAt: Date;
  earnedAt: Date;
}
