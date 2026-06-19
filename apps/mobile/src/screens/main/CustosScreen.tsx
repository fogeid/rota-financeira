import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, KeyboardAvoidingView, Platform, Animated, Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { colors, spacing, typography, radius } from '../../theme';
import {
  HeroCard, MetricCard, MetricGrid, Card, ListItem, AlertBox, FAB,
  SkeletonHeroCard, SkeletonMetricGrid, SkeletonListItem,
  FormInput, Chip, ConfirmButton,
} from '../../components';
import { useCostsStore } from '../../store/costsStore';
import { formatCurrency } from '../../utils/formatters';
import { toNumber, formatNumber } from '../../utils/numbers';
import type { CostItem, CostType } from '../../types/api';

// ─── Helpers ────────────────────────────────────────────────────────────────

const COST_TYPE_LABELS: Record<CostType, string> = {
  FUEL: 'Abastecimento',
  MAINTENANCE: 'Manutenção',
  CAR_WASH: 'Lavagem',
  OTHER: 'Outro',
};

const COST_TYPE_ICONS: Record<CostType, React.ComponentProps<typeof Ionicons>['name']> = {
  FUEL: 'car-outline',
  MAINTENANCE: 'build-outline',
  CAR_WASH: 'water-outline',
  OTHER: 'ellipsis-horizontal-outline',
};

const COST_TYPE_COLORS: Record<CostType, string> = {
  FUEL: colors.amber,
  MAINTENANCE: colors.blue,
  CAR_WASH: colors.green,
  OTHER: colors.text2,
};

function costIcon(type: CostType) {
  return (
    <View style={[styles.costIconWrap, { backgroundColor: COST_TYPE_COLORS[type] + '20' }]}>
      <Ionicons name={COST_TYPE_ICONS[type]} size={16} color={COST_TYPE_COLORS[type]} />
    </View>
  );
}

// ─── Forms by type ──────────────────────────────────────────────────────────

const fuelSchema = z.object({
  gas_station: z.string().min(1, 'Informe o posto'),
  liters: z.string().min(1, 'Informe os litros'),
  price_per_liter: z.string().min(1, 'Informe o preço/litro'),
  odometer_km: z.string().optional(),
});
type FuelForm = z.infer<typeof fuelSchema>;

const maintenanceSchema = z.object({
  amount: z.string().min(1, 'Informe o valor'),
  description: z.string().min(1, 'Informe o serviço'),
  current_odometer_km: z.string().optional(),
  next_service_km: z.string().optional(),
});
type MaintenanceForm = z.infer<typeof maintenanceSchema>;

const simpleSchema = z.object({
  amount: z.string().min(1, 'Informe o valor'),
  description: z.string().optional(),
});
type SimpleForm = z.infer<typeof simpleSchema>;

// ─── Step 2 — type-specific forms ───────────────────────────────────────────

function FuelFormFields({ control, errors }: { control: any; errors: any }) {
  return (
    <>
      <Controller control={control} name="gas_station" render={({ field: { onChange, value } }) => (
        <FormInput label="Posto" placeholder="Nome do posto" value={value} onChangeText={onChange} error={errors.gas_station?.message} />
      )} />
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Controller control={control} name="liters" render={({ field: { onChange, value } }) => (
            <FormInput label="Litros" placeholder="40,0" keyboardType="numeric" value={value} onChangeText={onChange} error={errors.liters?.message} />
          )} />
        </View>
        <View style={{ flex: 1 }}>
          <Controller control={control} name="price_per_liter" render={({ field: { onChange, value } }) => (
            <FormInput label="R$/litro" placeholder="5,90" keyboardType="numeric" value={value} onChangeText={onChange} error={errors.price_per_liter?.message} />
          )} />
        </View>
      </View>
      <Controller control={control} name="odometer_km" render={({ field: { onChange, value } }) => (
        <FormInput label="Odômetro (km)" placeholder="48.320" keyboardType="numeric" value={value ?? ''} onChangeText={onChange} />
      )} />
    </>
  );
}

function MaintenanceFormFields({ control, errors }: { control: any; errors: any }) {
  return (
    <>
      <Controller control={control} name="description" render={({ field: { onChange, value } }) => (
        <FormInput label="Serviço" placeholder="Ex: Troca de óleo" value={value} onChangeText={onChange} error={errors.description?.message} />
      )} />
      <Controller control={control} name="amount" render={({ field: { onChange, value } }) => (
        <FormInput label="Valor (R$)" placeholder="0,00" keyboardType="numeric" value={value} onChangeText={onChange} error={errors.amount?.message} />
      )} />
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Controller control={control} name="current_odometer_km" render={({ field: { onChange, value } }) => (
            <FormInput label="Odômetro atual" placeholder="48.000" keyboardType="numeric" value={value ?? ''} onChangeText={onChange} />
          )} />
        </View>
        <View style={{ flex: 1 }}>
          <Controller control={control} name="next_service_km" render={({ field: { onChange, value } }) => (
            <FormInput label="Próxima revisão" placeholder="53.000" keyboardType="numeric" value={value ?? ''} onChangeText={onChange} />
          )} />
        </View>
      </View>
    </>
  );
}

function SimpleFormFields({ control, errors, label }: { control: any; errors: any; label?: string }) {
  return (
    <>
      <Controller control={control} name="amount" render={({ field: { onChange, value } }) => (
        <FormInput label="Valor (R$)" placeholder="0,00" keyboardType="numeric" value={value} onChangeText={onChange} error={errors.amount?.message} />
      )} />
      <Controller control={control} name="description" render={({ field: { onChange, value } }) => (
        <FormInput label={label ?? 'Descrição (opcional)'} placeholder="Ex: Lavagem simples" value={value ?? ''} onChangeText={onChange} />
      )} />
    </>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

type SheetStep = 1 | 2 | 3;

export function CustosScreen() {
  const { items, summary, isLoading, error, load, addCost } = useCostsStore();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [step, setStep] = useState<SheetStep>(1);
  const [selectedType, setSelectedType] = useState<CostType>('FUEL');

  const fuelForm = useForm<FuelForm>({
    resolver: zodResolver(fuelSchema),
    defaultValues: { gas_station: '', liters: '', price_per_liter: '', odometer_km: '' },
  });
  const maintenanceForm = useForm<MaintenanceForm>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: { amount: '', description: '', current_odometer_km: '', next_service_km: '' },
  });
  const simpleForm = useForm<SimpleForm>({
    resolver: zodResolver(simpleSchema),
    defaultValues: { amount: '', description: '' },
  });

  useEffect(() => {
    load();
  }, []);

  function openSheet() {
    setStep(1);
    setSheetVisible(true);
    fuelForm.reset();
    maintenanceForm.reset();
    simpleForm.reset();
  }

  function closeSheet() {
    setSheetVisible(false);
  }

  async function submitFuel(data: FuelForm) {
    const liters = parseFloat(data.liters.replace(',', '.'));
    const price = parseFloat(data.price_per_liter.replace(',', '.'));
    await addCost({
      type: 'FUEL',
      amount: liters * price,
      cost_date: new Date().toISOString().slice(0, 10),
      fuel_log: {
        gas_station: data.gas_station,
        liters,
        price_per_liter: price,
        odometer_km: parseInt(data.odometer_km ?? '0') || 0,
      },
    });
    setStep(3);
  }

  async function submitMaintenance(data: MaintenanceForm) {
    await addCost({
      type: 'MAINTENANCE',
      amount: parseFloat(data.amount.replace(',', '.')),
      description: data.description,
      cost_date: new Date().toISOString().slice(0, 10),
      maintenance_log: {
        service_type: data.description,
        current_odometer_km: parseInt(data.current_odometer_km ?? '0') || 0,
        next_service_km: parseInt(data.next_service_km ?? '0') || 0,
        reminder_enabled: !!(data.next_service_km),
      },
    });
    setStep(3);
  }

  async function submitSimple(data: SimpleForm) {
    await addCost({
      type: selectedType,
      amount: parseFloat(data.amount.replace(',', '.')),
      description: data.description,
      cost_date: new Date().toISOString().slice(0, 10),
    });
    setStep(3);
  }

  const fuelItems = items.filter((c) => c.type === 'FUEL');
  const maintenanceItems = items.filter((c) => c.type === 'MAINTENANCE');

  return (
    <View style={styles.flex}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {error ? <AlertBox variant="red" message={error} style={{ marginBottom: spacing.md }} /> : null}

        {isLoading || !summary ? (
          <SkeletonHeroCard />
        ) : (
          <HeroCard
            label="Total custos do mês"
            value={`- ${formatCurrency(summary.total)}`}
            sub={`${toNumber(summary.km_driven).toLocaleString('pt-BR')} km · custo/km: R$ ${formatNumber(summary.cost_per_km)}`}
            variant="negative"
          />
        )}

        {isLoading || !summary ? (
          <SkeletonMetricGrid />
        ) : (
          <MetricGrid>
            <MetricCard
              label="Combustível"
              value={formatCurrency(summary.by_type.FUEL?.total ?? 0)}
              sub={`${formatNumber(summary.by_type.FUEL?.percentage, 0)}% dos custos`}
            />
            <MetricCard
              label="Manutenção"
              value={formatCurrency(summary.by_type.MAINTENANCE?.total ?? 0)}
              sub={`${formatNumber(summary.by_type.MAINTENANCE?.percentage, 0)}% dos custos`}
            />
            <MetricCard
              label="Km rodados"
              value={`${summary.km_driven.toLocaleString('pt-BR')} km`}
              sub="Este mês"
            />
            <MetricCard
              label="Lavagens"
              value={formatCurrency(summary.by_type.CAR_WASH?.total ?? 0)}
              sub={`${fuelItems.length + maintenanceItems.length + items.filter(c => c.type === 'CAR_WASH').length} registros`}
            />
          </MetricGrid>
        )}

        {summary?.alert && (
          <AlertBox variant="amber" message={summary.alert.message} />
        )}

        {/* Abastecimentos */}
        <Text style={styles.sectionLabel}>Abastecimentos</Text>
        <Card>
          {isLoading ? (
            <SkeletonListItem count={2} />
          ) : fuelItems.length === 0 ? (
            <EmptyState icon="car-outline" title="Nenhum abastecimento" sub="Registre seu primeiro abastecimento" onPress={openSheet} />
          ) : (
            fuelItems.map((item, i) => (
              <ListItem
                key={item.id}
                icon={costIcon('FUEL')}
                name={item.fuel_log?.gas_station ?? 'Abastecimento'}
                sub={`${formatNumber(item.fuel_log?.liters, 1)}L · R$ ${formatNumber(item.fuel_log?.price_per_liter)}/L`}
                value={`- ${formatCurrency(item.amount)}`}
                valueColor={colors.red}
                isLast={i === fuelItems.length - 1}
              />
            ))
          )}
        </Card>

        {/* Manutenções */}
        <Text style={styles.sectionLabel}>Manutenções</Text>
        <Card>
          {isLoading ? (
            <SkeletonListItem count={2} />
          ) : maintenanceItems.length === 0 ? (
            <EmptyState icon="build-outline" title="Nenhuma manutenção" sub="Registre suas manutenções" onPress={openSheet} />
          ) : (
            maintenanceItems.map((item, i) => (
              <ListItem
                key={item.id}
                icon={costIcon('MAINTENANCE')}
                name={item.maintenance_log?.service_type ?? item.description ?? 'Manutenção'}
                sub={item.maintenance_log ? `${item.maintenance_log.current_odometer_km.toLocaleString('pt-BR')} km atual` : ''}
                value={`- ${formatCurrency(item.amount)}`}
                valueColor={colors.red}
                isLast={i === maintenanceItems.length - 1}
              />
            ))
          )}
        </Card>

        <View style={{ height: 80 }} />
      </ScrollView>

      <FAB onPress={openSheet} />

      {/* Bottom Sheet — 3 steps */}
      <Modal visible={sheetVisible} transparent animationType="slide" onRequestClose={closeSheet}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={styles.modalBackdrop} onPress={closeSheet} />
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />

              {/* Step 1: select type */}
              {step === 1 && (
                <>
                  <Text style={styles.modalTitle}>Tipo de gasto</Text>
                  <View style={styles.typeGrid}>
                    {(Object.keys(COST_TYPE_LABELS) as CostType[]).map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[styles.typeBtn, selectedType === type && styles.typeBtnActive]}
                        onPress={() => { setSelectedType(type); setStep(2); }}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={COST_TYPE_ICONS[type]}
                          size={24}
                          color={selectedType === type ? colors.green : colors.text2}
                        />
                        <Text style={[styles.typeBtnText, selectedType === type && { color: colors.green }]}>
                          {COST_TYPE_LABELS[type]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Step 2: fill form */}
              {step === 2 && (
                <>
                  <View style={styles.stepHeader}>
                    <TouchableOpacity onPress={() => setStep(1)}>
                      <Ionicons name="arrow-back" size={22} color={colors.text2} />
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>{COST_TYPE_LABELS[selectedType]}</Text>
                  </View>

                  {selectedType === 'FUEL' && (
                    <FuelFormFields control={fuelForm.control} errors={fuelForm.formState.errors} />
                  )}
                  {selectedType === 'MAINTENANCE' && (
                    <MaintenanceFormFields control={maintenanceForm.control} errors={maintenanceForm.formState.errors} />
                  )}
                  {(selectedType === 'CAR_WASH' || selectedType === 'OTHER') && (
                    <SimpleFormFields
                      control={simpleForm.control}
                      errors={simpleForm.formState.errors}
                      label={selectedType === 'OTHER' ? 'Categoria' : undefined}
                    />
                  )}

                  <ConfirmButton
                    label="Registrar gasto"
                    onPress={
                      selectedType === 'FUEL'
                        ? fuelForm.handleSubmit(submitFuel)
                        : selectedType === 'MAINTENANCE'
                        ? maintenanceForm.handleSubmit(submitMaintenance)
                        : simpleForm.handleSubmit(submitSimple)
                    }
                    style={{ marginTop: 12 }}
                  />
                </>
              )}

              {/* Step 3: success */}
              {step === 3 && (
                <View style={styles.successStep}>
                  <View style={styles.successIcon}>
                    <Ionicons name="checkmark" size={32} color={colors.green} />
                  </View>
                  <Text style={styles.successTitle}>Gasto registrado!</Text>
                  <Text style={styles.successSub}>Seu custo foi adicionado ao histórico deste mês.</Text>
                  <View style={{ gap: 10, width: '100%', marginTop: 24 }}>
                    <ConfirmButton label="Registrar outro" onPress={() => { setStep(1); fuelForm.reset(); maintenanceForm.reset(); simpleForm.reset(); }} />
                    <TouchableOpacity style={styles.doneBtn} onPress={closeSheet}>
                      <Text style={styles.doneBtnText}>Fechar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function EmptyState({ icon, title, sub, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; sub: string; onPress: () => void }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon} size={32} color={colors.text3} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { padding: spacing.xl, paddingTop: 16 },
  sectionLabel: {
    ...typography.micro,
    color: colors.text3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 20,
  },
  costIconWrap: {
    width: 36, height: 36, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  row: { flexDirection: 'row', gap: 10 },
  emptyState: { alignItems: 'center', paddingVertical: 20, gap: 6 },
  emptyTitle: { ...typography.label, color: colors.text, fontWeight: '600' },
  emptySub: { ...typography.small, color: colors.text2, textAlign: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: {
    backgroundColor: colors.bg2,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderTopWidth: 1, borderColor: colors.border2,
    padding: 22, paddingBottom: 40,
  },
  modalHandle: {
    width: 36, height: 4, backgroundColor: colors.border2,
    borderRadius: 99, alignSelf: 'center', marginBottom: 16,
  },
  modalTitle: {
    fontFamily: 'SpaceGrotesk', fontSize: 18, fontWeight: '700',
    color: colors.text, marginBottom: 20,
  },
  stepHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20,
  },
  typeGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
  },
  typeBtn: {
    width: '47%', backgroundColor: colors.bg3,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: 16,
    alignItems: 'center', gap: 8,
  },
  typeBtnActive: { backgroundColor: colors.greenBg, borderColor: colors.greenBorder },
  typeBtnText: { ...typography.label, color: colors.text2 },
  successStep: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  successIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.greenBg, borderWidth: 1, borderColor: colors.greenBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  successTitle: {
    fontFamily: 'SpaceGrotesk', fontSize: 22, fontWeight: '700', color: colors.text,
  },
  successSub: { ...typography.label, color: colors.text2, textAlign: 'center' },
  doneBtn: {
    backgroundColor: colors.bg3, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, paddingVertical: 14, alignItems: 'center',
  },
  doneBtnText: { ...typography.label, color: colors.text2 },
});
