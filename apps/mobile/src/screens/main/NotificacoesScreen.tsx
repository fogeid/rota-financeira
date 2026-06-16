import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import { AlertBox } from '../../components';
import { useNotificationsStore } from '../../store/notificationsStore';
import type { NotificationItem, NotificationType } from '../../types/api';

const NOTIF_ICON: Record<NotificationType, React.ComponentProps<typeof Ionicons>['name']> = {
  GOAL_REACHED: 'trophy-outline',
  BELOW_PACE: 'trending-down-outline',
  INSTALLMENT_RISK: 'warning-outline',
  INSTALLMENT_DUE: 'calendar-outline',
  HIGH_COST_PER_KM: 'speedometer-outline',
  MAINTENANCE_DUE: 'build-outline',
  TAX_DUE: 'document-text-outline',
  SYNC_SUCCESS: 'cloud-done-outline',
  SYNC_FAILED: 'cloud-offline-outline',
  PAYMENT_APPROVED: 'card-outline',
  PAYMENT_FAILED: 'close-circle-outline',
  TRIAL_EXPIRING: 'time-outline',
};

const NOTIF_COLOR: Record<NotificationType, string> = {
  GOAL_REACHED: colors.green,
  BELOW_PACE: colors.amber,
  INSTALLMENT_RISK: colors.red,
  INSTALLMENT_DUE: colors.amber,
  HIGH_COST_PER_KM: colors.amber,
  MAINTENANCE_DUE: colors.blue,
  TAX_DUE: colors.amber,
  SYNC_SUCCESS: colors.green,
  SYNC_FAILED: colors.red,
  PAYMENT_APPROVED: colors.green,
  PAYMENT_FAILED: colors.red,
  TRIAL_EXPIRING: colors.amber,
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (h < 1) return 'Agora mesmo';
  if (h < 24) return `${h}h atrás`;
  return `${d}d atrás`;
}

function NotifItem({ item, onRead }: { item: NotificationItem; onRead: (id: string) => void }) {
  const color = NOTIF_COLOR[item.type];
  return (
    <TouchableOpacity
      style={[styles.item, !item.is_read && styles.itemUnread]}
      onPress={() => !item.is_read && onRead(item.id)}
      activeOpacity={0.8}
    >
      <View style={[styles.iconWrap, { backgroundColor: color + '20' }]}>
        <Ionicons name={NOTIF_ICON[item.type]} size={18} color={color} />
      </View>
      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <Text style={[styles.itemTitle, !item.is_read && { color: colors.text }]}>{item.title}</Text>
          {!item.is_read && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.itemBody} numberOfLines={2}>{item.body}</Text>
        <Text style={styles.itemTime}>{timeAgo(item.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export function NotificacoesScreen() {
  const { items, unreadCount, isLoading, error, load, markRead, markAllRead } = useNotificationsStore();

  useEffect(() => {
    load();
  }, []);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {error ? <AlertBox variant="red" message={error} style={{ marginBottom: spacing.md }} /> : null}

      {/* Header row */}
      <View style={styles.headerRow}>
        <Text style={styles.headerCount}>
          {unreadCount > 0 ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}` : 'Todas lidas'}
        </Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead} activeOpacity={0.75}>
            <Text style={styles.markAllBtn}>Marcar todas como lidas</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.loadingState}>
          <Text style={styles.loadingText}>Carregando notificações...</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="notifications-off-outline" size={40} color={colors.text3} />
          <Text style={styles.emptyTitle}>Nenhuma notificação</Text>
          <Text style={styles.emptySub}>Você está em dia com tudo</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {items.map((item) => (
            <NotifItem key={item.id} item={item} onRead={markRead} />
          ))}
        </View>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingTop: 16 },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  headerCount: { ...typography.label, color: colors.text2 },
  markAllBtn: { ...typography.small, color: colors.green, fontWeight: '600' },
  list: {
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, overflow: 'hidden',
  },
  item: {
    flexDirection: 'row', gap: 12, padding: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  itemUnread: { backgroundColor: 'rgba(46,204,138,0.04)' },
  iconWrap: {
    width: 40, height: 40, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  itemContent: { flex: 1 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  itemTitle: { ...typography.label, color: colors.text2, flex: 1 },
  unreadDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.green },
  itemBody: { ...typography.small, color: colors.text2, lineHeight: 17 },
  itemTime: { ...typography.micro, color: colors.text3, marginTop: 4 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { ...typography.h3, color: colors.text },
  emptySub: { ...typography.label, color: colors.text2 },
  loadingState: { alignItems: 'center', paddingTop: 60 },
  loadingText: { ...typography.label, color: colors.text3 },
});
