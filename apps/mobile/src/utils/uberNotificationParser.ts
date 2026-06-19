export interface ParsedEarning {
  amount: number;
  kmDriven: number | null;
  durationMinutes: number | null;
  platform: 'UBER' | 'NOVENTA_E_NOVE';
  capturedAt: Date;
  rawText: string;
  externalId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// REGRA CENTRAL: O Uber só usa "Você ganhou R$" quando o motorista
// efetivamente recebeu dinheiro. Esta frase é o filtro principal —
// independente do título, formato ou versão do app.
//
// CAPTURAR:
//   ✅ "Você ganhou R$ 10,50 · 2,22 km · 7 min"
//   ✅ "Você ganhou R$ 16,38 · 6,71 km · R$ 3,25 dinâmico"
//   ✅ "Você recebeu R$ 5,00 pela taxa de cancelamento"
//
// IGNORAR:
//   ❌ "Você cancelou essa corrida"
//   ❌ "O passageiro cancelou a corrida"
//   ❌ "Você ganhou R$ 523,40 esta semana"  (resumo semanal)
//   ❌ "Você recebeu um bônus de R$ 50,00"  (bônus, não corrida)
//   ❌ Notificações de outros apps
// ─────────────────────────────────────────────────────────────────────────────

export function parseUberNotification(
  title: string,
  body: string,
  packageName: string,
): ParsedEarning | null {
  const isUberDriver =
    packageName === 'com.ubercab.driver' || packageName === 'com.ubercab';
  const is99 =
    packageName === 'com.taxis99' || packageName === 'br.com.taxis99.driver';

  if (!isUberDriver && !is99) return null;

  const platform: 'UBER' | 'NOVENTA_E_NOVE' = isUberDriver
    ? 'UBER'
    : 'NOVENTA_E_NOVE';

  // Regra principal: "Você ganhou R$" = motorista recebeu por uma corrida
  const hasDirectEarning = body.includes('Você ganhou R$');

  // Exceção: passageiro cancelou com taxa de cancelamento
  const hasCancellationFee =
    body.includes('taxa de cancelamento') &&
    body.match(/R\$\s*[\d.,]+/) !== null;

  // Bloqueio explícito: resumo semanal (tem valor mas é agregado)
  const isWeeklySummary =
    body.includes('esta semana') ||
    body.includes('essa semana') ||
    title.toLowerCase().includes('resumo');

  if (isWeeklySummary) return null;
  if (!hasDirectEarning && !hasCancellationFee) return null;

  // Parsear valor — primeiro R$ do corpo (para dinâmico, pega o ganho total)
  const amountMatch = body.match(/R\$\s*([\d.,]+)/i);
  if (!amountMatch) return null;

  const amountStr = amountMatch[1]
    .replace(/\./g, '')  // remover ponto de milhar
    .replace(',', '.');  // vírgula → ponto decimal
  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) return null;

  const kmMatch = body.match(/([\d.,]+)\s*km/i);
  const kmDriven = kmMatch
    ? parseFloat(kmMatch[1].replace(',', '.'))
    : null;

  const minMatch = body.match(/(\d+)\s*min/i);
  const durationMinutes = minMatch ? parseInt(minMatch[1]) : null;

  const capturedAt = new Date();
  const externalId = `${platform.toLowerCase()}_notif_${capturedAt.getTime()}`;

  return {
    amount,
    kmDriven,
    durationMinutes,
    platform,
    capturedAt,
    rawText: `${title} | ${body}`,
    externalId,
  };
}

// 99 usa formato similar ao Uber no Brasil
export function parse99Notification(
  title: string,
  body: string,
  packageName: string,
): ParsedEarning | null {
  return parseUberNotification(title, body, packageName);
}
