import React, { useState, useEffect } from 'react';
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
import { integrationsService } from '../../services/integrationsService';
import { usersService } from '../../services/usersService';
import type { IntegrationStatus } from '../../types/api';
import type { MainStackParamList } from '../../navigation/MainStack';

type NavProp = NativeStackNavigationProp<MainStackParamList>;

const PLATFORM_LABEL: Record<string, string> = {
  UBER: 'Uber',
  NOVENTA_E_NOVE: '99',
};

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

// ─── Connect Platform Modal ────────────────────────────────────────────────
function ConnectPlatformModal({
  platform,
  onClose,
  onSuccess,
}: {
  platform: 'UBER' | 'NOVENTA_E_NOVE' | null;
  onClose: () => void;
  onSuccess: (platform: 'UBER' | 'NOVENTA_E_NOVE') => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = platform ? PLATFORM_LABEL[platform] : '';

  function handleClose() {
    setEmail('');
    setPassword('');
    setError(null);
    onClose();
  }

  async function handleConnect() {
    if (!platform) return;
    if (!email.trim() || !password) {
      setError('Preencha e-mail e senha.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await integrationsService.connect(platform, { email: email.trim(), password });
      handleClose();
      onSuccess(platform);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 400) {
        setError('E-mail ou senha incorretos.');
      } else {
        setError('Sem conexão. Verifique sua internet.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={!!platform} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.header}>
            <Text style={modal.title}>Conectar {label}</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={22} color={colors.text2} />
            </TouchableOpacity>
          </View>

          {error && <AlertBox variant="red" message={error} style={{ marginBottom: 8 }} />}

          <Text style={modal.label}>E-mail da conta {label}</Text>
          <TextInput
            style={modal.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholder="seu@email.com"
            placeholderTextColor={colors.text3}
          />

          <Text style={modal.label}>Senha</Text>
          <TextInput
            style={modal.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Sua senha"
            placeholderTextColor={colors.text3}
          />

          <Text style={[typography.small, { color: colors.text3, marginTop: 8, textAlign: 'center' }]}>
            Suas credenciais são criptografadas e nunca compartilhadas.
          </Text>

          <TouchableOpacity
            style={[modal.saveBtn, loading && { opacity: 0.6 }]}
            onPress={handleConnect}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color={colors.bg} size="small" />
              : <Text style={modal.saveBtnText}>Conectar</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Edit Profile Modal ────────────────────────────────────────────────────
function EditProfileModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName(user?.name ?? '');
      setEmail('');
      setCurrentPassword('');
      setError(null);
    }
  }, [visible]);

  function handleClose() {
    setError(null);
    onClose();
  }

  async function handleSave() {
    if (!name.trim() || !currentPassword) {
      setError('Nome e senha atual são obrigatórios.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload: { name: string; email?: string; current_password: string } = {
        name: name.trim(),
        current_password: currentPassword,
      };
      if (email.trim()) payload.email = email.trim();
      const updated = await usersService.updateProfile(payload);
      if (user) setUser({ ...user, name: updated.name });
      handleClose();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) setError('Senha incorreta.');
      else if (status === 409) setError('Este e-mail já está em uso.');
      else setError('Erro ao salvar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.header}>
            <Text style={modal.title}>Editar perfil</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={22} color={colors.text2} />
            </TouchableOpacity>
          </View>

          {error && <AlertBox variant="red" message={error} style={{ marginBottom: 8 }} />}

          <Text style={modal.label}>Nome completo</Text>
          <TextInput
            style={modal.input}
            value={name}
            onChangeText={setName}
            placeholder="Seu nome"
            placeholderTextColor={colors.text3}
          />

          <Text style={modal.label}>Novo e-mail (opcional)</Text>
          <TextInput
            style={modal.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="Deixe em branco para manter o atual"
            placeholderTextColor={colors.text3}
          />

          <Text style={modal.label}>Senha atual (obrigatória para confirmar)</Text>
          <TextInput
            style={modal.input}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            placeholder="Sua senha atual"
            placeholderTextColor={colors.text3}
          />

          <TouchableOpacity
            style={[modal.saveBtn, loading && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color={colors.bg} size="small" />
              : <Text style={modal.saveBtnText}>Salvar</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Change Password Modal ─────────────────────────────────────────────────
function ChangePasswordModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const logout = useAuthStore((s) => s.logout);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    onClose();
  }

  async function handleSave() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Preencha todos os campos.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Nova senha e confirmação não coincidem.');
      return;
    }
    if (newPassword.length < 8) {
      setError('A nova senha deve ter pelo menos 8 caracteres.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await usersService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      handleClose();
      logout();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) setError('Senha atual incorreta.');
      else setError('Erro ao alterar senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.header}>
            <Text style={modal.title}>Alterar senha</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={22} color={colors.text2} />
            </TouchableOpacity>
          </View>

          {error && <AlertBox variant="red" message={error} style={{ marginBottom: 8 }} />}

          <Text style={modal.label}>Senha atual</Text>
          <TextInput
            style={modal.input}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            placeholder="Senha atual"
            placeholderTextColor={colors.text3}
          />

          <Text style={modal.label}>Nova senha</Text>
          <TextInput
            style={modal.input}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            placeholder="Mínimo 8 caracteres"
            placeholderTextColor={colors.text3}
          />

          <Text style={modal.label}>Confirmar nova senha</Text>
          <TextInput
            style={modal.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholder="Repita a nova senha"
            placeholderTextColor={colors.text3}
          />

          <TouchableOpacity
            style={[modal.saveBtn, loading && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color={colors.bg} size="small" />
              : <Text style={modal.saveBtnText}>Alterar senha</Text>
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
  const loadSubscription = useSubscriptionStore((s) => s.load);
  const isPro = useSubscriptionStore((s) => s.isPro)();

  const [platforms, setPlatforms] = useState<IntegrationStatus[]>([]);
  const [connectPlatform, setConnectPlatform] = useState<'UBER' | 'NOVENTA_E_NOVE' | null>(null);
  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);
  const [financingModalVisible, setFinancingModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);

  useEffect(() => {
    loadSubscription();
    integrationsService.status()
      .then((res) => setPlatforms(res.integrations))
      .catch(() => {});
  }, []);

  const trialDaysLeft = user?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(user.trial_ends_at).getTime() - Date.now()) / 86400000))
    : null;

  const renewalDate = subscriptionInfo?.current_period_end
    ? new Date(subscriptionInfo.current_period_end).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  function isConnected(platform: 'UBER' | 'NOVENTA_E_NOVE') {
    return platforms.find((p) => p.platform === platform)?.is_active ?? false;
  }

  function handleTogglePlatform(platform: 'UBER' | 'NOVENTA_E_NOVE', value: boolean) {
    if (value) {
      setConnectPlatform(platform);
    } else {
      Alert.alert(
        `Desconectar ${PLATFORM_LABEL[platform]}?`,
        'Seu histórico será mantido.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Desconectar',
            style: 'destructive',
            onPress: async () => {
              try {
                await integrationsService.disconnect(platform);
                setPlatforms((prev) => prev.filter((i) => i.platform !== platform));
              } catch {
                Alert.alert('Erro', 'Não foi possível desconectar. Tente novamente.');
              }
            },
          },
        ],
      );
    }
  }

  function handleConnectSuccess(platform: 'UBER' | 'NOVENTA_E_NOVE') {
    setPlatforms((prev) => {
      const existing = prev.find((p) => p.platform === platform);
      if (existing) {
        return prev.map((p) => p.platform === platform ? { ...p, is_active: true } : p);
      }
      return [...prev, { platform, is_active: true, last_sync_at: null, last_sync_status: null }];
    });
  }

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
              value={subscriptionInfo?.billing_cycle === 'YEARLY' ? 'Anual' : 'Mensal'}
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
        <SettingRow
          icon="logo-usd"
          label="Uber"
          value={isConnected('UBER') ? 'Conectado' : 'Não conectado'}
          toggle
          toggleValue={isConnected('UBER')}
          onToggle={(v) => handleTogglePlatform('UBER', v)}
        />
        <SettingRow
          icon="logo-usd"
          label="99"
          value={isConnected('NOVENTA_E_NOVE') ? 'Conectado' : 'Não conectado'}
          toggle
          toggleValue={isConnected('NOVENTA_E_NOVE')}
          onToggle={(v) => handleTogglePlatform('NOVENTA_E_NOVE', v)}
          isLast
        />
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
        <SettingRow icon="person-outline" label="Editar perfil" onPress={() => setEditProfileVisible(true)} />
        <SettingRow icon="lock-closed-outline" label="Alterar senha" onPress={() => setChangePasswordVisible(true)} />
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
      <ConnectPlatformModal
        platform={connectPlatform}
        onClose={() => setConnectPlatform(null)}
        onSuccess={handleConnectSuccess}
      />
      <EditProfileModal visible={editProfileVisible} onClose={() => setEditProfileVisible(false)} />
      <ChangePasswordModal visible={changePasswordVisible} onClose={() => setChangePasswordVisible(false)} />
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
