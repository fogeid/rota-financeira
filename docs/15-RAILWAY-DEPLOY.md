# Rota Financeira — Deploy no Railway

**Versão:** 1.0 | **Data:** Junho 2026

---

## 1. Visão Geral

O backend (NestJS), banco (PostgreSQL) e fila (Redis) saem do
computador local e passam a rodar no Railway, com **2 ambientes
completamente separados**: staging (ligado à branch `develop`) e
production (ligado à branch `main`).

```
GitHub                          Railway
─────────────────────────────────────────────────
develop  ──push──▶  Deploy automático em STAGING
main     ──push──▶  Deploy automático em PRODUCTION
```

**Por que 2 ambientes desde já:** testar mudanças em produção real
(mesmo com poucos usuários) é arriscado — um bug em staging custa
um teste refeito; o mesmo bug em produção custa a confiança de um
usuário real e, no caso deste projeto, pode envolver dinheiro
(saques, comissões).

---

## 2. Serviços no Railway (por ambiente)

Cada ambiente (staging e production) tem seu próprio projeto
Railway, com 3 serviços dentro:

```
rota-financeira-staging/
  ├── backend (NestJS, a partir do Dockerfile ou Nixpacks)
  ├── postgres (plugin gerenciado do Railway)
  └── redis (plugin gerenciado do Railway)

rota-financeira-production/
  ├── backend
  ├── postgres
  └── redis
```

Nunca compartilhar banco ou Redis entre staging e production —
dados de teste jamais devem se misturar com dados reais de usuários.

---

## 3. Variáveis de Ambiente por Serviço

Cada ambiente tem seu próprio conjunto de variáveis, configuradas
diretamente no painel do Railway (nunca em arquivo committed):

```
DATABASE_URL          → injetado automaticamente pelo plugin Postgres do Railway
REDIS_URL              → injetado automaticamente pelo plugin Redis do Railway
NODE_ENV                → "staging" ou "production"
JWT_ACCESS_SECRET       → ÚNICO por ambiente, nunca reaproveitado
JWT_REFRESH_SECRET      → ÚNICO por ambiente
ADMIN_JWT_SECRET        → ÚNICO por ambiente
PAGARME_API_KEY         → chave de TESTE em staging, chave REAL em production
PAGARME_WEBHOOK_SECRET  → idem
SMS_PROVIDER_API_KEY    → ver docs/15-INTEGRACOES-EXTERNAS.md
OTP_BYPASS_MODE         → "true" em staging (facilita testes), SEMPRE "false" em production
CORS_ORIGIN              → URLs do app/dashboard permitidas, diferentes por ambiente
```

**Geração de secrets:** usar valores aleatórios longos, nunca
strings previsíveis. Gerar com:
```bash
openssl rand -base64 48
```
Um valor diferente para cada um dos 3 secrets JWT, em cada um dos
2 ambientes — total de 6 valores únicos.

---

## 4. Migrations em Produção

```
Migrations do Prisma NUNCA rodam automaticamente em produção como
parte do deploy padrão — isso evita uma migration mal escrita
derrubar o banco de produção sem revisão.

Fluxo:
1. Migration é criada e testada em desenvolvimento local
2. Aplicada em staging via deploy normal (pode ser automático aqui,
   já que staging não tem dados reais de usuários)
3. Antes do deploy em produção, rodar manualmente:
   railway run --environment production npx prisma migrate deploy
4. Confirmar que a migration aplicou sem erro
5. Só então fazer o deploy do código que depende dela
```

---

## 5. Domínio e HTTPS

```
Railway fornece um domínio *.up.railway.app automaticamente para
cada serviço, já com HTTPS.

Recomendado (não obrigatório no MVP): configurar um domínio próprio
(ex: api.rotafinanceira.app para produção, api-staging.rotafinanceira.app
para staging) apontando para o Railway via CNAME, assim que a marca
tiver um domínio registrado.
```

---

## 6. Apps que Dependem da URL do Backend

```
apps/mobile    → variável EXPO_PUBLIC_API_URL, configurada por
                  perfil de build no eas.json (ver docs/16-EAS-BUILD.md)
apps/dashboard → variável NEXT_PUBLIC_API_URL, configurada por
                  ambiente de deploy (Vercel ou onde o dashboard
                  for hospedado — fora do escopo deste documento,
                  mas a mesma lógica de staging/production se aplica)
```

---

## 7. Checklist de Migração (sair do localhost)

```
[ ] Conta Railway criada
[ ] Projeto "rota-financeira-staging" criado com os 3 serviços
[ ] Projeto "rota-financeira-production" criado com os 3 serviços
[ ] Todas as variáveis de ambiente configuradas em ambos
[ ] Repositório GitHub conectado ao Railway (deploy automático por branch)
[ ] Migrations aplicadas manualmente em staging primeiro, validadas
[ ] Backend staging respondendo (testar /health ou endpoint simples)
[ ] Apontar um build de teste do mobile para a URL de staging
[ ] Rodar o roteiro de regressão (qa/REGRESSAO-GERAL.md +
    AGENTE-REGRESSAO-AUTOMATIZADA.md) contra staging
[ ] Só após staging validado: aplicar migrations em production
[ ] Deploy em production
[ ] Atualizar DNS/domínio se aplicável
```