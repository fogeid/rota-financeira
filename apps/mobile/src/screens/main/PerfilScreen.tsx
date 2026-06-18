import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, Modal,
  TextInput, Alert, ActivityIndicator, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, typography, radius } from '../../theme';
import { Card, Badge, AlertBox } from '../../components';
import { useAuthStore } from '../../store/authStore';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { useFinancingStore } from '../../store/financingStore';
import { integrationsService } from '../../services/integrationsService';
import { usersService } from '../../services/usersService';
import { vehiclesService } from '../../services/vehiclesService';
import { alertsService } from '../../services/alertsService';
import { subscriptionsService } from '../../services/subscriptionsService';
import type { IntegrationStatus } from '../../types/api';
import type { VehicleData } from '../../services/vehiclesService';
import type { AlertPreference } from '../../services/alertsService';
import type { MainStackParamList } from '../../navigation/MainStack';

type NavProp = NativeStackNavigationProp<MainStackParamList>;

const PLATFORM_LABEL: Record<string, string> = {
  UBER: 'Uber',
  NOVENTA_E_NOVE: '99',
};

/** Remove separador de milhar, troca vírgula decimal por ponto */
function parseBRL(s: string): number {
  return parseFloat(s.replace(/\./g, '').replace(',', '.'));
}

/** Formata número como "1250,00" para exibição em campo de texto */
function fmtBRL(n: number | string): string {
  const num = typeof n === 'string' ? parseFloat(n) : n;
  return isNaN(num) ? '' : num.toFixed(2).replace('.', ',');
}

const WHATSAPP_URL = 'https://wa.me/5511999999999?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20o%20Rota%20Financeira';

// ─── Edit Vehicle Modal ────────────────────────────────────────────────────
function EditVehicleModal({ visible, onClose, onSaved }: {
  visible: boolean;
  onClose: () => void;
  onSaved: (v: VehicleData) => void;
}) {
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [plate, setPlate] = useState('');
  const [consumption, setConsumption] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setError(null);
      vehiclesService.getVehicle().then((v) => {
        setModel(v.model);
        setYear(String(v.year));
        setPlate(v.plate);
        setConsumption(String(v.fuel_efficiency).replace('.', ','));
      }).catch(() => {});
    }
  }, [visible]);

  async function handleSave() {
    const yearNum = parseInt(year);
    const consumptionNum = parseBRL(consumption);
    if (!model.trim() || !plate.trim()) { setError('Modelo e placa são obrigatórios.'); return; }
    if (isNaN(yearNum) || yearNum < 1990 || yearNum > 2027) { setError('Ano inválido (1990–2027).'); return; }
    if (isNaN(consumptionNum) || consumptionNum < 4 || consumptionNum > 30) { setError('Consumo inválido (4–30 km/L).'); return; }
    setLoading(true);
    setError(null);
    try {
      const updated = await vehiclesService.upsertVehicle({
        model: model.trim(), year: yearNum, plate: plate.trim().toUpperCase(), fuel_efficiency: consumptionNum,
      });
      onSaved(updated);
      onClose();
    } catch {
      setError('Erro ao salvar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.header}>
            <Text style={modal.title}>Editar veículo</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={colors.text2} /></TouchableOpacity>
          </View>
          {error && <AlertBox variant="red" message={error} style={{ marginBottom: 8 }} />}
          <Text style={modal.label}>Modelo</Text>
          <TextInput style={modal.input} value={model} onChangeText={setModel} placeholder="Chevrolet Onix 2024" placeholderTextColor={colors.text3} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={modal.label}>Ano</Text>
              <TextInput style={modal.input} value={year} onChangeText={setYear} keyboardType="numeric" placeholder="2024" placeholderTextColor={colors.text3} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={modal.label}>Consumo (km/L)</Text>
              <TextInput style={modal.input} value={consumption} onChangeText={setConsumption} keyboardType="decimal-pad" placeholder="12,4" placeholderTextColor={colors.text3} />
            </View>
          </View>
          <Text style={modal.label}>Placa</Text>
          <TextInput style={modal.input} value={plate} onChangeText={setPlate} autoCapitalize="characters" placeholder="ABC-1234" placeholderTextColor={colors.text3} />
          <TouchableOpacity style={modal.saveBtn} onPress={handleSave} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color={colors.bg} size="small" /> : <Text style={modal.saveBtnText}>Salvar</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Edit Financing Modal ──────────────────────────────────────────────────
function EditFinancingModal({ visible, onClose, onSaved }: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [installment, setInstallment] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [desiredIncome, setDesiredIncome] = useState('');
  const [workDays, setWorkDays] = useState('');
  const [totalInstallments, setTotalInstallments] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setError(null);
      import('../../services/financingService').then(({ financingService }) => {
        financingService.getData().then((f) => {
          setInstallment(fmtBRL(f.monthly_installment));
          setDueDay(String(f.due_day));
          setDesiredIncome(fmtBRL(f.desired_income));
          setWorkDays(String(f.work_days_per_month));
          setTotalInstallments(f.total_installments != null ? String(f.total_installments) : '');
        }).catch(() => {});
      });
    }
  }, [visible]);

  async function handleSave() {
    const inst = parseBRL(installment);
    const due = parseInt(dueDay);
    const income = parseBRL(desiredIncome);
    const days = parseInt(workDays);
    const total = totalInstallments.trim() ? parseInt(totalInstallments) : null;
    if (isNaN(inst) || inst <= 0) { setError('Parcela inválida.'); return; }
    if (isNaN(due) || due < 1 || due > 28) { setError('Dia de vencimento deve ser entre 1 e 28.'); return; }
    if (isNaN(income) || income < 0) { setError('Renda desejada inválida.'); return; }
    if (isNaN(days) || days < 1 || days > 30) { setError('Dias de trabalho deve ser entre 1 e 30.'); return; }
    if (total !== null && (isNaN(total) || total < 1 || total > 600)) { setError('Quantidade de parcelas deve ser entre 1 e 600.'); return; }
    setLoading(true);
    setError(null);
    try {
      const { financingService } = await import('../../services/financingService');
      await financingService.update({
        monthly_installment: inst,
        due_day: due,
        desired_income: income,
        work_days_per_month: days,
        total_installments: total,
      });
      onSaved();
      onClose();
    } catch {
      setError('Erro ao salvar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.header}>
            <Text style={modal.title}>Editar financiamento</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={colors.text2} /></TouchableOpacity>
          </View>
          {error && <AlertBox variant="red" message={error} style={{ marginBottom: 8 }} />}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={modal.label}>Parcela mensal (R$)</Text>
              <TextInput style={modal.input} value={installment} onChangeText={setInstallment} keyboardType="decimal-pad" placeholder="1250,00" placeholderTextColor={colors.text3} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={modal.label}>Vencimento (dia)</Text>
              <TextInput style={modal.input} value={dueDay} onChangeText={setDueDay} keyboardType="numeric" placeholder="25" placeholderTextColor={colors.text3} maxLength={2} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={modal.label}>Qtd. de parcelas</Text>
              <TextInput style={modal.input} value={totalInstallments} onChangeText={setTotalInstallments} keyboardType="numeric" placeholder="60" placeholderTextColor={colors.text3} maxLength={3} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={modal.label}>Dias trabalhados/mês</Text>
              <TextInput style={modal.input} value={workDays} onChangeText={setWorkDays} keyboardType="numeric" placeholder="22" placeholderTextColor={colors.text3} maxLength={2} />
            </View>
          </View>
          <Text style={modal.label}>Renda desejada (R$)</Text>
          <TextInput style={modal.input} value={desiredIncome} onChangeText={setDesiredIncome} keyboardType="decimal-pad" placeholder="2000,00" placeholderTextColor={colors.text3} />
          <TouchableOpacity style={modal.saveBtn} onPress={handleSave} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color={colors.bg} size="small" /> : <Text style={modal.saveBtnText}>Salvar</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Delete Account Modal ──────────────────────────────────────────────────
const DELETE_CONFIRMATION_TEXT = 'EXCLUIR MINHA CONTA';

function DeleteAccountModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logout = useAuthStore((s) => s.logout);

  const canDelete = password.length >= 6 && confirmation === DELETE_CONFIRMATION_TEXT;

  async function handleDelete() {
    if (!canDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await usersService.deleteAccount({ password, confirmation: DELETE_CONFIRMATION_TEXT });
      onClose();
      logout();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) setError('Senha incorreta.');
      else setError('Erro ao excluir conta. Tente novamente.');
      setDeleting(false);
    }
  }

  function handleClose() {
    setStep(1);
    setPassword('');
    setConfirmation('');
    setError(null);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.header}>
            <Text style={[modal.title, { color: colors.red }]}>Excluir conta</Text>
            <TouchableOpacity onPress={handleClose}><Ionicons name="close" size={22} color={colors.text2} /></TouchableOpacity>
          </View>
          {step === 1 ? (
            <>
              <AlertBox
                variant="red"
                icon="⚠️"
                message="Esta ação é permanente e irreversível. Todos os seus dados, histórico e assinatura serão excluídos em até 30 dias."
                style={{ marginBottom: 16 }}
              />
              <TouchableOpacity
                style={[modal.saveBtn, { backgroundColor: colors.red }]}
                onPress={() => setStep(2)}
                activeOpacity={0.85}
              >
                <Text style={modal.saveBtnText}>Continuar com a exclusão</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {error && <AlertBox variant="red" message={error} style={{ marginBottom: 8 }} />}
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
                  : <Text style={modal.saveBtnText}>Excluir minha conta permanentemente</Text>
                }
              </TouchableOpacity>
            </>
          )}
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
    setEmail(''); setPassword(''); setError(null);
    onClose();
  }

  async function handleConnect() {
    if (!platform) return;
    if (!email.trim() || !password) { setError('Preencha e-mail e senha.'); return; }
    setLoading(true);
    setError(null);
    try {
      await integrationsService.connect(platform, { email: email.trim(), password });
      handleClose();
      onSuccess(platform);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        // Already connected — close modal and reflect as connected in UI
        handleClose();
        onSuccess(platform);
      } else if (status === 400) {
        setError('Dados inválidos. Verifique o e-mail e tente novamente.');
      } else if (status === 401) {
        setError('Sessão expirada. Faça login novamente.');
      } else if (!status) {
        setError('Não foi possível conectar ao servidor. Verifique se o backend está rodando e o EXPO_PUBLIC_API_URL.');
      } else {
        setError(`Erro ${status}. Tente novamente.`);
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
            <TouchableOpacity onPress={handleClose}><Ionicons name="close" size={22} color={colors.text2} /></TouchableOpacity>
          </View>
          {error && <AlertBox variant="red" message={error} style={{ marginBottom: 8 }} />}
          <Text style={modal.label}>E-mail da conta {label}</Text>
          <TextInput
            style={modal.input} value={email} onChangeText={setEmail}
            keyboardType="email-address" autoCapitalize="none" autoComplete="email"
            placeholder="seu@email.com" placeholderTextColor={colors.text3}
          />
          <Text style={modal.label}>Senha</Text>
          <TextInput
            style={modal.input} value={password} onChangeText={setPassword}
            secureTextEntry placeholder="Sua senha" placeholderTextColor={colors.text3}
          />
          <Text style={[typography.small, { color: colors.text3, marginTop: 8, textAlign: 'center' }]}>
            Suas credenciais são criptografadas e nunca compartilhadas.
          </Text>
          <TouchableOpacity style={[modal.saveBtn, loading && { opacity: 0.6 }]} onPress={handleConnect} disabled={loading} activeOpacity={0.85}>
            {loading
              ? <><ActivityIndicator color={colors.bg} size="small" style={{ marginRight: 8 }} /><Text style={modal.saveBtnText}>Verificando...</Text></>
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
      usersService.getMe().then((me) => setEmail(me.email.includes('*') ? '' : me.email)).catch(() => {});
    }
  }, [visible]);

  function handleClose() { setError(null); onClose(); }

  async function handleSave() {
    if (!name.trim() || !currentPassword) { setError('Nome e senha atual são obrigatórios.'); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('E-mail inválido.'); return; }
    setLoading(true);
    setError(null);
    try {
      const payload: { name: string; email?: string; current_password: string } = {
        name: name.trim(), current_password: currentPassword,
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
            <TouchableOpacity onPress={handleClose}><Ionicons name="close" size={22} color={colors.text2} /></TouchableOpacity>
          </View>
          {error && <AlertBox variant="red" message={error} style={{ marginBottom: 8 }} />}
          <Text style={modal.label}>Nome completo</Text>
          <TextInput style={modal.input} value={name} onChangeText={setName} placeholder="Seu nome" placeholderTextColor={colors.text3} />
          <Text style={modal.label}>Novo e-mail (opcional)</Text>
          <TextInput
            style={modal.input} value={email} onChangeText={setEmail}
            keyboardType="email-address" autoCapitalize="none"
            placeholder="Deixe em branco para manter o atual" placeholderTextColor={colors.text3}
          />
          <Text style={modal.label}>Senha atual (obrigatória para confirmar)</Text>
          <TextInput style={modal.input} value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry placeholder="Sua senha atual" placeholderTextColor={colors.text3} />
          <TouchableOpacity style={[modal.saveBtn, loading && { opacity: 0.6 }]} onPress={handleSave} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color={colors.bg} size="small" /> : <Text style={modal.saveBtnText}>Salvar</Text>}
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
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setError(null);
    onClose();
  }

  async function handleSave() {
    if (!currentPassword || !newPassword || !confirmPassword) { setError('Preencha todos os campos.'); return; }
    if (newPassword !== confirmPassword) { setError('Nova senha e confirmação não coincidem.'); return; }
    if (newPassword.length < 8) { setError('A nova senha deve ter pelo menos 8 caracteres.'); return; }
    if (!/[A-Z]/.test(newPassword)) { setError('A nova senha deve ter pelo menos 1 letra maiúscula.'); return; }
    if (!/[0-9]/.test(newPassword)) { setError('A nova senha deve ter pelo menos 1 número.'); return; }
    setLoading(true);
    setError(null);
    try {
      await usersService.changePassword({ current_password: currentPassword, new_password: newPassword });
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
            <TouchableOpacity onPress={handleClose}><Ionicons name="close" size={22} color={colors.text2} /></TouchableOpacity>
          </View>
          {error && <AlertBox variant="red" message={error} style={{ marginBottom: 8 }} />}
          <Text style={modal.label}>Senha atual</Text>
          <TextInput style={modal.input} value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry placeholder="Senha atual" placeholderTextColor={colors.text3} />
          <Text style={modal.label}>Nova senha</Text>
          <TextInput style={modal.input} value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="Mín. 8 chars, 1 maiúscula, 1 número" placeholderTextColor={colors.text3} />
          <Text style={modal.label}>Confirmar nova senha</Text>
          <TextInput style={modal.input} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholder="Repita a nova senha" placeholderTextColor={colors.text3} />
          <TouchableOpacity style={[modal.saveBtn, loading && { opacity: 0.6 }]} onPress={handleSave} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color={colors.bg} size="small" /> : <Text style={modal.saveBtnText}>Alterar senha</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Change Phone Modal ────────────────────────────────────────────────────
function ChangePhoneModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [newPhone, setNewPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setStep(1); setNewPhone(''); setCurrentPassword(''); setOtp(''); setError(null);
    onClose();
  }

  async function handleSendCode() {
    const digits = newPhone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 11) { setError('Número inválido. Use DDD + número (ex: 11988887777).'); return; }
    if (!currentPassword) { setError('Informe sua senha atual.'); return; }
    setLoading(true);
    setError(null);
    const formattedPhone = `+55${digits}`;
    try {
      await usersService.changePhone({ new_phone: formattedPhone, current_password: currentPassword });
      setStep(2);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) setError('Senha incorreta.');
      else if (status === 409) setError('Este número já está em uso.');
      else setError('Erro ao enviar código. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (otp.length !== 6) { setError('O código deve ter 6 dígitos.'); return; }
    setLoading(true);
    setError(null);
    const formattedPhone = `+55${newPhone.replace(/\D/g, '')}`;
    try {
      await usersService.changePhoneVerify({ new_phone: formattedPhone, code: otp });
      Alert.alert('Pronto!', 'Telefone atualizado com sucesso.');
      handleClose();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 400) setError('Código inválido ou expirado.');
      else setError('Erro ao verificar código. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <View style={modal.header}>
            <Text style={modal.title}>
              {step === 1 ? 'Alterar telefone' : 'Confirmar código'}
            </Text>
            <TouchableOpacity onPress={handleClose}><Ionicons name="close" size={22} color={colors.text2} /></TouchableOpacity>
          </View>
          {error && <AlertBox variant="red" message={error} style={{ marginBottom: 8 }} />}
          {step === 1 ? (
            <>
              <Text style={modal.label}>Novo número (DDD + número)</Text>
              <TextInput
                style={modal.input}
                value={newPhone}
                onChangeText={setNewPhone}
                keyboardType="phone-pad"
                placeholder="11988887777"
                placeholderTextColor={colors.text3}
                maxLength={11}
              />
              <Text style={modal.label}>Senha atual</Text>
              <TextInput
                style={modal.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                placeholder="Sua senha atual"
                placeholderTextColor={colors.text3}
              />
              <TouchableOpacity style={[modal.saveBtn, loading && { opacity: 0.6 }]} onPress={handleSendCode} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color={colors.bg} size="small" /> : <Text style={modal.saveBtnText}>Enviar código SMS</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[modal.label, { marginTop: 0 }]}>
                Código enviado para +55{newPhone.replace(/\D/g, '')}
              </Text>
              <TextInput
                style={[modal.input, { letterSpacing: 8, fontSize: 20, textAlign: 'center' }]}
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                placeholder="000000"
                placeholderTextColor={colors.text3}
                maxLength={6}
              />
              <TouchableOpacity style={[modal.saveBtn, loading && { opacity: 0.6 }]} onPress={handleVerify} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color={colors.bg} size="small" /> : <Text style={modal.saveBtnText}>Confirmar</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setStep(1)} style={{ marginTop: 12, alignItems: 'center' }}>
                <Text style={[modal.label, { color: colors.green, marginTop: 0 }]}>Trocar número</Text>
              </TouchableOpacity>
            </>
          )}
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
  // Switch is always display-only — the row itself handles the tap to avoid
  // Android's Switch double-fire bug when value doesn't update immediately.
  const handlePress = toggle
    ? () => onToggle?.(!toggleValue)
    : onPress;

  return (
    <TouchableOpacity
      style={[styles.settingRow, !isLast && styles.settingDivider]}
      onPress={handlePress}
      disabled={!handlePress}
      activeOpacity={0.75}
    >
      <View style={[styles.settingIcon, destructive && { backgroundColor: colors.redBg }]}>
        <Ionicons name={icon} size={16} color={destructive ? colors.red : colors.text2} />
      </View>
      <Text style={[styles.settingLabel, destructive && { color: colors.red }]}>{label}</Text>
      <View style={{ flex: 1 }} />
      {value ? <Text style={styles.settingValue}>{value}</Text> : null}
      {toggle ? (
        <View pointerEvents="none">
          <Switch
            value={toggleValue}
            onValueChange={undefined}
            trackColor={{ false: colors.border2, true: colors.green }}
            thumbColor={colors.bg}
          />
        </View>
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
  const isPro = useSubscriptionStore((s) => s.isPro());
  const loadFinancing = useFinancingStore((s) => s.load);

  const [platforms, setPlatforms] = useState<IntegrationStatus[]>([]);
  const [connectPlatform, setConnectPlatform] = useState<'UBER' | 'NOVENTA_E_NOVE' | null>(null);
  const [disconnectPlatform, setDisconnectPlatform] = useState<'UBER' | 'NOVENTA_E_NOVE' | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [alertPrefs, setAlertPrefs] = useState<AlertPreference[]>([]);
  const [vehicle, setVehicle] = useState<VehicleData | null>(null);

  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);
  const [financingModalVisible, setFinancingModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [changePhoneVisible, setChangePhoneVisible] = useState(false);

  const reloadIntegrations = useCallback(() => {
    integrationsService.status().then((res) => setPlatforms(res.integrations)).catch(() => {});
  }, []);

  // Reload integrations every time this screen comes into focus
  useFocusEffect(useCallback(() => {
    reloadIntegrations();
  }, [reloadIntegrations]));

  useEffect(() => {
    loadSubscription();
    alertsService.getPreferences().then((res) => setAlertPrefs(res.preferences)).catch(() => {});
    vehiclesService.getVehicle().then(setVehicle).catch(() => {});
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
      setDisconnectPlatform(platform);
    }
  }

  async function handleConfirmDisconnect() {
    if (!disconnectPlatform) return;
    setDisconnecting(true);
    try {
      await integrationsService.disconnect(disconnectPlatform);
      setDisconnectPlatform(null);
      reloadIntegrations();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const msg = status ? `Erro ${status} ao desconectar.` : 'Servidor inacessível.';
      Alert.alert('Erro', msg);
    } finally {
      setDisconnecting(false);
    }
  }

  function handleConnectSuccess(platform: 'UBER' | 'NOVENTA_E_NOVE') {
    reloadIntegrations();
    // Dispara sync imediato; HomeScreen detecta RUNNING/SUCCESS via polling
    integrationsService.triggerSync(platform).catch(() => {});
  }

  function getAlertEnabled(type: string): boolean {
    return alertPrefs.find((p) => p.type === type)?.enabled ?? true;
  }

  async function handleToggleAlert(type: string, enabled: boolean) {
    const prev = [...alertPrefs];
    setAlertPrefs((prefs) => {
      const existing = prefs.find((p) => p.type === type);
      if (existing) return prefs.map((p) => p.type === type ? { ...p, enabled } : p);
      return [...prefs, { type, enabled }];
    });
    try {
      await alertsService.updatePreference(type, enabled);
    } catch {
      setAlertPrefs(prev);
    }
  }

  function handleCancelSubscription() {
    const accessUntil = renewalDate ?? 'a data atual';
    Alert.alert(
      'Cancelar assinatura?',
      `Você continuará com acesso Premium até ${accessUntil}.`,
      [
        { text: 'Manter assinatura', style: 'cancel' },
        {
          text: 'Cancelar mesmo assim', style: 'destructive',
          onPress: async () => {
            try {
              await subscriptionsService.cancel();
              await loadSubscription();
            } catch {
              Alert.alert('Erro', 'Não foi possível cancelar. Tente novamente.');
            }
          },
        },
      ],
    );
  }

  async function handleSupport() {
    try {
      await Linking.openURL(WHATSAPP_URL);
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
    }
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Avatar + name */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitial}>{user?.name?.charAt(0).toUpperCase() ?? 'M'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{user?.name ?? 'Motorista'}</Text>
          <View style={styles.planRow}>
            <Badge variant={isPro ? 'green' : 'blue'} label={isPro ? 'Pro' : 'Gratuito'} />
            {trialDaysLeft !== null && trialDaysLeft > 0 && (
              <Text style={styles.trialText}>Trial · {trialDaysLeft} dias restantes</Text>
            )}
          </View>
        </View>
      </View>

      {trialDaysLeft !== null && trialDaysLeft <= 3 && trialDaysLeft > 0 && (
        <AlertBox variant="amber" message={`Seu trial expira em ${trialDaysLeft} dia(s). Assine para manter o acesso.`} style={{ marginBottom: 8 }} />
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
              <SettingRow icon="calendar-outline" label="Renovação em" value={renewalDate} onPress={() => {}} />
            )}
            <SettingRow
              icon="close-circle-outline"
              label="Cancelar assinatura"
              onPress={handleCancelSubscription}
              isLast
              destructive
            />
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
          label={vehicle?.model ?? 'Adicionar veículo'}
          value={vehicle?.plate}
          onPress={() => setVehicleModalVisible(true)}
        />
        <SettingRow
          icon="speedometer-outline"
          label="Consumo médio"
          value={vehicle ? `${String(vehicle.fuel_efficiency).replace('.', ',')} km/L` : '—'}
          onPress={() => setVehicleModalVisible(true)}
          isLast
        />
      </Card>

      {/* Financing */}
      <Text style={styles.sectionLabel}>Financiamento</Text>
      <Card>
        <SettingRow icon="cash-outline" label="Editar dados do financiamento" onPress={() => setFinancingModalVisible(true)} isLast />
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
      <Text style={styles.sectionLabel}>Notificações</Text>
      <Card>
        <SettingRow
          icon="notifications-outline"
          label="Alertas de meta"
          toggle
          toggleValue={getAlertEnabled('GOAL_REACHED')}
          onToggle={(v) => handleToggleAlert('GOAL_REACHED', v)}
        />
        <SettingRow
          icon="warning-outline"
          label="Risco de parcela"
          toggle
          toggleValue={getAlertEnabled('INSTALLMENT_DUE')}
          onToggle={(v) => handleToggleAlert('INSTALLMENT_DUE', v)}
        />
        <SettingRow
          icon="finger-print-outline"
          label="Biometria"
          toggle
          toggleValue={biometryEnabled}
          onToggle={setBiometryEnabled}
          isLast
        />
      </Card>

      {/* Account */}
      <Text style={styles.sectionLabel}>Conta</Text>
      <Card>
        <SettingRow icon="person-outline" label="Editar perfil" onPress={() => setEditProfileVisible(true)} />
        <SettingRow icon="lock-closed-outline" label="Alterar senha" onPress={() => setChangePasswordVisible(true)} />
        <SettingRow icon="call-outline" label="Alterar telefone" onPress={() => setChangePhoneVisible(true)} />
        <SettingRow icon="help-circle-outline" label="Suporte via WhatsApp" onPress={handleSupport} />
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
        <SettingRow icon="trash-outline" label="Excluir conta" onPress={() => setDeleteModalVisible(true)} isLast destructive />
      </Card>

      <View style={{ height: 40 }} />

      <EditVehicleModal
        visible={vehicleModalVisible}
        onClose={() => setVehicleModalVisible(false)}
        onSaved={(v) => { setVehicle(v); setVehicleModalVisible(false); }}
      />
      <EditFinancingModal
        visible={financingModalVisible}
        onClose={() => setFinancingModalVisible(false)}
        onSaved={() => { loadFinancing(); setFinancingModalVisible(false); }}
      />
      <DeleteAccountModal visible={deleteModalVisible} onClose={() => setDeleteModalVisible(false)} />
      <ConnectPlatformModal
        platform={connectPlatform}
        onClose={() => setConnectPlatform(null)}
        onSuccess={handleConnectSuccess}
      />
      <EditProfileModal visible={editProfileVisible} onClose={() => setEditProfileVisible(false)} />
      <ChangePasswordModal visible={changePasswordVisible} onClose={() => setChangePasswordVisible(false)} />
      <ChangePhoneModal visible={changePhoneVisible} onClose={() => setChangePhoneVisible(false)} />

      {/* Disconnect confirmation modal — replaces Alert.alert for web+native compat */}
      <Modal visible={!!disconnectPlatform} transparent animationType="fade" onRequestClose={() => setDisconnectPlatform(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', paddingHorizontal: 32 }}>
          <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, padding: 24 }}>
            <Text style={{ fontFamily: 'SpaceGrotesk', fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 8 }}>
              Desconectar {PLATFORM_LABEL[disconnectPlatform ?? 'UBER']}?
            </Text>
            <Text style={{ ...typography.small, color: colors.text2, marginBottom: 20 }}>
              Seu histórico de corridas será mantido.
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: colors.red, borderRadius: radius.sm, paddingVertical: 13, alignItems: 'center', marginBottom: 10 }}
              onPress={handleConfirmDisconnect}
              disabled={disconnecting}
              activeOpacity={0.85}
            >
              {disconnecting
                ? <ActivityIndicator color={colors.bg} size="small" />
                : <Text style={{ fontFamily: 'SpaceGrotesk', fontSize: 15, fontWeight: '700', color: colors.bg }}>Desconectar</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={{ paddingVertical: 13, alignItems: 'center' }}
              onPress={() => setDisconnectPlatform(null)}
              activeOpacity={0.75}
            >
              <Text style={{ ...typography.label, color: colors.text2 }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, gap: 12 },
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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
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
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', marginTop: 20,
  },
  saveBtnText: { fontFamily: 'SpaceGrotesk', fontSize: 15, fontWeight: '700', color: colors.bg },
});
