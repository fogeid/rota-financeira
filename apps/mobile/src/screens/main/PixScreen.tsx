import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, Clipboard, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing, typography, radius } from '../../theme';
import { AlertBox } from '../../components';
import { subscriptionsMock } from '../../services/mocks/subscriptions.mock';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import type { MainStackParamList } from '../../navigation/MainStack';

const PIX_TIMEOUT_SECS = 30 * 60; // 30 minutes
const POLL_INTERVAL_MS = 5000;

type Props = NativeStackScreenProps<MainStackParamList, 'Pix'>;

export function PixScreen({ route, navigation }: Props) {
  const { planId } = route.params;
  const [pixData, setPixData] = useState<{
    qr_code: string;
    qr_code_url: string;
    expires_at: string;
    amount_cents: number;
  } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(PIX_TIMEOUT_SECS);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const load = useSubscriptionStore((s) => s.load);

  useEffect(() => {
    initPix();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function initPix() {
    setLoading(true);
    try {
      const data = await subscriptionsMock.subscribePix('premium_annual');
      setPixData(data);
      setLoading(false);

      const expiresAt = new Date(data.expires_at).getTime();
      timerRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
        setSecondsLeft(remaining);
        if (remaining === 0) clearInterval(timerRef.current!);
      }, 1000);

      // Poll payment status every 5s
      pollRef.current = setInterval(async () => {
        const status = await subscriptionsMock.checkPixStatus();
        if (status === 'PAID') {
          clearInterval(pollRef.current!);
          clearInterval(timerRef.current!);
          await load();
          navigation.replace('PaymentSuccess', { method: 'pix', planId });
        }
      }, POLL_INTERVAL_MS);
    } catch {
      setError('Erro ao gerar o PIX. Tente novamente.');
      setLoading(false);
    }
  }

  function formatCountdown(secs: number): string {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function copyCode() {
    if (pixData?.qr_code) {
      Clipboard.setString(pixData.qr_code);
      Alert.alert('Copiado!', 'Código PIX copiado para a área de transferência.');
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Gerando QR Code PIX...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {error && <AlertBox variant="red" message={error} style={{ marginBottom: 16 }} />}

      <View style={styles.amountRow}>
        <Text style={styles.amountLabel}>Valor a pagar</Text>
        <Text style={styles.amountValue}>
          R$ {((pixData?.amount_cents ?? 0) / 100).toFixed(2).replace('.', ',')}
        </Text>
      </View>

      {/* QR Code */}
      <View style={styles.qrContainer}>
        {pixData?.qr_code_url ? (
          <Image
            source={{ uri: pixData.qr_code_url }}
            style={styles.qrImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.qrPlaceholder}>
            <Ionicons name="qr-code-outline" size={80} color={colors.text3} />
          </View>
        )}
      </View>

      {/* Countdown */}
      <View style={[styles.countdown, secondsLeft < 60 && { borderColor: colors.redBorder, backgroundColor: colors.redBg }]}>
        <Ionicons name="time-outline" size={16} color={secondsLeft < 60 ? colors.red : colors.amber} />
        <Text style={[styles.countdownText, secondsLeft < 60 && { color: colors.red }]}>
          Expira em {formatCountdown(secondsLeft)}
        </Text>
      </View>

      {/* Instructions */}
      <View style={styles.steps}>
        {PIX_STEPS.map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>{i + 1}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>

      {/* Copy button */}
      <TouchableOpacity style={styles.copyBtn} onPress={copyCode} activeOpacity={0.85}>
        <Ionicons name="copy-outline" size={18} color={colors.green} />
        <Text style={styles.copyBtnText}>Copiar código PIX</Text>
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        Aguardando confirmação do pagamento. Esta tela atualiza automaticamente.
      </Text>
    </View>
  );
}

const PIX_STEPS = [
  'Abra o app do seu banco e acesse a área PIX',
  'Escolha "Pagar com QR Code" e escaneie o código acima',
  'Confirme o pagamento de R$ 89,00',
  'Aguarde — sua assinatura será ativada automaticamente',
];

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  loadingText: { ...typography.label, color: colors.text2 },
  amountRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.bg3, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, padding: 14, marginBottom: 20,
  },
  amountLabel: { ...typography.label, color: colors.text2 },
  amountValue: { fontFamily: 'SpaceGrotesk', fontSize: 20, fontWeight: '700', color: colors.green },
  qrContainer: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFFFFF', borderRadius: radius.lg,
    padding: 16, marginBottom: 16, alignSelf: 'center',
  },
  qrImage: { width: 200, height: 200 },
  qrPlaceholder: {
    width: 200, height: 200, alignItems: 'center', justifyContent: 'center',
  },
  countdown: {
    flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center',
    backgroundColor: colors.amberBg, borderWidth: 1, borderColor: colors.amberBorder,
    borderRadius: radius.sm, paddingVertical: 10, marginBottom: 20,
  },
  countdownText: { ...typography.label, color: colors.amber, fontWeight: '600' },
  steps: { gap: 10, marginBottom: 20 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stepNum: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.greenBg, borderWidth: 1, borderColor: colors.greenBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { ...typography.micro, color: colors.green, fontWeight: '700' },
  stepText: { ...typography.small, color: colors.text2, flex: 1 },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.greenBg, borderWidth: 1, borderColor: colors.greenBorder,
    borderRadius: radius.sm, paddingVertical: 14,
  },
  copyBtnText: { ...typography.label, color: colors.green, fontWeight: '600' },
  disclaimer: { ...typography.small, color: colors.text3, textAlign: 'center', marginTop: 14 },
});
