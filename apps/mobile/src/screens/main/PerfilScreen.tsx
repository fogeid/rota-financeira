import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import { Card, Badge, AlertBox } from '../../components';
import { useAuthStore } from '../../store/authStore';
import { maskCpf } from '../../utils/formatters';

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

export function PerfilScreen() {
  const { user, biometryEnabled, setBiometryEnabled, logout } = useAuthStore();

  const trialDaysLeft = user?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(user.trial_ends_at).getTime() - Date.now()) / 86400000))
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
              variant={user?.plan === 'PREMIUM' || user?.plan === 'PRO' ? 'green' : 'blue'}
              label={user?.plan === 'PRO' || user?.plan === 'PREMIUM' ? 'Pro' : 'Gratuito'}
            />
            {trialDaysLeft !== null && trialDaysLeft > 0 && (
              <Text style={styles.trialText}>Trial · {trialDaysLeft} dias restantes</Text>
            )}
          </View>
        </View>
      </View>

      {trialDaysLeft !== null && trialDaysLeft <= 3 && trialDaysLeft > 0 && (
        <AlertBox variant="amber" message={`Seu trial expira em ${trialDaysLeft} dia(s). Assine para manter o acesso Premium.`} style={{ marginBottom: 8 }} />
      )}

      {/* Dados pessoais */}
      <Text style={styles.sectionLabel}>Meu veículo</Text>
      <Card>
        <SettingRow icon="car-outline" label="Chevrolet Onix 2024" value="ABC-1D23" onPress={() => {}} />
        <SettingRow icon="speedometer-outline" label="Consumo médio" value="12,4 km/L" onPress={() => {}} isLast />
      </Card>

      {/* Plataformas */}
      <Text style={styles.sectionLabel}>Plataformas</Text>
      <Card>
        <SettingRow icon="logo-usd" label="Uber" value="Conectado" toggle toggleValue={true} onToggle={() => {}} />
        <SettingRow icon="logo-usd" label="99" value="Conectado" toggle toggleValue={true} onToggle={() => {}} isLast />
      </Card>

      {/* Preferências */}
      <Text style={styles.sectionLabel}>Preferências</Text>
      <Card>
        <SettingRow
          icon="notifications-outline"
          label="Notificações"
          toggle
          toggleValue={true}
          onToggle={() => {}}
        />
        <SettingRow
          icon="finger-print-outline"
          label="Biometria"
          toggle
          toggleValue={biometryEnabled}
          onToggle={setBiometryEnabled}
        />
        <SettingRow icon="moon-outline" label="Tema escuro" toggle toggleValue={true} onToggle={() => {}} isLast />
      </Card>

      {/* Conta */}
      <Text style={styles.sectionLabel}>Conta</Text>
      <Card>
        <SettingRow icon="person-outline" label="Editar perfil" onPress={() => {}} />
        <SettingRow icon="lock-closed-outline" label="Alterar senha" onPress={() => {}} />
        <SettingRow icon="call-outline" label="Alterar telefone" onPress={() => {}} />
        <SettingRow icon="card-outline" label="Minha assinatura" onPress={() => {}} />
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
        <SettingRow icon="trash-outline" label="Excluir conta" onPress={() => {}} isLast destructive />
      </Card>

      <View style={{ height: 40 }} />
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
