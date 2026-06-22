# Rota Financeira — Runbook de Operações

**Versão:** 1.0 | **Criado por:** Agente 11 | **Data:** 2026-06-22

---

## 1. Como reiniciar o backend em produção

### Via Railway Dashboard
1. Acesse [railway.app](https://railway.app) → projeto `rota-financeira`
2. Selecione o serviço `rota-financeira-backend`
3. Clique em **"Restart"** no canto superior direito
4. Aguarde o health check (rota `GET /v1/health`) retornar 200

### Via CLI
```bash
railway service restart --service rota-financeira-backend
```

### Verificar que o backend está saudável
```bash
curl https://api.rota-financeira.app/v1/health
# Esperado: { "status": "ok" }
```

---

## 2. Como rodar migrations em produção

> ⚠️ **SEMPRE** faça backup antes de rodar migrations em produção.

### Pré-requisitos
- `DATABASE_URL` apontando para o banco de produção
- Prisma CLI instalado (`npm install -g prisma`)

```bash
# 1. Conectar ao banco de produção (via Railway env vars)
railway run --service rota-financeira-backend -- npx prisma migrate deploy

# Ou diretamente com a connection string:
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

### Verificar status das migrations
```bash
DATABASE_URL="postgresql://..." npx prisma migrate status
```

### Rollback de migration
As migrations do Prisma são **unidirecionais** por padrão. Para reverter:
1. Identifique a migration a reverter em `apps/backend/prisma/migrations/`
2. Execute o SQL de rollback manualmente via `psql` ou PgAdmin
3. Remova o registro da tabela `_prisma_migrations` com `status = 'applied'`

---

## 3. Como processar saques de cashback manualmente

Saques ficam com `status = 'PENDING'` até processamento manual via PIX.

### Listar saques pendentes
```sql
SELECT
  rw.id,
  rw.user_id,
  u.name,
  rw.amount,
  rw.pix_key,
  rw.created_at
FROM referral_withdrawals rw
JOIN users u ON u.id = rw.user_id
WHERE rw.status = 'PENDING'
ORDER BY rw.created_at ASC;
```

### Marcar saque como pago
```sql
UPDATE referral_withdrawals
SET status = 'PAID', processed_at = NOW()
WHERE id = '<withdrawal_id>';
```

### Marcar saque como falhou (estornar saldo)
```sql
-- 1. Marcar como FAILED
UPDATE referral_withdrawals
SET status = 'FAILED', processed_at = NOW()
WHERE id = '<withdrawal_id>';

-- 2. Devolver saldo disponível
UPDATE referral_balances
SET
  available = available + <amount>,
  total_withdrawn = total_withdrawn - <amount>
WHERE user_id = '<user_id>';
```

---

## 4. Como aprovar um influencer

### Via SQL direto
```sql
-- Ver candidatos pendentes
SELECT
  ip.id,
  ip.user_id,
  u.name,
  ip.channel_name,
  ip.channel_url,
  ip.followers,
  ip.tier,
  ip.niche,
  ip.created_at
FROM influencer_profiles ip
JOIN users u ON u.id = ip.user_id
WHERE ip.status = 'PENDING'
ORDER BY ip.created_at ASC;

-- Aprovar influencer (substituir <profile_id>)
UPDATE influencer_profiles
SET
  status = 'APPROVED',
  approved_at = NOW()
WHERE id = '<profile_id>';

-- Atualizar tipo do referral_code para INFLUENCER (para trial de 14 dias)
UPDATE referral_codes
SET type = 'INFLUENCER'
WHERE user_id = (SELECT user_id FROM influencer_profiles WHERE id = '<profile_id>');
```

### Para rejeitar
```sql
UPDATE influencer_profiles
SET status = 'REJECTED'
WHERE id = '<profile_id>';
```

---

## 5. Como suspender um link de indicação suspeito

### Suspender influencer (mantém usuário ativo)
```sql
UPDATE influencer_profiles
SET status = 'SUSPENDED'
WHERE id = '<profile_id>';
```

### Desativar código de indicação específico (bloquear novos registros pelo link)
```sql
-- Não existe campo is_active em referral_codes; adicionar via migration se necessário.
-- Por enquanto, remover o slug (deep link) para invalidar o link público:
UPDATE referral_codes
SET slug = NULL
WHERE id = '<code_id>';
```

### Ver indicações suspeitas (muitos saques no mês)
```sql
SELECT
  rw.user_id,
  u.name,
  COUNT(*) AS saques_no_mes,
  SUM(rw.amount) AS total_sacado
FROM referral_withdrawals rw
JOIN users u ON u.id = rw.user_id
WHERE rw.created_at >= DATE_TRUNC('month', NOW())
GROUP BY rw.user_id, u.name
HAVING COUNT(*) > 5
ORDER BY saques_no_mes DESC;
```

---

## 6. O que fazer se o sync do Uber parar de funcionar

O sync do Uber/99 opera via `platform-sync.processor.ts` em background (BullMQ).

### Passo 1: Verificar logs do worker
```bash
# Via Railway logs
railway logs --service rota-financeira-backend --tail 100 | grep "sync"
```

### Passo 2: Verificar fila no Redis
```bash
# Conectar ao Redis
redis-cli -u $REDIS_URL

# Listar jobs com falha na fila
LRANGE bull:platform-sync:failed 0 -1
```

### Passo 3: Verificar credenciais do usuário
```sql
SELECT
  pc.user_id,
  pc.platform,
  pc.last_sync_at,
  pc.last_sync_status,
  pc.last_sync_error,
  pc.sync_retry_count
FROM platform_credentials pc
WHERE pc.last_sync_status = 'FAILED'
ORDER BY pc.sync_retry_count DESC;
```

### Passo 4: Resetar retry count para forçar retry
```sql
UPDATE platform_credentials
SET sync_retry_count = 0, last_sync_status = 'NEVER'
WHERE platform = 'UBER' AND last_sync_status = 'FAILED';
```

### Passo 5: Se a plataforma mudou a API
O sync usa scraping/API não oficial. Se parar de funcionar após uma atualização do Uber:
1. Verificar `integrations.constants.ts` e `platform-sync.processor.ts`
2. Atualizar endpoints e selectors de scraping
3. Testar em ambiente de staging com conta de motorista real
4. Deploy após testes passarem

---

## 7. Checklist de backup

```bash
# Backup manual do banco de produção
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# O Railway faz backup automático diário (retenção 30 dias).
# Para restaurar: Railway Dashboard → PostgreSQL → Backups → Restore
```

---

## 8. Variáveis de ambiente necessárias em produção

| Variável | Descrição | Obrigatória |
|----------|-----------|-------------|
| `DATABASE_URL` | URL do PostgreSQL | ✅ |
| `REDIS_URL` | URL do Redis | ✅ |
| `JWT_ACCESS_SECRET` | Secret do JWT access (min 32 chars) | ✅ |
| `JWT_REFRESH_SECRET` | Secret do JWT refresh (min 32 chars) | ✅ |
| `ENCRYPTION_MASTER_KEY` | Chave AES para credenciais de plataforma | ✅ |
| `FIELD_ENCRYPTION_KEY` | Chave AES para campos sensíveis (CPF, email, phone) | ✅ |
| `HASH_SECRET` | Salt para hashes SHA-256 | ✅ |
| `PAGARME_API_KEY` | API key do Pagar.me (produção) | ✅ |
| `PAGARME_WEBHOOK_SECRET` | Secret HMAC do webhook Pagar.me | ✅ |
| `FIREBASE_PROJECT_ID` | Firebase project ID | ✅ Push |
| `FIREBASE_PRIVATE_KEY` | Firebase private key | ✅ Push |
| `FIREBASE_CLIENT_EMAIL` | Firebase client email | ✅ Push |
| `SENTRY_DSN` | DSN do Sentry para monitoramento | Recomendada |
| `FRONTEND_URL` | URL do app mobile (para CORS) | ✅ |
| `NODE_ENV` | `production` | ✅ |
| `PORT` | Porta da API (padrão 3000) | Opcional |

---

## 9. Contatos de emergência

| Situação | Contato |
|---------|---------|
| Backend offline | Verificar Railway dashboard primeiro |
| Banco inacessível | Suporte Railway: [railway.app/help](https://railway.app/help) |
| Pagar.me com problemas | Status: [status.pagar.me](https://status.pagar.me) |
| Firebase FCM offline | Status: [status.firebase.google.com](https://status.firebase.google.com) |
| Bug crítico em produção | Criar issue no GitHub e fazer hotfix via branch `hotfix/*` |
