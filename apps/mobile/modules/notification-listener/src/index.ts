import { NativeModules, DeviceEventEmitter, Platform } from 'react-native';

export interface NotificationEvent {
  title: string;
  body: string;
  packageName: string;
  timestamp: number;
}

const Native = NativeModules.NotificationListener as {
  isPermissionGranted?: () => boolean;
  openPermissionSettings?: () => void;
} | undefined;

export const NotificationListener = {
  isPermissionGranted(): boolean {
    if (Platform.OS !== 'android') return false;
    return Native?.isPermissionGranted?.() ?? false;
  },

  openPermissionSettings(): void {
    if (Platform.OS !== 'android') return;
    Native?.openPermissionSettings?.();
  },

  addListener(callback: (event: NotificationEvent) => void): { remove: () => void } {
    if (Platform.OS !== 'android') return { remove: () => {} };
    const sub = DeviceEventEmitter.addListener('UberNotification', callback);
    return { remove: () => sub.remove() };
  },
};

// Apenas para desenvolvimento — simula uma notificação sem device físico
export function simulateUberNotification(text: string): void {
  if (__DEV__) {
    const event: NotificationEvent = {
      title: 'Corrida concluída',
      body: text,
      packageName: 'com.ubercab.driver',
      timestamp: Date.now(),
    };
    DeviceEventEmitter.emit('UberNotification', event);
  }
}
