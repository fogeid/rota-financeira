# CLAUDE.md — Rota Financeira

Este arquivo é lido por agentes de IA antes de qualquer tarefa. Leia integralmente antes de escrever qualquer linha de código.

---

## O que é o Rota Financeira

App mobile de gestão financeira para motoristas de aplicativo (Uber, 99, iFood) no Brasil. O produto ajuda motoristas a saber quanto precisam ganhar por dia para pagar o financiamento do carro e ainda ter renda sobrando.

---

## Documentos obrigatórios — leia antes de implementar

| Doc | Arquivo | Quando ler |
|-----|---------|------------|
| PRD | docs/01-PRD.md | Antes de qualquer funcionalidade |
| Tech Stack | docs/02-TECH-STACK.md | Antes de instalar dependências |
| Schema DB | docs/03-DATABASE-SCHEMA.md | Antes de criar/alterar tabelas |
| API Spec | docs/04-API-SPEC.md | Antes de criar endpoints |
| Segurança | docs/05-SECURITY.md | Antes de qualquer dado sensível |
| Regras de negócio | docs/06-BUSINESS-RULES.md | Antes de cálculos financeiros |
| UI/UX | docs/07-UI-SPEC.md | Antes de qualquer tela |

---

## Stack

- **Mobile:** React Native 0.74 + Expo SDK 51 + TypeScript strict
- **Backend:** NestJS 10 + TypeScript strict + Prisma 5
- **Banco:** PostgreSQL 16 + Redis 7
- **Filas:** BullMQ
- **Auth:** JWT (access 15min + refresh 30d) + bcrypt custo 12
- **Pagamentos:** Pagar.me
- **Push:** Firebase FCM

---

## Estrutura do repositório

```
rota-financeira/
├── apps/
│   ├── mobile/     → React Native + Expo
│   └── backend/    → NestJS + Prisma
├── docs/           → Todos os documentos
├── docker-compose.yml → PostgreSQL + Redis local
└── CLAUDE.md       → Este arquivo
```

## Rodar localmente

```bash
# 1. Banco e Redis
docker-compose up -d

# 2. Backend
cd apps/backend
cp .env.example .env   # preencher variáveis
npm install
npx prisma migrate dev
npm run start:dev

# 3. Mobile
cd apps/mobile
npm install
npx expo start
```

---

## Regras que NUNCA podem ser violadas

### Segurança (bloqueante — não faça PR com isso)

1. **NUNCA** logar CPF, senha, token JWT, código OTP, credenciais de Uber/99, número de cartão
2. **NUNCA** armazenar credenciais de plataformas sem criptografia AES-256-GCM
3. **NUNCA** retornar CPF completo em nenhuma resposta de API
4. **NUNCA** armazenar tokens JWT no AsyncStorage — usar Expo SecureStore
5. **NUNCA** aceitar dados do cartão de crédito no servidor — usar token do Pagar.me
6. **NUNCA** colocar secrets em código — usar variáveis de ambiente

### Produto (bloqueante — não implementar sem aprovação)

7. **NUNCA** implementar funcionalidade não listada no PRD (docs/01-PRD.md)
8. **NUNCA** criar telas ou fluxos não especificados em docs/07-UI-SPEC.md
9. **NUNCA** alterar fórmulas de cálculo sem atualizar docs/06-BUSINESS-RULES.md
10. **NUNCA** alterar o schema do banco sem criar migration Prisma

### Qualidade

11. Todo endpoint deve ter validação de input (class-validator)
12. Toda função de cálculo financeiro deve ter teste unitário
13. Toda migration deve ser reversível (down migration)
14. TypeScript strict mode — sem `any` sem justificativa em comentário

---

## Padrão de commits

```
feat(módulo): descrição curta
fix(módulo): descrição curta
refactor(módulo): descrição curta
test(módulo): descrição curta
docs: descrição curta

Exemplos:
feat(auth): adicionar bloqueio por tentativas de login
fix(financing): corrigir cálculo de meta quando histórico < 3 meses
test(taxes): adicionar casos de borda para IR com deduções zero
```

## Branches

```
main        → produção (protegida, só via PR)
develop     → staging
feature/*   → funcionalidades
fix/*       → correções
```

---

## O que fazer quando encontrar ambiguidade

1. Consultar o documento relevante (lista acima)
2. Se o documento não cobre: **parar e perguntar** antes de implementar
3. Nunca inventar comportamento não documentado
4. Nunca simplificar fórmulas financeiras "por conveniência"

---

## Contatos e links

- Protótipo visual: docs/rota-financeira-app.html
- Repositório: github.com/[org]/rota-financeira
- Ambiente staging: staging-api.rota-financeira.app
- Ambiente produção: api.rota-financeira.app
