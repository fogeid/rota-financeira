import { Inject, Injectable, LoggerService, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, initializeApp, cert } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';

/**
 * Firebase Cloud Messaging — push notifications.
 * Gracefully degrades (logs only) when FIREBASE_* vars are absent.
 * FCM token management requires mobile app to POST the device token; until that
 * endpoint exists push is stored as Notification records in the DB only.
 */
@Injectable()
export class FcmService implements OnModuleInit {
  private messaging?: Messaging;

  constructor(
    private readonly config: ConfigService,
    @Inject('LOGGER') private readonly logger: LoggerService,
  ) {}

  onModuleInit(): void {
    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');
    const privateKey = this.config.get<string>('FIREBASE_PRIVATE_KEY');
    const clientEmail = this.config.get<string>('FIREBASE_CLIENT_EMAIL');

    if (!projectId || !privateKey || !clientEmail) {
      this.logger.warn('FcmService: FIREBASE_* vars ausentes — push notifications desabilitadas');
      return;
    }

    try {
      const app: App = initializeApp(
        {
          credential: cert({
            projectId,
            privateKey: privateKey.replace(/\\n/g, '\n'),
            clientEmail,
          }),
        },
        'motorista-rico',
      );
      this.messaging = getMessaging(app);
      this.logger.log('FcmService: Firebase Admin SDK inicializado');
    } catch (err) {
      this.logger.warn(`FcmService: falha ao inicializar Firebase — ${String(err)}`);
    }
  }

  /**
   * Envia push para um device token específico.
   * Erros de FCM são não-fatais — notificação já foi salva no banco.
   */
  async sendToToken(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (!this.messaging) {
      this.logger.log(`FCM (stub): title="${title}" body="${body}"`);
      return;
    }

    try {
      await this.messaging.send({ token, notification: { title, body }, data });
    } catch (err) {
      // FCM errors are non-fatal: token may be stale, device offline, etc.
      this.logger.warn(`FCM send failed: ${String(err)}`);
    }
  }
}
