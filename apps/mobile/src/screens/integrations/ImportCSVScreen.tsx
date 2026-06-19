import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import { AlertBox, ConfirmButton, Card } from '../../components';
import { integrationsService } from '../../services/integrationsService';

const PLATFORM_LABEL: Record<string, string> = {
  UBER: 'Uber',
  NOVENTA_E_NOVE: '99',
};

const PLATFORM_URL: Record<string, string> = {
  UBER: 'uber.com/br/drive',
  NOVENTA_E_NOVE: '99app.com/motorista',
};

type ImportResult = { imported: number; skipped: number };

export function ImportCSVScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { platform } = route.params as { platform: string };

  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const platformName = PLATFORM_LABEL[platform] ?? platform;
  const platformUrl = PLATFORM_URL[platform] ?? '';

  async function pickAndImport() {
    setError(null);
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', '*/*'],
        copyToCacheDirectory: true,
      });

      if (picked.canceled || !picked.assets?.length) return;

      const asset = picked.assets[0];

      if (!asset.name.toLowerCase().endsWith('.csv')) {
        setError('Por favor selecione um arquivo .csv');
        return;
      }

      setImporting(true);
      const data = await integrationsService.importCSV(platform, asset.uri, asset.name);
      setResult({ imported: data.imported, skipped: data.skipped });
      Alert.alert('Sucesso', `${data.imported} corridas importadas com sucesso!`);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 400) {
        setError('Arquivo inválido ou formato não reconhecido.');
      } else if (status === 422) {
        setError('O CSV não tem as colunas esperadas. Exporte direto do app ou site oficial.');
      } else if (!status) {
        setError('Não foi possível conectar ao servidor. Verifique sua conexão.');
      } else {
        setError(`Erro ao importar (${status}). Tente novamente.`);
      }
    } finally {
      setImporting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Importar histórico do {platformName}</Text>
      <Text style={styles.subtitle}>
        Importe suas corridas reais para ver seus ganhos no app
      </Text>

      <Card style={{ marginBottom: spacing.md }}>
        <Text style={styles.stepsTitle}>Como exportar seu histórico:</Text>

        {[
          `Acesse ${platformUrl} no navegador do celular ou computador`,
          'Vá em Histórico ou Atividades',
          'Escolha o período e toque em Exportar',
          'Selecione o arquivo CSV baixado aqui abaixo',
        ].map((text, i) => (
          <View key={i} style={styles.step}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepNumber}>{i + 1}</Text>
            </View>
            <Text style={styles.stepText}>{text}</Text>
          </View>
        ))}
      </Card>

      {error ? (
        <AlertBox variant="red" message={error} style={{ marginBottom: spacing.md }} />
      ) : null}

      {result ? (
        <AlertBox
          variant="green"
          message={
            `${result.imported} corridas importadas com sucesso!` +
            (result.skipped > 0 ? `\n${result.skipped} corrida(s) já existiam e foram ignoradas.` : '')
          }
          style={{ marginBottom: spacing.md }}
        />
      ) : null}

      <ConfirmButton
        label={importing ? 'Importando...' : 'Selecionar arquivo CSV'}
        onPress={pickAndImport}
        loading={importing}
        style={{ marginBottom: 12 }}
      />

      {result ? (
        <ConfirmButton
          label="Ver corridas importadas"
          onPress={() => navigation.navigate('Ganhos' as never)}
          style={{ marginBottom: 12 }}
        />
      ) : null}

      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.skipBtn}>
        <Text style={styles.skipText}>Fazer isso depois</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingBottom: 48 },
  title: {
    fontFamily: 'SpaceGrotesk', fontSize: 22, fontWeight: '700',
    color: colors.text, marginBottom: 6,
  },
  subtitle: { ...typography.label, color: colors.text2, marginBottom: spacing.lg },
  stepsTitle: { ...typography.label, fontWeight: '600', color: colors.text, marginBottom: 12 },
  step: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  stepBadge: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.greenBg, borderWidth: 1, borderColor: colors.greenBorder,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  stepNumber: { fontSize: 12, fontWeight: '600', color: colors.green },
  stepText: { flex: 1, ...typography.small, color: colors.text2, lineHeight: 18 },
  skipBtn: { alignItems: 'center', paddingVertical: 12 },
  skipText: { ...typography.label, color: colors.text3 },
});
