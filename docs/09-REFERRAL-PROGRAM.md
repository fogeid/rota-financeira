# Rota Financeira — Programa de Indicação (Rota Indica)

**Versão:** 1.0 | **Data:** Junho 2026
**Status:** Aprovado para desenvolvimento

---

## 1. Visão Geral

O Rota Indica é o programa de indicação do app com dois canais distintos:

- **Canal Motorista:** qualquer usuário (gratuito ou Premium) indica amigos e recebe cashback em dinheiro real via PIX
- **Canal Influencer:** criadores de conteúdo aprovados pela equipe recebem comissão recorrente mensal

---

## 2. Canal Motorista

### 2.1 Mecânica

```
Usuário compartilha link/código → Amigo se cadastra → Amigo assina Premium → Usuário recebe cashback
```

- Qualquer usuário cadastrado pode indicar (gratuito ou Premium)
- Cada usuário recebe um **código único de 6 dígitos** gerado no cadastro (ex: CARLOS22)
- Link gerado automaticamente: `rotafinanceira.app/i/[CODIGO]`
- Compartilhamento via WhatsApp, grupos, boca a boca

### 2.2 Recompensas

**Para quem foi indicado (novo usuário):**
- Ganha **7 dias de Premium gratuito** ao cadastrar pelo link/código (em vez do trial padrão de 14 dias)
- Exibição no app: *"Você entrou pelo convite de [Nome] e ganhou 7 dias Premium"*

**Para quem indicou (cashback):**

| Nível | Indicações convertidas | Cashback por conversão |
|-------|----------------------|----------------------|
| Iniciante | 1 – 14 | R$ 5,00 |
| Parceiro | 15 – 29 | R$ 6,00 |
| Embaixador | 30+ | R$ 7,00 |

- Cashback liberado apenas após **pagamento confirmado** pelo webhook do Pagar.me
- Cashback é **único por conversão** (não recorrente)
- Saque via PIX com mínimo de **R$ 20,00** (equivale a 4 indicações no nível Iniciante)
- Sem limite máximo de indicações por usuário

### 2.3 Tela "Rota Indica" no App

Tela acessível pelo menu do perfil ou por banner na home. Contém:

- Saldo atual disponível para saque
- Número de indicações convertidas e nível atual
- Código e link únicos com botão copiar e compartilhar
- Lista de indicações: nome mascarado, status (Cadastrado / Trial / Premium / Inativo)
- Botão "Sacar via PIX" (ativo quando saldo >= R$ 20,00)
- Barra de progresso para o próximo nível

### 2.4 Status de uma indicação

| Status | Significado |
|--------|------------|
| Enviado | Link clicado, usuário ainda não se cadastrou |
| Cadastrado | Amigo criou conta pelo link |
| Trial | Amigo está no período de 7 dias |
| Premium | Amigo assinou — cashback liberado |
| Inativo | Amigo cancelou antes de assinar |

---

## 3. Canal Influencer / Youtuber

### 3.1 Mecânica

```
Influencer aprovado recebe link exclusivo → Divulga para audiência → Assinante vem pelo link → Influencer recebe comissão todo mês enquanto assinante estiver ativo
```

- Acesso apenas mediante **aprovação manual** pela equipe
- Link personalizado com slug do canal: `rotafinanceira.app/i/[nomecanal]`
- Dashboard web exclusivo para acompanhar métricas e pagamentos

### 3.2 Estrutura de comissão

| Porte | Seguidores | Comissão/mês por assinante ativo | Bônus de entrada |
|-------|-----------|----------------------------------|-----------------|
| Micro | 5k – 30k | R$ 3,00 recorrente | Nenhum |
| Médio | 30k – 150k | R$ 4,00 recorrente | R$ 50 após 20 assinantes |
| Grande | 150k+ | R$ 5,00 recorrente | R$ 100 após 30 assinantes |
| Parceria exclusiva | Negociado | R$ 5,00 + % receita | Contrato formal |

- Comissão paga **mensalmente via PIX automático**
- Pagamento apenas de assinantes **ativos** naquele mês
- Se assinante cancelar: para de gerar comissão no mês seguinte
- Comissão só paga após **D+30** do pagamento (proteção contra chargeback)

### 3.3 Trial diferenciado

Usuários que chegam pelo link de influencer ganham **14 dias de Premium** (mesmo trial padrão do app), diferenciando da indicação de motorista que dá 7 dias.

### 3.4 Dashboard Web do Influencer

Página web com login por e-mail e senha, separada do app mobile. Exibe:

- Link exclusivo com botão copiar e QR Code para download
- Cliques no link no período
- Cadastros gerados e taxa de conversão
- Assinantes ativos no mês atual
- Receita de comissão do mês
- Histórico mensal (assinantes e comissão)
- Total acumulado e próxima data de pagamento
- Taxa de retenção dos assinantes indicados

### 3.5 Processo de cadastro de influencer

1. Influencer preenche formulário de parceria (nome, canal, link, seguidores, nicho)
2. Equipe analisa em até 3 dias úteis
3. Se aprovado: e-mail com credenciais do dashboard e link exclusivo
4. Contrato digital assinado via plataforma (DocuSign ou similar)
5. Link ativado após assinatura do contrato

---

## 4. Proteções contra Fraude

| Risco | Proteção |
|-------|---------|
| Criar contas falsas para cashback | CPF único por conta — impossível duplicar |
| Indicar a si mesmo com outro número | CPF + OTP SMS — 1 CPF = 1 conta |
| Sacar antes do indicado pagar | Cashback liberado apenas após webhook `payment.paid` |
| Influencer com audiência falsa | Aprovação manual + análise de engagement antes de ativar |
| Chargeback do assinante | Cashback/comissão só paga após D+30 |
| Saque suspeito em volume alto | Revisão manual automática acima de 10 saques/mês por usuário |
| Link de influencer em spam | Monitorar conversão — link com <1% em 30 dias é suspenso |

---

## 5. Balanço Financeiro — Viabilidade

### Premissas

| Item | Valor |
|------|-------|
| Assinatura Premium | R$ 9,90/mês |
| Cashback motorista | R$ 5,00 único por conversão |
| Comissão influencer | R$ 4,00/mês por assinante ativo (porte médio) |
| Retenção mensal | 75% |
| Taxa Pagar.me | 2,5% sobre receita |

### Cenário Conservador (mês 12)

- 300 novos usuários/mês · 5% convertem · 20% por indicação · 10% via influencer
- Assinantes ativos: ~76
- Receita mensal: R$ 752
- Custos totais: R$ 491
- Lucro mensal: R$ 261 (margem 35%)
- Lucro acumulado 12 meses: R$ 1.620

### Cenário Normal (mês 12)

- 800 novos usuários/mês · 10% convertem · 35% por indicação · 20% via influencer
- Assinantes ativos: ~400
- Receita mensal: R$ 3.960
- Custos totais: R$ 1.193
- Lucro mensal: R$ 2.767 (margem 70%)
- Lucro acumulado 12 meses: R$ 13.500

### ROI do cashback de motoristas

- Custo de aquisição: R$ 5,00 único
- Receita gerada em 8 meses de retenção: R$ 79,20
- Retorno sobre o custo: **15,8x**

### ROI do canal de influencers

- Comissão paga em 8 meses: R$ 32,00
- Receita gerada em 8 meses: R$ 79,20
- Retorno: **2,5x** — margem menor, mas volume maior sem esforço operacional

---

## 6. Fora do Escopo — NUNCA implementar sem aprovação

- Cashback recorrente para motoristas (é único por conversão)
- Saque em forma diferente de PIX
- Comissão para influencer antes de D+30
- Programa de afiliados para empresas ou CNPJs
- Qualquer bônus não listado neste documento

---

## 7. Fases de Implementação

### Fase 1 — Junto com o lançamento do app (MVP)

- Geração de código único por usuário no cadastro
- Trial de 7 dias para indicados (vs 14 padrão)
- Rastreamento de origem do cadastro via código/link
- Cashback R$ 5,00 liberado após `payment.paid`
- Saldo visível no app
- Tela "Rota Indica" completa
- Saque via PIX (mínimo R$ 20,00)
- Sistema de níveis (Iniciante / Parceiro / Embaixador)

### Fase 2 — 60 dias após lançamento

- Canal de influencers com aprovação manual
- Dashboard web para influencers
- Links com slug personalizado
- Pagamento automático mensal via PIX
- Relatório mensal por e-mail para influencers
- Monitoramento de conversão por link (anti-fraude)
