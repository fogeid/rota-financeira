import { useEffect, useRef } from 'react';
import { NotificationListener } from '../../modules/notification-listener/src';
import { parseUberNotification } from '../utils/uberNotificationParser';
import { earningsService } from '../services/earningsService';
import { useEarningsStore } from '../store/earningsStore';

export function useNotificationListener(): void {
  const refresh = useEarningsStore((s) => s.refresh);
  const processing = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!NotificationListener.isPermissionGranted()) return;

    const subscription = NotificationListener.addListener(async (event) => {
      const earning = parseUberNotification(
        event.title,
        event.body,
        event.packageName,
      );
      if (!earning) return;

      if (processing.current.has(earning.externalId)) return;
      processing.current.add(earning.externalId);

      try {
        await earningsService.create({
          platform: earning.platform,
          amount: earning.amount,
          km_driven: earning.kmDriven ?? undefined,
          started_at: earning.capturedAt.toISOString(),
          earned_at: earning.capturedAt.toISOString(),
          external_id: earning.externalId,
        });

        await refresh();
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        // 409 = duplicata — ignorar silenciosamente
        if (status !== 409) {
          console.error('[NOTIF] Erro ao salvar corrida:', (err as Error).message);
        }
        processing.current.delete(earning.externalId);
      }
    });

    return () => subscription.remove();
  }, [refresh]);
}
