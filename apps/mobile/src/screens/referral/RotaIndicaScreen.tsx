import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Clipboard,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useReferralStore } from '../../store/referralStore';
import { BottomSheet } from '../../components/BottomSheet';
import { Badge } from '../../components/Badge';
import { ProgressBar } from '../../components/ProgressBar';
import { SkeletonBox } from '../../components/Skeleton';
import { AlertBox } from '../../components/AlertBox';
import { colors, spacing, typography, radius } from '../../theme';
import { formatBRL, toNumber } from '../../utils/numbers';

const MIN_WITHDRAWAL = 20;

const LEVEL_CONFIG = {
  INICIANTE: { variant: 'green' as const, label: 'Iniciante', cashback: 'R$ 5,00', max: 15 },
  PARCEIRO:  { variant: 'blue'  as const, label: 'Parceiro',  cashback: 'R$ 6,00', max: 30 },
  EMBAIXADOR:{ variant: 'amber' as const, label: 'Embaixador',cashback: 'R$ 7,00', max: null },
};

const STATUS_CONFIG = {
  REGISTERED: { variant: 'blue'  as const, label: 'Cadastrado' },
  CONVERTED:  { variant: 'green' as const, label: 'Premium ✓' },
  INACTIVE:   { variant: 'red'   as const, label: 'Inativo' },
};

// ─── Withdrawal BottomSheet ────────────────────────────────────────────────
function WithdrawSheet({
  visible,
  onClose,
  available,
}: {
  visible: boolean;
  onClose: () => void;
  available: number;
}) {
  const { withdraw, isWithdrawing, fetchReferral } = useReferralStore();
  const [step, setStep] = useState<'form' | 'confirm' | 'success'>('form');
  const [pixKey, setPixKey] = useState('');
  const [amount, setAmount] = useState(String(available.toFixed(2).replace('.', ',')));
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setStep('form');
    setPixKey('');
    setAmount(String(available.toFixed(2).replace('.', ',')));
    setError(null);
    onClose();
  }

  function parsedAmount(): number {
    return toNumber(amount.replace(',', '.'));
  }

  function handleConfirm() {
    const val = parsedAmount();
    if (!pixKey.trim()) { setError('Informe a chave PIX.'); return; }
    if (val < MIN_WITHDRAWAL) { setError(`Valor mínimo é ${formatBRL(MIN_WITHDRAWAL)}.`); return; }
    if (val > available) { setError('Valor maior que o saldo disponível.'); return; }
    setError(null);
    setStep('confirm');
  }

  async function handleSubmit() {
    setError(null);
    try {
      await withdraw(pixKey.trim(), parsedAmount());
      await fetchReferral();
      setStep('success');
    } catch (err: unknown) {
      setError((err as Error).message);
      setStep('form');
    }
  }

  return (
    <BottomSheet visible={visible} onClose={handleClose}>
      {step === 'success' ? (
        <View style={s.successContainer}>
          <View style={s.successIcon}><Ionicons name="checkmark-circle" size={48} color={colors.green} /></View>
          <Text style={s.successTitle}>Saque solicitado!</Text>
          <Text style={s.successSub}>PIX será enviado em até 1 dia útil.</Text>
          <TouchableOpacity style={s.btn} onPress={handleClose} activeOpacity={0.85}>
            <Text style={s.btnText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      ) : step === 'confirm' ? (
        <View>
          <Text style={s.sheetTitle}>Confirmar saque</Text>
          {error ? <AlertBox variant="red" message={error} style={{ marginBottom: 12 }} /> : null}
          <View style={s.confirmRow}>
            <Text style={s.confirmLabel}>Valor</Text>
            <Text style={s.confirmValue}>{formatBRL(parsedAmount())}</Text>
          </View>
          <View style={[s.confirmRow, { marginBottom: 24 }]}>
            <Text style={s.confirmLabel}>Chave PIX</Text>
            <Text style={s.confirmValue}>{pixKey}</Text>
          </View>
          <TouchableOpacity
            style={[s.btn, isWithdrawing && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={isWithdrawing}
            activeOpacity={0.85}
          >
            {isWithdrawing
              ? <ActivityIndicator color={colors.bg} size="small" />
              : <Text style={s.btnText}>Confirmar saque</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={s.cancelBtn} onPress={() => setStep('form')}>
            <Text style={s.cancelText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <Text style={s.sheetTitle}>Sacar via PIX</Text>
          {error ? <AlertBox variant="red" message={error} style={{ marginBottom: 12 }} /> : null}
          <Text style={s.fieldLabel}>Saldo disponível</Text>
          <Text style={[s.availableAmount, { marginBottom: 20 }]}>{formatBRL(available)}</Text>
          <Text style={s.fieldLabel}>Chave PIX (telefone, CPF, e-mail ou chave aleatória)</Text>
          <TextInput
            style={s.input}
            value={pixKey}
            onChangeText={setPixKey}
            placeholder="Sua chave PIX"
            placeholderTextColor={colors.text3}
            autoCapitalize="none"
          />
          <Text style={s.fieldLabel}>Valor (mín. R$ 20,00)</Text>
          <TextInput
            style={s.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="20,00"
            placeholderTextColor={colors.text3}
          />
          <TouchableOpacity style={s.btn} onPress={handleConfirm} activeOpacity={0.85}>
            <Text style={s.btnText}>Continuar</Text>
          </TouchableOpacity>
        </View>
      )}
    </BottomSheet>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────
export function RotaIndicaScreen() {
  const { data, isLoading, error, fetchReferral } = useReferralStore();
  const [withdrawVisible, setWithdrawVisible] = useState(false);

  useEffect(() => {
    fetchReferral();
  }, []);

  function handleCopyCode() {
    if (!data?.code) return;
    Clipboard.setString(data.code);
  }

  function handleShareWhatsApp() {
    if (!data?.code) return;
    const msg = encodeURIComponent(
      `Ei! Tô usando o Motorista Rico pra controlar meus ganhos como motorista.\n` +
      `Entra pelo meu link e ganha 7 dias grátis do Premium:\n` +
      `${process.env.EXPO_PUBLIC_APP_URL ?? 'https://motoristarico.app'}/i/${data.code}`
    );
    Linking.openURL(`whatsapp://send?text=${msg}`).catch(() => {
      Linking.openURL(`https://wa.me/?text=${msg}`);
    });
  }

  if (isLoading) {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <SkeletonBox width="100%" height={120} style={{ borderRadius: radius.lg, marginBottom: 16 }} />
        <SkeletonBox width="100%" height={100} style={{ borderRadius: radius.lg, marginBottom: 16 }} />
        <SkeletonBox width="100%" height={140} style={{ borderRadius: radius.lg, marginBottom: 16 }} />
      </ScrollView>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.centered}>
        <AlertBox variant="red" message={error ?? 'Erro ao carregar dados.'} />
        <TouchableOpacity style={[s.btn, { marginTop: 16 }]} onPress={fetchReferral} activeOpacity={0.85}>
          <Text style={s.btnText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const levelCfg = LEVEL_CONFIG[data.level];
  const progressPercent = data.next_level_at
    ? (data.conversions / data.next_level_at) * 100
    : 100;
  const canWithdraw = data.balance.available >= MIN_WITHDRAWAL || data.conversions >= 4;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* ── HERO ── */}
      <View style={styles.heroCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Ionicons name="gift-outline" size={18} color={colors.green} />
          <Text style={styles.heroLabel}>Saldo disponível</Text>
        </View>
        <Text style={styles.heroAmount}>{formatBRL(data.balance.available)}</Text>
        <Text style={styles.heroHint}>
          Cada indicação que assina o Premium adiciona o valor do seu nível atual ao seu saldo, na hora.
        </Text>
        <TouchableOpacity
          style={[styles.saqueBtn, !canWithdraw && styles.saqueBtnDisabled]}
          onPress={() => canWithdraw && setWithdrawVisible(true)}
          activeOpacity={canWithdraw ? 0.85 : 1}
        >
          <Ionicons name="cash-outline" size={16} color={canWithdraw ? colors.bg : colors.text3} />
          <Text style={[styles.saqueBtnText, !canWithdraw && { color: colors.text3 }]}>
            {canWithdraw ? 'Sacar via PIX' : 'Saque a partir de R$ 20,00 ou 4 indicações'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── CÓDIGO ── */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Seu código de indicação</Text>
        {data.is_active === false && (
          <AlertBox
            variant="blue"
            message="Como você agora é um parceiro influencer, use seu link exclusivo no Portal do Influencer para continuar ganhando por indicações (com comissão recorrente)."
            style={{ marginTop: 8, marginBottom: 8 }}
          />
        )}
        <Text style={styles.codeText}>{data.code}</Text>
        <Text style={styles.linkText} numberOfLines={1}>{data.link}</Text>
        {data.is_active !== false && (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <TouchableOpacity style={styles.codeBtn} onPress={handleCopyCode} activeOpacity={0.8}>
              <Ionicons name="copy-outline" size={15} color={colors.text} />
              <Text style={styles.codeBtnText}>Copiar código</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.codeBtn, styles.whatsappBtn]} onPress={handleShareWhatsApp} activeOpacity={0.8}>
              <Ionicons name="logo-whatsapp" size={15} color={colors.bg} />
              <Text style={[styles.codeBtnText, { color: colors.bg }]}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── NÍVEL ── */}
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Text style={styles.sectionTitle}>Seu nível</Text>
          <Badge label={levelCfg.label} variant={levelCfg.variant} />
        </View>
        <ProgressBar progress={progressPercent} />
        <Text style={[typography.small, { color: colors.text2, marginTop: 8 }]}>
          {data.conversions} indicações convertidas
          {data.next_level_at ? ` · próximo nível em ${data.next_level_at}` : ' · nível máximo!'}
        </Text>

        <View style={styles.levelTable}>
          <View style={styles.levelRow}>
            <View style={[styles.levelDot, { backgroundColor: colors.green }]} />
            <Text style={styles.levelRowText}>Iniciante (1–14):</Text>
            <Text style={styles.levelRowCashback}>R$ 5,00 por indicação</Text>
          </View>
          <View style={styles.levelRow}>
            <View style={[styles.levelDot, { backgroundColor: colors.blue }]} />
            <Text style={styles.levelRowText}>Parceiro (15–29):</Text>
            <Text style={styles.levelRowCashback}>R$ 6,00 por indicação</Text>
          </View>
          <View style={styles.levelRow}>
            <View style={[styles.levelDot, { backgroundColor: colors.amber }]} />
            <Text style={styles.levelRowText}>Embaixador (30+):</Text>
            <Text style={styles.levelRowCashback}>R$ 7,00 por indicação</Text>
          </View>
        </View>
      </View>

      {/* ── INDICAÇÕES ── */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Minhas indicações</Text>
        {data.referrals.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={32} color={colors.text3} />
            <Text style={styles.emptyText}>Nenhuma indicação ainda.</Text>
            <Text style={[styles.emptyText, { color: colors.green }]}>
              Compartilhe seu código!
            </Text>
          </View>
        ) : (
          data.referrals.map((r, i) => {
            const sc = STATUS_CONFIG[r.status];
            return (
              <View key={i} style={[styles.indicadoRow, i < data.referrals.length - 1 && styles.indicadoDivider]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.indicadoName}>{r.name}</Text>
                  {r.converted_at && (
                    <Text style={styles.indicadoDate}>
                      {new Date(r.converted_at).toLocaleDateString('pt-BR')}
                    </Text>
                  )}
                </View>
                <Badge label={sc.label} variant={sc.variant} />
              </View>
            );
          })
        )}
      </View>

      <View style={{ height: 40 }} />

      <WithdrawSheet
        visible={withdrawVisible}
        onClose={() => setWithdrawVisible(false)}
        available={data.balance.available}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: spacing.lg },
  centered: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl, justifyContent: 'center' },
  heroCard: {
    backgroundColor: colors.greenBg,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    borderRadius: radius.lg,
    padding: 20,
    marginBottom: 14,
  },
  heroLabel: { ...typography.small, color: colors.green },
  heroAmount: { fontFamily: 'SpaceGrotesk', fontSize: 36, fontWeight: '700', color: colors.green, marginBottom: 4 },
  heroHint: { ...typography.small, color: colors.text2, marginBottom: 16, lineHeight: 18 },
  saqueBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.green, borderRadius: radius.sm, paddingVertical: 12,
  },
  saqueBtnDisabled: { backgroundColor: colors.bg3 },
  saqueBtnText: { fontFamily: 'SpaceGrotesk', fontSize: 14, fontWeight: '700', color: colors.bg },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 18,
    marginBottom: 14,
  },
  sectionTitle: { fontFamily: 'SpaceGrotesk', fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 2 },
  codeText: {
    fontFamily: 'SpaceGrotesk', fontSize: 28, fontWeight: '700',
    color: colors.text, letterSpacing: 3, marginTop: 8,
  },
  linkText: { ...typography.small, color: colors.text3, marginTop: 4 },
  codeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.bg3, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, paddingVertical: 10,
  },
  codeBtnText: { fontFamily: 'SpaceGrotesk', fontSize: 13, fontWeight: '600', color: colors.text },
  whatsappBtn: { backgroundColor: '#25D366', borderColor: '#25D366' },
  levelTable: { marginTop: 14, gap: 8 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  levelDot: { width: 8, height: 8, borderRadius: 4 },
  levelRowText: { ...typography.small, color: colors.text2, flex: 1 },
  levelRowCashback: { ...typography.small, color: colors.text, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 24, gap: 6 },
  emptyText: { ...typography.small, color: colors.text2, textAlign: 'center' },
  indicadoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  indicadoDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  indicadoName: { ...typography.label, color: colors.text },
  indicadoDate: { ...typography.micro, color: colors.text3, marginTop: 2 },
});

const s = StyleSheet.create({
  sheetTitle: { fontFamily: 'SpaceGrotesk', fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 20 },
  availableAmount: { fontFamily: 'SpaceGrotesk', fontSize: 24, fontWeight: '700', color: colors.green },
  fieldLabel: { ...typography.small, color: colors.text2, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: colors.bg3, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 12,
    color: colors.text, fontFamily: 'Inter', fontSize: 14,
  },
  btn: {
    backgroundColor: colors.green, borderRadius: radius.sm,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', marginTop: 20,
  },
  btnText: { fontFamily: 'SpaceGrotesk', fontSize: 15, fontWeight: '700', color: colors.bg },
  cancelBtn: { paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  cancelText: { ...typography.label, color: colors.text2 },
  confirmRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  confirmLabel: { ...typography.small, color: colors.text2 },
  confirmValue: { ...typography.label, color: colors.text },
  successContainer: { alignItems: 'center', paddingVertical: 24 },
  successIcon: { marginBottom: 16 },
  successTitle: { fontFamily: 'SpaceGrotesk', fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 8 },
  successSub: { ...typography.body, color: colors.text2, marginBottom: 32, textAlign: 'center' },
});
