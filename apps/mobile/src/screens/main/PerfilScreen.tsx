import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, Modal,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, typography, radius } from '../../theme';
import { Card, Badge, AlertBox } from '../../components';
import { useAuthStore } from '../../store/authStore';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import type { MainStackParamList } from '../../navigation/MainStack';

type NavProp = NativeStackNavigationProp<MainStackParamList>;

// ─── Edit Vehicle Modal ────────────────────────────────────────────────────
function EditVehicleModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [model, setModel] = useState('Chevrolet Onix 2024');
  const [plate, setPlate] = useState('ABC-1D23');
  const [consumption, setConsumption] = useState('12.4');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.header}>
            <Text style={modal.title}>Editar veículo</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.text2} />
            </TouchableOpacity>
          </View>
          <Text style={modal.label}>Modelo</Text>
          <TextInput style={modal.input} value={model} onChangeText={setModel} placeholderTextColor={colors.text3} />
          <Text style={modal.label}>Placa</Text>
          <TextInput style={modal.input} value={plate} onChangeText={setPlate} autoCapitalize="characters" placeholderTextColor={colors.text3} />
          <Text style={modal.label}>Consumo médio (km/L)</Text>
          <TextInput style={modal.input} value={consumption} onChangeText={setConsumption} keyboardType="decimal-pad" placeholderTextColor={colors.text3} />
          <TouchableOpacity style={modal.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
            {saving ? <ActivityIndicator color={colors.bg} size="small" /> : <Text style={modal.saveBtnText}>Salvar</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Edit Financing Modal ──────────────────────────────────────────────────
function EditFinancingModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [totalDebt, setTotalDebt] = useState('45000');
  const [installment, setInstallment] = useState('1250');
  const [remaining, setRemaining] = useState('36');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.header}>
            <Text style={modal.title}>Editar financiamento</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.text2} />
            </TouchableOpacity>
          </View>
          <Text style={modal.label}>Saldo devedor (R$)</Text>
          <TextInput style={modal.input} value={totalDebt} onChangeText={setTotalDebt} keyboardType="numeric" placeholderTextColor={colors.text3} />
          <Text style={modal.label}>Parcela mensal (R$)</Text>
          <TextInput style={modal.input} value={installment} onChangeText={setInstallment} keyboardType="numeric" placeholderTextColor={colors.text3} />
          <Text style={modal.label}>Parcelas restantes</Text>
          <TextInput style={modal.input} value={remaining} onChangeText={setRemaining} keyboardType="numeric" placeholderTextColor={colors.text3} />
          <TouchableOpacity style={modal.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
            {saving ? <ActivityIndicator color={colors.bg} size="small" /> : <Text style={modal.saveBtnText}>Salvar</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Delete Account Modal ──────────────────────────────────────────────────
const DELETE_CONFIRMATION_TEXT = 'EXCLUIR MINHA CONTA';

function DeleteAccountModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const logout = useAuthStore((s) => s.logout);

  const canDelete = password.length >= 6 && confirmation === DELETE_CONFIRMATION_TEXT;

  async function handleDelete() {
    if (!canDelete) return;
    Alert.alert(
      'Confirmar exclusão',
      'Esta ação é irreversível. Todos os seus dados serão excluídos permanentemente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir conta',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            await new Promise((r) => setTimeout(r, 1200));
            setDeleting(false);
            onClose();
            logout();
          },
        },
      ],
    );
  }

  function handleClose() {
    setPassword('');
    setConfirmation('');
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.header}>
            <Text style={[modal.title, { color: colors.red }]}>Excluir conta</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={22} color={colors.text2} />
            </TouchableOpacity>
          </View>

          <AlertBox
            variant="red"
            icon="⚠️"
            message="Esta ação é permanente e irreversível. Todos os seus dados, histórico e assinatura serão excluídos."
            style={{ marginBottom: 16 }}
          />

          <Text style={modal.label}>Sua senha atual</Text>
          <TextInput
            style={modal.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Digite sua senha"
            placeholderTextColor={colors.text3}
          />

          <Text style={modal.label}>
            Digite <Text style={{ color: colors.red, fontWeight: '700' }}>{DELETE_CONFIRMATION_TEXT}</Text> para confirmar
          </Text>
          <TextInput
            style={[modal.input, confirmation === DELETE_CONFIRMATION_TEXT && { borderColor: colors.red }]}
            value={confirmation}
            onChangeText={setConfirmation}
            placeholder={DELETE_CONFIRMATION_TEXT}
            placeholderTextColor={colors.text3}
            autoCapitalize="characters"
          />

          <TouchableOpacity
            style={[modal.saveBtn, { backgroundColor: colors.red }, !canDelete && { opacity: 0.4 }]}
            onPress={handleDelete}
            disabled={!canDelete || deleting}
            activeOpacity={0.85}
          >
            {deleting
              ? <ActivityIndicator color={colors.bg} size="small" />
              : <Text style={modal.saveBtnText}>Excluir permanentemente</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Setting Row ───────────────────────────────────────────────────────────
function SettingRow({
  icon, label, value, onPress, toggle, toggleValue, onToggle, isLast, destructive,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value?: string;
  onPress?: () => void;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (v: boolean) => void;
  isLast?: boolean;
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.settingRow, !isLast && styles.settingDivider]}
      onPress={onPress}
      disabled={toggle || !onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.settingIcon, destructive && { backgroundColor: colors.redBg }]}>
        <Ionicons name={icon} size={16} color={destructive ? colors.red : colors.text2} />
      </View>
      <Text style={[styles.settingLabel, destructive && { color: colors.red }]}>{label}</Text>
      <View style={{ flex: 1 }} />
      {value ? <Text style={styles.settingValue}>{value}</Text> : null}
      {toggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: colors.border2, true: colors.green }}
          thumbColor={colors.bg}
        />
      ) : (
        <Ionicons name="chevron-forward" size={16} color={colors.text3} />
      )}
    </TouchableOpacity>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────
export function PerfilScreen() {
  const navigation = useNavigation<NavProp>();
  const { user, biometryEnabled, setBiometryEnabled, logout } = useAuthStore();
  const subscriptionInfo = useSubscriptionStore((s) => s.info);
  const isPro = useSubscriptionStore((s) => s.isPro)();

  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);
  const [financingModalVisible, setFinancingModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const trialDaysLeft = user?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(user.trial_ends_at).getTime() - Date.now()) / 86400000))
    : null;

  const renewalDate = subscriptionInfo?.current_period_end
    ? new Date(subscriptionInfo.current_period_end).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Avatar + name */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitial}>
            {user?.name?.charAt(0).toUpperCase() ?? 'M'}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{user?.name ?? 'Motorista'}</Text>
          <View style={styles.planRow}>
            <Badge
              variant={isPro ? 'green' : 'blue'}
              label={isPro ? 'Pro' : 'Gratuito'}
            />
            {trialDaysLeft !== null && trialDaysLeft > 0 && (
              <Text style={styles.trialText}>Trial · {trialDaysLeft} dias restantes</Text>
            )}
          </View>
        </View>
      </View>

      {trialDaysLeft !== null && trialDaysLeft <= 3 && trialDaysLeft > 0 && (
        <AlertBox
          variant="amber"
          message={`Seu trial expira em ${trialDaysLeft} dia(s). Assine para manter o acesso.`}
          style={{ marginBottom: 8 }}
        />
      )}

      {/* Subscription */}
      <Text style={styles.sectionLabel}>Assinatura</Text>
      <Card>
        {isPro ? (
          <>
            <SettingRow
              icon="star-outline"
              label="Plano Pro ativo"
              value={subscriptionInfo?.billing_cycle === 'ANNUAL' ? 'Anual' : 'Mensal'}
              onPress={() => {}}
            />
            {renewalDate && (
              <SettingRow
                icon="calendar-outline"
                label="Renovação em"
                value={renewalDate}
                isLast
                onPress={() => {}}
              />
            )}
          </>
        ) : (
          <SettingRow
            icon="star-outline"
            label="Fazer upgrade para Pro"
            onPress={() => navigation.navigate('Upgrade')}
            isLast
          />
        )}
      </Card>

      {/* Vehicle */}
      <Text style={styles.sectionLabel}>Meu veículo</Text>
      <Card>
        <SettingRow
          icon="car-outline"
          label="Chevrolet Onix 2024"
          value="ABC-1D23"
          onPress={() => setVehicleModalVisible(true)}
        />
        <SettingRow
          icon="speedometer-outline"
          label="Consumo médio"
          value="12,4 km/L"
          onPress={() => setVehicleModalVisible(true)}
          isLast
        />
      </Card>

      {/* Financing */}
      <Text style={styles.sectionLabel}>Financiamento</Text>
      <Card>
        <SettingRow
          icon="cash-outline"
          label="Parcela mensal"
          value="R$ 1.250,00"
          onPress={() => setFinancingModalVisible(true)}
        />
        <SettingRow
          icon="time-outline"
          label="Parcelas restantes"
          value="36"
          onPress={() => setFinancingModalVisible(true)}
          isLast
        />
      </Card>

      {/* Platforms */}
      <Text style={styles.sectionLabel}>Plataformas</Text>
      <Card>
        <SettingRow icon="logo-usd" label="Uber" value="Conectado" toggle toggleValue={true} onToggle={() => {}} />
        <SettingRow icon="logo-usd" label="99" value="Conectado" toggle toggleValue={true} onToggle={() => {}} isLast />
      </Card>

      {/* Preferences */}
      <Text style={styles.sectionLabel}>Preferências</Text>
      <Card>
        <SettingRow icon="notifications-outline" label="Notificações" toggle toggleValue={true} onToggle={() => {}} />
        <SettingRow
          icon="finger-print-outline"
          label="Biometria"
          toggle
          toggleValue={biometryEnabled}
          onToggle={setBiometryEnabled}
        />
        <SettingRow icon="moon-outline" label="Tema escuro" toggle toggleValue={true} onToggle={() => {}} isLast />
      </Card>

      {/* Account */}
      <Text style={styles.sectionLabel}>Conta</Text>
      <Card>
        <SettingRow icon="person-outline" label="Editar perfil" onPress={() => {}} />
        <SettingRow icon="lock-closed-outline" label="Alterar senha" onPress={() => {}} />
        <SettingRow icon="call-outline" label="Alterar telefone" onPress={() => {}} />
        <SettingRow icon="help-circle-outline" label="Suporte via WhatsApp" onPress={() => {}} />
        <SettingRow icon="document-text-outline" label="Termos de uso" onPress={() => {}} />
        <SettingRow icon="shield-outline" label="Política de privacidade" onPress={() => {}} isLast />
      </Card>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={18} color={colors.text2} />
        <Text style={styles.logoutText}>Sair da conta</Text>
      </TouchableOpacity>

      {/* Delete account */}
      <Card style={{ marginTop: 8 }}>
        <SettingRow
          icon="trash-outline"
          label="Excluir conta"
          onPress={() => setDeleteModalVisible(true)}
          isLast
          destructive
        />
      </Card>

      <View style={{ height: 40 }} />

      <EditVehicleModal visible={vehicleModalVisible} onClose={() => setVehicleModalVisible(false)} />
      <EditFinancingModal visible={financingModalVisible} onClose={() => setFinancingModalVisible(false)} />
      <DeleteAccountModal visible={deleteModalVisible} onClose={() => setDeleteModalVisible(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingTop: 16 },
  avatarSection: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: 16, marginBottom: 16,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.greenBg, borderWidth: 2, borderColor: colors.greenBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontFamily: 'SpaceGrotesk', fontSize: 22, fontWeight: '700', color: colors.green },
  userName: { fontFamily: 'SpaceGrotesk', fontSize: 17, fontWeight: '700', color: colors.text },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  trialText: { ...typography.small, color: colors.amber },
  sectionLabel: {
    ...typography.micro, color: colors.text3,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 10, marginTop: 20,
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13, gap: 12,
  },
  settingDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  settingIcon: {
    width: 30, height: 30, borderRadius: radius.xs,
    backgroundColor: colors.bg3, alignItems: 'center', justifyContent: 'center',
  },
  settingLabel: { ...typography.label, color: colors.text },
  settingValue: { ...typography.small, color: colors.text2 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.bg3, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, paddingVertical: 14, marginTop: 20,
  },
  logoutText: { ...typography.label, color: colors.text2 },
});

const modal = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.xl, paddingTop: 20,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontFamily: 'SpaceGrotesk', fontSize: 18, fontWeight: '700', color: colors.text },
  label: { ...typography.small, color: colors.text2, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: colors.bg3, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 12,
    color: colors.text, fontFamily: 'Inter', fontSize: 14,
  },
  saveBtn: {
    backgroundColor: colors.green, borderRadius: radius.sm,
    paddingVertical: 14, alignItems: 'center', marginTop: 20,
  },
  saveBtnText: { fontFamily: 'SpaceGrotesk', fontSize: 15, fontWeight: '700', color: colors.bg },
});
