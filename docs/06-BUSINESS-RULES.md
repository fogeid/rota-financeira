# Rota Financeira — Regras de Negócio

**Versão:** 1.0 | **Data:** Junho 2026
Estas são as fórmulas e lógicas que DEVEM ser implementadas exatamente como descritas. Qualquer desvio precisa de aprovação.

---

## 1. Cálculo da Meta Diária

```
meta_diária = (parcela_mensal + custos_mensais_estimados + renda_desejada) / dias_trabalho_por_mês

Onde:
- parcela_mensal    = valor cadastrado em Financing.monthly_installment
- custos_estimados  = média dos custos dos últimos 3 meses (ou valor cadastrado se <3 meses de histórico)
- renda_desejada    = valor cadastrado em Financing.desired_income
- dias_trabalho     = valor cadastrado em Financing.work_days_per_month

Exemplo:
(R$ 2.500 + R$ 1.500 + R$ 2.000) / 22 = R$ 272,73/dia

Arredondamento: 2 casas decimais, HALF_UP
Recalculada automaticamente sempre que Financing for atualizado
```

---

## 2. Cálculo do Lucro Líquido do Dia

```
lucro_líquido_dia = ganho_bruto_dia - custo_proporcional_dia

Onde:
- ganho_bruto_dia      = soma de Earning.amount onde earned_at = hoje
- custo_proporcional_dia = total_custos_fixos_mês / dias_trabalhados_até_hoje

custo_proporcional_dia detalhe:
- Combustível: alocado no dia do abastecimento (custo real do dia)
- Manutenção: dividida pelos dias do mês (custo/dia = manutenção_mês / 30)
- Outros: alocados no dia do registro
```

---

## 3. Cálculo do Custo por Km

```
custo_por_km = total_combustível_mês / km_rodados_mês

Onde:
- total_combustível_mês = soma de Cost.amount onde type = FUEL e mês = mês atual
- km_rodados_mês        = último odômetro do mês - primeiro odômetro do mês

Se km_rodados_mês = 0 ou não houver abastecimento: exibir "—" (indisponível)
Unidade: R$/km com 2 casas decimais
```

---

## 4. Progresso da Parcela Mensal

```
progresso_parcela = lucros_acumulados_mês / parcela_mensal * 100

Onde:
- lucros_acumulados_mês = soma(lucro_líquido_dia) de todos os dias do mês atual
- parcela_mensal        = Financing.monthly_installment

Resultado: percentual de 0 a 100 (pode ultrapassar 100 se lucro > parcela)
Atualizado: diariamente, após sync das corridas
```

---

## 5. Meta Residual (Dias Restantes)

```
meta_residual_diária = déficit / dias_úteis_restantes

Onde:
- déficit              = parcela_mensal - acumulado_mês (se negativo = superávit)
- dias_úteis_restantes = dias_até_vencimento (não considera domingos no MVP)

Exibida apenas quando déficit > 0
```

---

## 6. Saúde Financeira do Financiamento

```
ratio = parcela_mensal / ganho_bruto_médio_3_meses * 100

Onde:
- ganho_bruto_médio_3_meses = média dos ganhos brutos mensais dos últimos 3 meses
- Se <3 meses de histórico: usar ganho_bruto_mês_atual como estimativa

Classificação:
- VERDE  (HEALTHY):  ratio < 40%  → "Distribuição saudável"
- ÂMBAR  (WARNING):  40% ≤ ratio ≤ 50% → "No limite, fique atento"
- VERMELHO (DANGER): ratio > 50%  → "Carro consome mais de 50% da sua renda"
```

---

## 7. Distribuição dos R$ 100

```
pct_parcela = parcela_mensal / meta_mensal_total * 100
pct_custos  = custos_estimados_mensais / meta_mensal_total * 100
pct_renda   = renda_desejada / meta_mensal_total * 100

Onde: meta_mensal_total = parcela + custos_estimados + renda_desejada
Invariante: pct_parcela + pct_custos + pct_renda = 100% (sempre)
```

---

## 8. Cálculo do IR Mensal (Carnê-Leão 2026)

```
base_cálculo = ganho_bruto_mês - deduções_permitidas

deduções_permitidas = total_combustível_mês + total_manutenção_mês
(Apenas gastos com type FUEL e MAINTENANCE registrados no app)

Tabela progressiva IRPF 2026 (atualizar quando publicada):
Até R$ 2.259,20:    isento (alíquota 0%)
R$ 2.259,21–R$ 2.826,65: 7,5% - dedução R$ 169,44
R$ 2.826,66–R$ 3.751,05: 15%  - dedução R$ 381,44
R$ 3.751,06–R$ 4.664,68: 22,5% - dedução R$ 662,77
Acima de R$ 4.664,68: 27,5% - dedução R$ 896,00

IR_devido = (base_cálculo * alíquota) - dedução_da_faixa

Se IR_devido < 0: IR_devido = 0
Arredondamento: 2 casas decimais, HALF_UP

ATENÇÃO: Este cálculo é uma ESTIMATIVA para orientação do motorista.
Não substitui consultoria contábil profissional. Exibir disclaimer na tela.
```

---

## 9. Projeção do Mês Seguinte

```
Para cada métrica (ganho_bruto, custos, lucro_líquido):
  projeção = média simples dos últimos 3 meses com dados completos

Se menos de 3 meses: usar meses disponíveis
Se nenhum mês anterior: não exibir projeção (exibir "Dados insuficientes")
Exibido como estimativa, não como meta
```

---

## 10. Melhor Horário Histórico

```
Para os últimos 30 dias:
  agrupar corridas por hora de início (0–23h)
  calcular ganho_médio_por_hora = soma(amount) / count(corridas) para cada hora
  melhor_horário = hora com maior ganho_médio_por_hora

Mínimo de 5 corridas na hora para ser elegível
Exibido como: "18h–19h" (faixa de 1 hora)
```

---

## 11. Regras de Alertas

### F65 — Meta batida
```
Condição: lucro_líquido_dia >= meta_diária E alerta não enviado hoje
Horário: verificado a cada hora entre 10h–22h
Envio: apenas 1 vez por dia
```

### F66 — Abaixo do ritmo
```
Condição: projeção_parcela_fim_mês < parcela_mensal E dias_restantes > 5
projeção = (acumulado / dias_trabalhados_mês) * dias_restantes + acumulado
Verificado: diariamente às 20h
Envio: máximo 1 vez a cada 3 dias
```

### F67 — Parcela em risco
```
Condição: déficit > 0 E dias_restantes <= 5
Verificado: diariamente às 08h
Envio: 1 vez por dia enquanto condição persistir
```

### F69 — Custo/km alto
```
Condição: custo_km_atual > média_custo_km_3_meses * 1.10
Verificado: após cada registro de abastecimento
Cooldown: não enviar se já enviou nos últimos 7 dias
```

---

## 12. Lógica de Sync com Plataformas

```
Frequência: diária, às 04h (horário de Brasília)
Janela de retry: 3 tentativas com backoff exponencial (5min, 15min, 45min)
Após 3 falhas: marcar status = FAILED, enviar alerta F73

Deduplicação:
  Para cada corrida importada:
    verificar se existe Earning com (user_id, platform, external_id)
    se existe: ignorar (não criar duplicata)
    se não existe: criar Earning com origin = AUTO_SYNC

Período importado: corridas dos últimos 2 dias (evita perder corridas do dia anterior)
```

---

## 13. Regras de Assinatura

```
Trial:
  - 14 dias a partir do cadastro
  - Acesso completo ao plano Premium
  - Sem necessidade de cartão
  - Alerta 3 dias antes de expirar (F76)
  - Após expirar: downgrade automático para GRATUITO

Plano Gratuito:
  - Histórico limitado a 7 dias (não exclui dados, apenas oculta)
  - Apenas 1 plataforma conectada (a primeira conectada)
  - Sem acesso a: relatório IR, exportar PDF, relatório anual
  - Alertas disponíveis: F65, F68, F72 apenas

Plano Premium:
  - Sem restrições de funcionalidade
  - Histórico completo
  - Todas as plataformas

Falha no pagamento:
  - D+0: primeira tentativa falha → alerta por push e e-mail
  - D+2: segunda tentativa
  - D+4: terceira tentativa
  - D+5: downgrade para GRATUITO, cancelar assinatura ativa
  - Usuário pode reativar a qualquer momento sem perder histórico

Cancelamento:
  - Acesso Premium mantido até current_period_end
  - Após: downgrade para GRATUITO
  - Dados mantidos integralmente
  - Pode reativar a qualquer momento
```

---

## 14. Invariantes do Sistema (NUNCA violar)

1. `pct_parcela + pct_custos + pct_renda = 100%` sempre
2. Lucro líquido PODE ser negativo (dia de prejuízo)
3. Progresso da parcela PODE ultrapassar 100%
4. IR_devido nunca é negativo
5. meta_diária sempre > 0 (validar no cadastro do financiamento)
6. Uma plataforma só pode ter 1 credencial ativa por usuário por vez
7. Refresh token só pode ser usado 1 vez (rotação obrigatória)
8. CPF nunca aparece em logs, nunca é retornado pela API sem mascaramento

---

## 15. Divisão de Funcionalidades por Plano

### Plano Gratuito — acesso sem restrição de dias ou volume

| Funcionalidade | Disponível |
|---------------|-----------|
| Registro manual de corridas | ✅ Sim |
| Registro de custos (todos os tipos) | ✅ Sim |
| Meta diária (definida pelo usuário) | ✅ Sim |
| Lucro diário básico | ✅ Sim |
| Histórico completo | ✅ Sim |
| Cadastro de veículo e financiamento | ✅ Sim |
| Progresso da parcela (cálculo básico) | ✅ Sim |
| Custo/km automático | ❌ Premium |
| Sync automático Uber | ❌ Premium |
| Sync automático 99 | ❌ Premium |
| IA financeira e sugestões | ❌ Premium |
| Alertas inteligentes (push) | ❌ Premium |
| Relatórios em PDF | ❌ Premium |
| Imposto de renda automático | ❌ Premium |
| Reserva automática (cofrinhos) | ❌ Premium |
| Projeções do próximo mês | ❌ Premium |
| Planejamento de troca de veículo | ❌ Premium |

### Plano Premium — R$ 9,90/mês ou R$ 89/ano

Todas as funcionalidades do gratuito, mais todas as marcadas como Premium acima.

### Lógica de bloqueio no app

Quando usuário GRATUITO tenta acessar funcionalidade Premium:
1. A tela/funcionalidade é visível (não escondida)
2. Ao tentar usar: exibir bottom sheet de upgrade
3. Mensagem: "Esta funcionalidade é do Plano Premium por R$ 9,90/mês"
4. CTA: "Assinar Premium" + "Agora não"
5. NUNCA bloquear: histórico, metas manuais, custos, lucro diário

### Trial de 14 dias

- Ativado automaticamente no cadastro
- Acesso completo ao Premium sem cartão
- Countdown visível no perfil
- Alerta push 3 dias antes de expirar
- Após expirar: downgrade automático para Gratuito (dados mantidos)


---

## 16. Regras de Negócio — Programa de Indicação

### 16.1 Nível do indicador e cashback

```
Nível determinado por conversions (total de indicações convertidas em Premium):

conversions 1–14  → INICIANTE  → cashback R$ 5,00
conversions 15–29 → PARCEIRO   → cashback R$ 6,00
conversions 30+   → EMBAIXADOR → cashback R$ 7,00

O valor do cashback é determinado pelo nível DO MOMENTO DA CONVERSÃO.
Se o usuário estava no nível Iniciante quando a conversão aconteceu,
recebe R$ 5,00 — mesmo que suba de nível depois.
```

### 16.2 Fluxo de liberação do cashback

```
1. Webhook payment.paid chega do Pagar.me
2. Backend verifica se o assinante veio por referral_code
3. Se sim: busca o indicador pelo referral_code
4. Calcula cashback conforme nível atual do indicador
5. Incrementa referral_balance.pending += cashback_amount
6. Incrementa referral_balance.total_earned += cashback_amount
7. Incrementa referral_code.conversions += 1
8. Atualiza referral.status = CONVERTED
9. Job D+30: move pending → available
10. Push notification: "R$ X,00 de cashback liberado!"
```

### 16.3 Trial do indicado

```
Usuário cadastra com código/link de indicação:
- Código de motorista (type=USER): trial = 7 dias Premium
- Link de influencer (type=INFLUENCER): trial = 14 dias Premium
- Sem código: trial = 14 dias Premium (padrão)

Verificação no cadastro:
  SE referral_code fornecido:
    buscar ReferralCode pelo code ou slug
    SE encontrado E ativo:
      criar Referral com status=REGISTERED
      incrementar ReferralCode.clicks
      aplicar trial conforme tipo
    SE não encontrado: ignorar, aplicar trial padrão
```

### 16.4 Regras de saque

```
Condições para saque:
  balance.available >= 20.00

Processamento:
  1. Criar ReferralWithdrawal com status=PENDING
  2. Decrementar balance.available -= amount
  3. Incrementar balance.total_withdrawn += amount
  4. Processar PIX via Pagar.me em até 1 dia útil
  5. Atualizar status para PAID ou FAILED
  6. SE FAILED: devolver saldo (available += amount)

Revisão manual automática:
  SE count(withdrawals no mês) > 10: flaggar para revisão antes de processar
```

### 16.5 Comissão de influencers

```
Calculada mensalmente no dia 1 de cada mês:
  active_subscribers = count de assinantes Premium ativos
                       que chegaram pelo link deste influencer

  commission = active_subscribers × commission_rate

  commission_rate por tier:
    MICRO:     R$ 3,00/assinante ativo
    MEDIUM:    R$ 4,00/assinante ativo
    LARGE:     R$ 5,00/assinante ativo
    EXCLUSIVE: negociado

Pagamento:
  - Criado com status=PENDING no dia 1
  - Pago via PIX automático no dia 1 (após D+30 do último pagamento do mês)
  - SE nenhum assinante ativo: comissão = R$ 0,00 (não paga)

Suspensão automática do link:
  SE clicks > 100 E (conversions / clicks) < 0.01 em 30 dias:
    InfluencerProfile.status = SUSPENDED
    notificar equipe para revisão
```

### 16.6 Invariantes do programa (NUNCA violar)

1. Cashback só liberado após `payment.paid` confirmado — nunca antes
2. Um usuário não pode ser indicado por si mesmo (validar user_id != referrer user_id)
3. Um usuário só pode ter 1 código de indicação (unique em user_id)
4. Um usuário indicado só conta uma vez (unique em referred_user_id)
5. Saldo nunca fica negativo (validar antes de decrementar)
6. Comissão de influencer só sobre assinantes ATIVOS no mês de referência
7. Link de influencer suspenso não gera comissão nem trial diferenciado