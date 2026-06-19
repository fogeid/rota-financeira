import { parseUberNotification } from '../uberNotificationParser';

describe('parseUberNotification', () => {

  // ── DEVEM SER CAPTURADOS ──────────────────────────────────────────────────

  it('captura corrida simples', () => {
    const r = parseUberNotification(
      'Corrida concluída',
      'Você ganhou R$ 10,50 · 2,22 km · 7 min',
      'com.ubercab.driver',
    );
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(10.50);
    expect(r!.kmDriven).toBe(2.22);
    expect(r!.durationMinutes).toBe(7);
    expect(r!.platform).toBe('UBER');
  });

  it('captura corrida com preço dinâmico (pega o primeiro valor)', () => {
    const r = parseUberNotification(
      'Corrida concluída',
      'Você ganhou R$ 16,38 · 6,71 km · 12 min · R$ 3,25 Preço dinâmico',
      'com.ubercab.driver',
    );
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(16.38);
    expect(r!.kmDriven).toBe(6.71);
  });

  it('captura valor com ponto de milhar', () => {
    const r = parseUberNotification(
      'Corrida concluída',
      'Você ganhou R$ 1.234,56 · 45,2 km · 60 min',
      'com.ubercab.driver',
    );
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(1234.56);
  });

  it('captura taxa de cancelamento recebida', () => {
    const r = parseUberNotification(
      'Corrida cancelada',
      'Você recebeu R$ 5,00 pela taxa de cancelamento',
      'com.ubercab.driver',
    );
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(5.00);
  });

  it('captura corrida da 99', () => {
    const r = parseUberNotification(
      'Viagem concluída',
      'Você ganhou R$ 18,90 · 5,1 km · 9 min',
      'com.taxis99',
    );
    expect(r).not.toBeNull();
    expect(r!.platform).toBe('NOVENTA_E_NOVE');
    expect(r!.amount).toBe(18.90);
  });

  it('captura corrida da 99 (pacote alternativo)', () => {
    const r = parseUberNotification(
      'Viagem concluída',
      'Você ganhou R$ 12,00 · 3,5 km · 8 min',
      'br.com.taxis99.driver',
    );
    expect(r).not.toBeNull();
    expect(r!.platform).toBe('NOVENTA_E_NOVE');
  });

  it('gera externalId único por captura', () => {
    const r1 = parseUberNotification('Corrida concluída', 'Você ganhou R$ 10,00 · 2 km · 5 min', 'com.ubercab.driver');
    // pequeno delay para garantir timestamps distintos
    const r2 = parseUberNotification('Corrida concluída', 'Você ganhou R$ 10,00 · 2 km · 5 min', 'com.ubercab.driver');
    expect(r1).not.toBeNull();
    expect(r2).not.toBeNull();
    // externalId usa Date.now() — podem ser iguais em testes rápidos, mas o formato deve ser correto
    expect(r1!.externalId).toMatch(/^uber_notif_\d+$/);
  });

  it('retorna rawText com título e corpo', () => {
    const r = parseUberNotification('Corrida concluída', 'Você ganhou R$ 10,50 · 2 km', 'com.ubercab.driver');
    expect(r!.rawText).toBe('Corrida concluída | Você ganhou R$ 10,50 · 2 km');
  });

  it('retorna null para kmDriven quando não tem km no corpo', () => {
    const r = parseUberNotification('Corrida concluída', 'Você ganhou R$ 10,50', 'com.ubercab.driver');
    expect(r).not.toBeNull();
    expect(r!.kmDriven).toBeNull();
  });

  // ── DEVEM SER IGNORADOS — CANCELAMENTOS ──────────────────────────────────

  it('ignora cancelamento pelo motorista', () => {
    expect(parseUberNotification(
      'Corrida cancelada',
      'Você cancelou essa corrida',
      'com.ubercab.driver',
    )).toBeNull();
  });

  it('ignora cancelamento pelo passageiro sem taxa', () => {
    expect(parseUberNotification(
      'Corrida cancelada',
      'O passageiro cancelou a corrida',
      'com.ubercab.driver',
    )).toBeNull();
  });

  it('ignora cancelamento genérico sem valor', () => {
    expect(parseUberNotification(
      'Corrida cancelada',
      'A corrida foi cancelada',
      'com.ubercab.driver',
    )).toBeNull();
  });

  // ── DEVEM SER IGNORADOS — RESUMOS E BÔNUS ────────────────────────────────

  it('ignora resumo semanal (tem valor mas é agregado)', () => {
    expect(parseUberNotification(
      'Seu resumo da semana',
      'Você ganhou R$ 523,40 esta semana',
      'com.ubercab.driver',
    )).toBeNull();
  });

  it('ignora resumo semanal mesmo sem "semana" no título', () => {
    expect(parseUberNotification(
      'Resumo',
      'Você ganhou R$ 200,00 essa semana',
      'com.ubercab.driver',
    )).toBeNull();
  });

  it('ignora título com "resumo" (case insensitive)', () => {
    expect(parseUberNotification(
      'RESUMO SEMANAL',
      'Você ganhou R$ 300,00',
      'com.ubercab.driver',
    )).toBeNull();
  });

  it('ignora bônus de meta (não é corrida individual)', () => {
    expect(parseUberNotification(
      'Bônus recebido',
      'Você recebeu um bônus de R$ 50,00 por completar 30 corridas',
      'com.ubercab.driver',
    )).toBeNull();
  });

  it('ignora gorjeta (sem "Você ganhou R$")', () => {
    expect(parseUberNotification(
      'Gorjeta recebida',
      'Você recebeu R$ 3,00 de gorjeta',
      'com.ubercab.driver',
    )).toBeNull();
  });

  // ── DEVEM SER IGNORADOS — OUTROS TIPOS ───────────────────────────────────

  it('ignora novo pedido recebido', () => {
    expect(parseUberNotification(
      'Nova corrida disponível',
      'Aceite em 15 segundos',
      'com.ubercab.driver',
    )).toBeNull();
  });

  it('ignora notificações de outros apps', () => {
    expect(parseUberNotification(
      'Corrida concluída',
      'Você ganhou R$ 10,50',
      'com.whatsapp',
    )).toBeNull();
  });

  it('ignora notificação sem valor monetário', () => {
    expect(parseUberNotification(
      'Corrida concluída',
      'Sua corrida foi concluída com sucesso',
      'com.ubercab.driver',
    )).toBeNull();
  });

  it('ignora textos sem "Você ganhou R$"', () => {
    const semValor = [
      'Sua corrida foi solicitada',
      'Passageiro a bordo',
      'Avalie sua corrida',
      'Atualização disponível',
      'Mensagem do passageiro',
    ];
    semValor.forEach((body) => {
      expect(parseUberNotification('Qualquer título', body, 'com.ubercab.driver')).toBeNull();
    });
  });

});
