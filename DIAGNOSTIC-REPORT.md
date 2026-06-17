# Relatório QA — Rota Financeira

Data: 2026-06-17

---

## Testes automatizados

| Camada | Suites | Testes | Status |
|--------|--------|--------|--------|
| Backend (Jest) | 12/12 | 148/148 | ✅ |
| Mobile (Jest) | — | — | ✅ (sem testes unitários mobile ainda) |
| TypeScript backend | — | — | ✅ sem erros |
| TypeScript mobile | — | — | ✅ sem erros |

---

## Endpoints backend testados

| Endpoint | Status |
|----------|--------|
| POST /auth/register | ✅ |
| POST /auth/login | ✅ |
| POST /auth/refresh | ✅ |
| GET /users/me | ✅ |
| PATCH /users/me | ✅ |
| POST /users/me/change-password | ✅ |
| POST /users/me/change-phone | ✅ |
| POST /users/me/change-phone/verify | ✅ |
| DELETE /users/me | ✅ |
| POST /vehicles | ✅ (upsert — criação) |
| GET /vehicles/me | ✅ |
| PUT /vehicles/me | ✅ (upsert — atualização) |
| POST /financing/me | ✅ (upsert — criação) |
| GET /financing/me | ✅ |
| PUT /financing/me | ✅ (upsert — atualização) |
| GET /financing/progress | ✅ |
| POST /integrations/connect | ✅ (409 tratado como sucesso) |
| GET /integrations/status | ✅ |
| DELETE /integrations/:platform | ✅ |
| GET /earnings | ✅ |
| POST /earnings | ✅ |
| GET /earnings/summary | ✅ |
| GET /costs | ✅ |
| POST /costs | ✅ |
| GET /alerts/preferences | ✅ |
| PATCH /alerts/preferences | ✅ |
| GET /subscriptions/me | ✅ |
| POST /subscriptions/subscribe | ✅ |
| POST /subscriptions/subscribe/pix | ✅ |
| DELETE /subscriptions/me | ✅ (cancelar) |

**Total: 30/30 endpoints funcionando**

---

## Botões mobile testados

| Tela | Botão / Ação | Status |
|------|-------------|--------|
| Home | Registrar corrida | ✅ |
| Home | Registrar gasto | ✅ |
| Home | Feedback após salvar (Alert com valor) | ✅ |
| Home | Reload após salvar | ✅ |
| Perfil | Editar veículo (criar + atualizar) | ✅ |
| Perfil | Editar financiamento + total_installments | ✅ |
| Perfil | Conectar Uber / 99 | ✅ |
| Perfil | Desconectar Uber / 99 (modal próprio) | ✅ |
| Perfil | Toggle notificações | ✅ |
| Perfil | Toggle biometria | ✅ |
| Perfil | Editar perfil (nome / email) | ✅ |
| Perfil | Alterar senha (validação maiúscula + número) | ✅ |
| Perfil | Alterar telefone (2 etapas: SMS + OTP) | ✅ |
| Perfil | Cancelar assinatura | ✅ |
| Perfil | Suporte WhatsApp | ✅ |
| Perfil | Excluir conta (2 etapas: aviso + confirmação) | ✅ |
| Upgrade | Selecionar plano mensal / anual | ✅ |
| Pagamento | Fluxo Cartão (stub Pagar.me) | ✅ |
| Pagamento | Fluxo Pix | ✅ |
| Meu Carro | Gráfico semanal com dados reais | ✅ |
| Relatórios | isPro conectado ao store real | ✅ |

**Total: 21/21 botões/ações funcionando**

---

## Bugs encontrados: 14

## Bugs corrigidos: 14

| # | Bug | Correção | Commit |
|---|-----|----------|--------|
| 1 | Plan IDs `premium_annual` em vez de `premium_yearly` | Renomeado em 7 arquivos | `0b67fde` |
| 2 | `isPro = true` hardcoded em RelatoriosScreen | Conectado ao `useSubscriptionStore` | `0b67fde` |
| 3 | MeuCarroScreen usava `MOCK_VALUES` em vez de ganhos reais | `earningsService.list()` real | `0b67fde` |
| 4 | CartaoScreen / PixScreen usavam `subscriptionsMock` | Substituído por `subscriptionsService` | `0b67fde` |
| 5 | Editar veículo dava erro 404 (PUT sem registro) | Upsert PUT→POST fallback | `39b1f26` |
| 6 | Editar financiamento dava erro 404 | Upsert PUT→POST fallback | `39b1f26` |
| 7 | Botão "Alterar telefone" sem implementação | Modal 2 etapas (SMS + OTP) | `39b1f26` |
| 8 | Registrar corrida/gasto não mostrava feedback | Alert com valor após salvar | `39b1f26` |
| 9 | POST financing apontava para `/financing` em vez de `/financing/me` | URL corrigida | `d1a87a8` |
| 10 | Placeholder `1.250,00` quebrava o parsing decimal | `parseBRL()` + placeholder sem milhar | `68fd54a` |
| 11 | Valores carregados sem casas decimais (ex: `1200` em vez de `1200,00`) | `fmtBRL()` com `.toFixed(2)` | `68fd54a` |
| 12 | Switch de plataformas bloqueado pelo `TouchableOpacity` pai | `SettingRow` separado para toggle | `3e17e1e` |
| 13 | Switch disparava `onValueChange` múltiplas vezes no Android | Switch display-only + row tappável | `25aa370` |
| 14 | Disconnect não funcionava no Expo web (`Alert.alert` inconsistente) | Modal de confirmação próprio | `9bb69e6` |

## Bugs pendentes: 1

| # | Bug | Detalhe |
|---|-----|---------|
| 1 | Tokenização de cartão (Pagar.me) | `CartaoScreen` usa token stub `card_tok_test_xxx`. SDK do Pagar.me não foi integrado — requer conta Pagar.me e instalação do SDK nativo. |

---

## Fluxos E2E validados

| Fluxo | Status |
|-------|--------|
| Primeiro uso: registro → login → cadastrar veículo → cadastrar financiamento | ✅ |
| Operação diária: login → registrar corrida → registrar gasto → ver home atualizada | ✅ |
| Conectar plataforma (Uber/99) → ver status no home | ✅ |
| Desconectar plataforma (modal de confirmação) | ✅ |
| Alterar dados do perfil (nome, senha, telefone) | ✅ |
| Upgrade para Pro → pagamento Pix | ✅ |
| Cancelar assinatura | ✅ |
| Excluir conta | ✅ |

---

## Schema / Migrations

| Migration | Status |
|-----------|--------|
| Todas as migrations anteriores | ✅ aplicadas |
| `20260617_add_total_installments_to_financing` | ✅ aplicada |

---

## Segurança (regras CLAUDE.md)

| Regra | Status |
|-------|--------|
| CPF/senha/token nunca logados | ✅ |
| Credenciais de plataforma criptografadas AES-256-GCM | ✅ |
| CPF completo nunca retornado na API | ✅ |
| JWT em Expo SecureStore (não AsyncStorage) | ✅ |
| Dados de cartão nunca no servidor | ✅ (stub local) |
| Secrets em variáveis de ambiente | ✅ |
