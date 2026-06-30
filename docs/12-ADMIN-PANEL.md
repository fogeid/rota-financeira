# Rota Financeira — Painel Administrativo

**Versão:** 1.0 | **Data:** Junho 2026
**Status:** Aprovado para desenvolvimento

---

## 1. Visão Geral

O Painel Administrativo é uma área interna de gestão do Rota
Financeira, usada pela equipe (fundador, financeiro e futuras
contratações de suporte) para supervisionar o app, o programa de
indicação e o portal de influencers.

**Decisão de arquitetura:** o admin vive DENTRO do projeto
`apps/dashboard` (mesmo Next.js já usado pelos influencers), em
rotas próprias sob `/admin/*`, com autenticação e modelo de dados
completamente separados do fluxo de influencer e do fluxo de
usuário do app mobile.

**Modelo de acesso (com roles desde o MVP):**
- Contas de admin são uma entidade própria (`AdminUser`), SEM
  relação com a tabela `User` do app
- Cada conta tem uma `role` fixa que define o que pode ver e fazer
  (seção 1.1) — implementado desde já, mesmo que hoje só exista
  1 pessoa usando, para não exigir retrabalho ao contratar suporte
- Login por e-mail + senha (não CPF — não é a mesma pessoa do app)
- NENHUMA role, incluindo SUPER_ADMIN, tem permissão de editar
  manualmente o saldo de cashback de um motorista ou qualquer valor
  financeiro calculado pelo sistema — essa decisão é definitiva,
  não apenas do MVP (ver seção 5)

### 1.1 Roles

| Role | Quem usa | Acesso |
|------|----------|--------|
| `SUPER_ADMIN` | Fundador, financeiro | Tudo: dashboard geral, usuários, influencers, financeiro (visualização e marcar saque como pago), auditoria |
| `SUPPORT_DRIVER` | Suporte focado em motoristas | Gestão de Usuários (buscar, ver detalhes, desativar/reativar). SEM acesso a financeiro, influencers ou dashboard geral |
| `SUPPORT_INFLUENCER` | Suporte focado em influencers | Gestão de Influencers (fila, aprovar, rejeitar, suspender, ver dashboard). SEM acesso a financeiro, usuários ou dashboard geral |
| `SUPPORT_DRIVER_INFLUENCER` | Suporte que atende os dois públicos, conforme demanda | Soma de `SUPPORT_DRIVER` + `SUPPORT_INFLUENCER`. SEM acesso a financeiro nem dashboard geral |

Nenhuma role de suporte (`SUPPORT_*`) tem acesso a:
- Dashboard geral (métricas de receita, conversão, etc — visão
  estratégica do negócio)
- Financeiro (saques, comissões) — mesmo que apenas para leitura
- Log de auditoria completo (cada role de suporte só vê o próprio
  histórico de ações, não o de outras pessoas — ver seção 4.5)

---

## 2. Modelo de Dados

```prisma
model AdminUser {
  id            String    @id @default(uuid())
  name          String
  email         String    @unique
  password_hash String                          // bcrypt, mesmo padrão do User
  role          AdminRole @default(SUPPORT_DRIVER)
  is_active     Boolean   @default(true)        // desativar acesso sem deletar histórico
  last_login_at DateTime?
  created_at    DateTime  @default(now())
  updated_at    DateTime  @updatedAt

  audit_logs    AdminAuditLog[]

  @@map("admin_users")
}

enum AdminRole {
  SUPER_ADMIN                  // acesso total exceto ajuste manual de saldo (nunca existe — seção 5)
  SUPPORT_DRIVER                // gestão de usuários/motoristas apenas
  SUPPORT_INFLUENCER             // gestão de influencers apenas
  SUPPORT_DRIVER_INFLUENCER      // soma de SUPPORT_DRIVER + SUPPORT_INFLUENCER
}

model AdminAuditLog {
  id           String    @id @default(uuid())
  admin_id     String
  action       String    @db.VarChar(100)   // ex: "approve_influencer", "suspend_user"
  target_type  String    @db.VarChar(50)    // ex: "InfluencerProfile", "User"
  target_id    String
  details      Json?                         // dados extras da ação (antes/depois)
  created_at   DateTime  @default(now())

  admin        AdminUser @relation(fields: [admin_id], references: [id])

  @@index([admin_id, created_at])
  @@index([target_type, target_id])
  @@map("admin_audit_logs")
}
```

**Por que log de auditoria desde o MVP:** ações administrativas
(aprovar influencer, suspender usuário, processar saque) afetam
dinheiro e acesso de terceiros. Registrar quem fez o quê e quando
é barato de implementar agora e caro de reconstruir depois caso
haja necessidade de investigar algo.

---

## 3. Autenticação do Admin

```
POST /admin/auth/login
  Body: { email, password }
  Resposta: { access_token, refresh_token, admin: { id, name, email } }

  - Token JWT próprio, com claim diferenciando de tokens de User
    (ex: { sub: adminId, type: 'admin' }) para nunca ser confundido
    com um token de usuário comum em nenhum endpoint
  - Mesmo padrão de expiração do app: access 15min, refresh 30 dias
  - Guard exclusivo (AdminJwtGuard) protegendo TODOS os endpoints
    /admin/* — nunca reaproveitar o JwtAuthGuard do app

Sem cadastro público de AdminUser — contas são criadas manualmente
(seed script ou inserção direta no banco pela equipe técnica), nunca
por um formulário de auto-cadastro.
```

---

## 4. Funcionalidades — MVP (visão geral básica)

### 4.1 Dashboard Geral (Home do Admin)

**Acesso:** exclusivo de `SUPER_ADMIN`

| Métrica | Descrição |
|---------|-----------|
| Usuários cadastrados | Total e novos no mês |
| Assinantes Premium ativos | Total e taxa de conversão gratuito→Premium |
| Receita do mês | Soma de pagamentos confirmados |
| Indicações convertidas | Total no mês (canal motorista) |
| Influencers aprovados | Total ativo |
| Comissões de influencer do mês | Total a pagar |
| Saques de motorista pendentes | Quantidade e valor total |

### 4.2 Gestão de Usuários

**Acesso:** `SUPER_ADMIN`, `SUPPORT_DRIVER`, `SUPPORT_DRIVER_INFLUENCER`

| Funcionalidade | Descrição |
|---|---|
| Buscar usuário | Por nome, CPF (mascarado na listagem), telefone, e-mail |
| Ver detalhes | Plano atual, data de cadastro, status da conta |
| Histórico resumido | Ganhos/custos do mês atual (somente leitura) |
| Editar dados cadastrais | Nome, e-mail, telefone, CPF, dados do veículo (model, ano, placa, consumo) |
| Conceder Premium (cortesia) | Toggle simples — ativa plano Premium sem cobrança, sem tocar no Pagar.me |
| Remover Premium (cortesia) | Reverte o toggle — volta o usuário para Gratuito |
| Transformar em influencer | Cria/aprova um `InfluencerProfile` para este usuário diretamente, sem passar pela fila de solicitação pública |
| Desativar conta | `is_active = false` — bloqueia login e invalida sessões ativas (ver fluxo completo em docs/05-SECURITY.md) |
| Reativar conta | Reverte desativação — login volta a funcionar normalmente |

**Fora do escopo (permanente):** editar dados financeiros do
usuário diretamente (ganhos, custos, parcela do financiamento,
saldo de cashback) — isso evita que qualquer role "ajuste" números
de forma não rastreável. Qualquer correção desse tipo de dado deve
passar por suporte ao usuário dentro do próprio app, não por edição
direta no admin.

**Sobre "Conceder Premium (cortesia)":** é uma concessão de acesso,
não uma transação financeira. NÃO cria registro de `Payment`, NÃO
chama o Pagar.me, NÃO gera cobrança real. Apenas seta o plano do
usuário como Premium com uma flag indicando origem "cortesia
administrativa" (ver schema em seção 8). Isso é diferente de uma
assinatura paga — se o usuário decidir assinar de verdade depois,
o fluxo normal de pagamento se aplica e substitui a cortesia.

**Sobre "Transformar em influencer":** quando o admin aciona esta
ação, o sistema cria um `InfluencerProfile` já com `status = APPROVED`
para aquele usuário (pulando a etapa de solicitação pública), e
dispara a MESMA regra de transição já documentada em
docs/06-BUSINESS-RULES.md seção 16.6 (desativação do `ReferralCode`
de motorista). É a via administrativa do mesmo fluxo que já existe
para aprovação manual pela fila — não é um fluxo paralelo nem
diferente, apenas um atalho de criação direta pelo admin.

### 4.3 Gestão de Influencers

**Acesso:** `SUPER_ADMIN`, `SUPPORT_INFLUENCER`, `SUPPORT_DRIVER_INFLUENCER`

| Funcionalidade | Descrição |
|---|---|
| Fila de solicitações pendentes | Lista de `InfluencerProfile.status = PENDING` |
| Ver detalhes da solicitação | Nome do canal, link, seguidores, nicho |
| Aprovar | Muda status para APPROVED — dispara desativação do código de motorista (regra já documentada em 06-BUSINESS-RULES.md 16.6) |
| Rejeitar | Muda status para REJECTED, com campo de motivo (interno) |
| Suspender | Muda status de APPROVED para SUSPENDED — reativa código de motorista |
| Editar tier/comissão | Ajustar manualmente o tier (MICRO/MEDIUM/LARGE) se necessário — apenas `SUPER_ADMIN`, por afetar valores financeiros (ver nota abaixo) |
| Ver dashboard do influencer | Mesma visão que o influencer vê, em modo leitura, para suporte |

Nota: a edição de tier muda o valor da comissão recorrente futura
de um influencer. Por afetar dinheiro, esta ação específica é
restrita a `SUPER_ADMIN` mesmo dentro da área de Influencers —
`SUPPORT_INFLUENCER` e `SUPPORT_DRIVER_INFLUENCER` podem aprovar,
rejeitar e suspender, mas não alterar tier.

### 4.4 Gestão Financeira

**Acesso:** exclusivo de `SUPER_ADMIN` — nenhuma role de suporte
acessa esta área, nem em modo leitura.

| Funcionalidade | Descrição |
|---|---|
| Saques de motorista pendentes | Lista de `ReferralWithdrawal.status = PENDING` |
| Processar saque manualmente | Marcar como PAID (se o PIX automático falhar e precisar de intervenção) |
| Comissões de influencer do mês | Lista com valores a pagar, status de pagamento |
| Histórico de pagamentos (Pagar.me) | Lista de assinaturas, status, falhas |

**O que NUNCA existe aqui, em nenhuma role, nem mesmo `SUPER_ADMIN`
(decisão definitiva, não é só falta de tempo no MVP):** qualquer
campo de edição livre de saldo, ganhos, custos, cashback ou valor
de comissão de um usuário específico. Toda ação financeira
disponível é "disparar um processo que o sistema já sabe executar"
(ex: marcar um saque que o Pagar.me confirmou como pago), nunca
"escrever um número à mão". Isso preserva a rastreabilidade total
de qualquer valor que aparece no sistema — qualquer R$ que existe
no saldo de alguém só pode ter vindo de uma conversão real,
verificável pelo webhook do Pagar.me.

### 4.5 Log de Auditoria

| Role | O que vê |
|------|----------|
| `SUPER_ADMIN` | Histórico completo de TODOS os admins, filtrável por pessoa/ação/período |
| `SUPPORT_DRIVER` | Apenas o PRÓPRIO histórico de ações |
| `SUPPORT_INFLUENCER` | Apenas o PRÓPRIO histórico de ações |
| `SUPPORT_DRIVER_INFLUENCER` | Apenas o PRÓPRIO histórico de ações |

| Funcionalidade | Descrição |
|---|---|
| Ver histórico de ações | Filtrável por admin (apenas SUPER_ADMIN pode filtrar por outra pessoa), por tipo de ação, por período |
| Detalhe de cada ação | Quem fez, quando, em qual entidade, dados antes/depois |

---

## 5. Fora do Escopo (algumas permanentes, não apenas do MVP)

**Permanente — nunca implementar, independente de versão futura:**
- Edição manual de saldo de cashback, ganhos, custos ou qualquer
  valor financeiro de um usuário específico, em qualquer role
  (incluindo SUPER_ADMIN) — ver justificativa na seção 4.4

**Fora do MVP — pode ser revisitado depois:**
- Edição direta de outros dados financeiros de usuários (mesmo que
  não fosse saldo — ex: corrigir um ganho lançado errado — deve
  passar por endpoint dedicado do próprio usuário no app, não pelo admin)
- Auto-cadastro de novos admins via formulário (contas continuam
  criadas via script/seed)
- Exportação de relatórios financeiros completos (planilhas)
- Configuração de regras de negócio via UI (valores de cashback,
  tiers, etc — continuam sendo alterados via código/deploy)
- Chat ou comunicação direta com usuários pelo painel
- Roles adicionais ou granularidade mais fina de permissão (a
  estrutura de 4 roles atende o tamanho de equipe esperado)

---

## 6. Segurança

- Login de admin NUNCA compartilha token/sessão com o app mobile
  ou com o login de influencer
- Todas as ações de escrita (aprovar, suspender, processar saque,
  desativar usuário) geram um `AdminAuditLog`
- Endpoints `/admin/*` protegidos por `AdminJwtGuard` exclusivo
- Dados sensíveis (CPF, telefone) sempre mascarados nas listagens,
  igual ao padrão já usado no app mobile (docs/05-SECURITY.md)
- Rate limiting no login de admin: 5 tentativas / 15 min (mesmo
  padrão do login de usuário comum)

---

## 7. Especificação de Endpoints

### 7.0 Mapa de acesso por endpoint (referência para os Guards)

| Endpoint | Roles permitidas |
|---|---|
| POST /admin/auth/login | público |
| GET /admin/dashboard/overview | SUPER_ADMIN |
| GET, /admin/users/* | SUPER_ADMIN, SUPPORT_DRIVER, SUPPORT_DRIVER_INFLUENCER |
| PATCH /admin/users/:id/(de)activate | SUPER_ADMIN, SUPPORT_DRIVER, SUPPORT_DRIVER_INFLUENCER |
| GET /admin/influencers/* | SUPER_ADMIN, SUPPORT_INFLUENCER, SUPPORT_DRIVER_INFLUENCER |
| PATCH /admin/influencers/:id/approve\|reject\|suspend | SUPER_ADMIN, SUPPORT_INFLUENCER, SUPPORT_DRIVER_INFLUENCER |
| PATCH /admin/influencers/:id/tier | SUPER_ADMIN apenas |
| GET, PATCH /admin/withdrawals/* | SUPER_ADMIN apenas |
| GET /admin/commissions | SUPER_ADMIN apenas |
| GET /admin/audit-logs | Todas as roles, mas SUPPORT_* só vê admin_id = o próprio; SUPER_ADMIN vê todos |

### Auth

```
POST /admin/auth/login [público]
  Body: { email, password }
  Resposta 200: { access_token, refresh_token, admin: { id, name, email, role } }
  Erros: 401 credenciais inválidas | 423 bloqueado por tentativas
```

### Dashboard

```
GET /admin/dashboard/overview
  Resposta 200: {
    total_users, new_users_this_month,
    active_premium, conversion_rate,
    revenue_this_month,
    referral_conversions_this_month,
    active_influencers,
    influencer_commissions_this_month,
    pending_withdrawals: { count, total_amount }
  }
```

### Usuários

```
GET /admin/users?search=&page=&limit=
  Resposta 200: { data: [{ id, name, cpf_masked, phone_masked, plan, created_at, is_active }], total, page }

GET /admin/users/:id
  Resposta 200: { ...dados do usuário + resumo financeiro do mês atual (somente leitura) }

PATCH /admin/users/:id/deactivate
  Resposta 200: { message: "Usuário desativado" }
  → cria AdminAuditLog

PATCH /admin/users/:id/reactivate
  Resposta 200: { message: "Usuário reativado" }
  → cria AdminAuditLog
```

### Influencers

```
GET /admin/influencers?status=PENDING
  Resposta 200: { data: [{ id, user_name, channel_name, channel_url, followers, niche, status, created_at }] }

GET /admin/influencers/:id
  Resposta 200: { ...detalhes completos + dashboard do influencer em modo leitura }

PATCH /admin/influencers/:id/approve
  Resposta 200: { message: "Influencer aprovado" }
  → muda status, desativa ReferralCode de motorista, cria AdminAuditLog

PATCH /admin/influencers/:id/reject
  Body: { reason }
  Resposta 200: { message: "Influencer rejeitado" }
  → cria AdminAuditLog

PATCH /admin/influencers/:id/suspend
  Body: { reason }
  Resposta 200: { message: "Influencer suspenso" }
  → muda status, reativa ReferralCode de motorista, cria AdminAuditLog

PATCH /admin/influencers/:id/tier
  Body: { tier: "MICRO" | "MEDIUM" | "LARGE" }
  Resposta 200: { message: "Tier atualizado" }
  → cria AdminAuditLog
```

### Financeiro

```
GET /admin/withdrawals?status=PENDING
  Resposta 200: { data: [{ id, user_name, amount, pix_key, status, created_at }] }

PATCH /admin/withdrawals/:id/mark-paid
  Resposta 200: { message: "Saque marcado como pago" }
  → cria AdminAuditLog

GET /admin/commissions?month=YYYY-MM
  Resposta 200: { data: [{ influencer_name, active_subscribers, commission_amount, status }] }
```

### Auditoria

```
GET /admin/audit-logs?admin_id=&action=&page=
  Resposta 200: { data: [{ id, admin_name, action, target_type, target_id, details, created_at }], total }
```