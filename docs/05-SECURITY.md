# Rota Financeira — Segurança e Privacidade (LGPD)

**Versão:** 1.0 | **Data:** Junho 2026

---

## 1. Princípios Fundamentais

1. **Zero trust:** nenhum dado sensível é confiado sem verificação
2. **Least privilege:** cada serviço acessa apenas o que precisa
3. **Defense in depth:** múltiplas camadas de proteção
4. **Privacy by design:** privacidade considerada desde o início
5. **Fail secure:** em caso de dúvida, negar acesso

---

## 2. Dados Sensíveis e Classificação

| Dado | Classificação | Armazenamento | Exibição ao usuário |
|------|--------------|---------------|---------------------|
| CPF | Crítico | AES-256-GCM + hash para lookup | Mascarado: ***.456.***-** |
| Senha | Crítico | bcrypt hash (custo 12) — NUNCA reversível | Nunca exibida |
| Credenciais Uber/99 | Crítico | AES-256-GCM com chave por usuário | Nunca exibidas |
| Número do cartão | Crítico | NUNCA armazenado — tokenizado pelo Pagar.me | Nunca exibido |
| E-mail | Sensível | AES-256-GCM + hash para lookup | Parcialmente mascarado |
| Telefone | Sensível | AES-256-GCM + hash para lookup | Parcialmente mascarado |
| Tokens JWT | Sensível | Somente no client (SecureStore) | Nunca expostos |
| Ganhos financeiros | Sensível | Plain text (necessário para cálculos) | Exibido ao dono |
| Dados do veículo | Interno | Plain text | Exibido ao dono |

---

## 3. Criptografia de Campos Sensíveis

### CPF, E-mail, Telefone

```typescript
// Algoritmo: AES-256-GCM
// Chave: FIELD_ENCRYPTION_KEY (256 bits, variável de ambiente)
// IV: 12 bytes aleatórios por operação
// Output: base64(iv + authTag + ciphertext)

function encrypt(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', FIELD_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

// Hash para lookup (sem revelar o valor)
function hash(value: string): string {
  return crypto.createHmac('sha256', HASH_SECRET).update(value.toLowerCase()).digest('hex');
}
```

### Credenciais de Plataformas (Uber, 99)

```typescript
// Chave derivada por usuário: HKDF(masterKey, userId, 'platform-credentials')
// Isso garante que comprometer a chave de um usuário não compromete outros

function deriveUserKey(userId: string): Buffer {
  return crypto.hkdfSync('sha256', MASTER_KEY, userId, 'platform-credentials', 32);
}

function encryptCredentials(credentials: object, userId: string): string {
  const key = deriveUserKey(userId);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data = JSON.stringify(credentials);
  const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}
```

---

## 4. Autenticação e Sessões

### JWT

```
Access Token:
- Algoritmo: HS256
- Payload: { sub: userId, plan: 'PRO', iat, exp }
- Expiração: 15 minutos
- Armazenamento client: Expo SecureStore (keychain nativa)

Refresh Token:
- Gerado: crypto.randomBytes(64).toString('hex')
- Armazenado no banco: SHA-256 do token (nunca o token em si)
- Expiração: 30 dias
- Rotação: novo refresh token a cada uso (anterior invalidado)
- Revogação: imediata no logout
```

### Bloqueio por Tentativas

```
Login:
- 5 tentativas falhas consecutivas → bloqueio de 15 minutos
- Contagem por CPF (não por IP, para evitar bloqueio de IPs compartilhados)
- Reset da contagem após login bem-sucedido

OTP:
- 3 tentativas por código → código invalidado
- 5 reenvios por sessão de cadastro
- Intervalo mínimo de 60s entre reenvios
- Expiração do código: 5 minutos
```

---

## 5. Segurança da API

### Rate Limiting (Redis)

```
Global por IP:          100 req/min
Autenticado por userId: 300 req/min
Login por CPF:          5 tentativas / 15 min
OTP por telefone:       5 reenvios / 30 min
Webhook Pagar.me:       sem rate limit (validação por HMAC)
```

### Headers de Segurança (Helmet.js)

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
```

### Validação de Inputs

- Todos os inputs validados via class-validator antes de tocar o banco
- Tamanho máximo de body: 1MB
- Tipos de campos verificados (number, string, date, enum)
- CPF validado por dígitos verificadores
- Placa validada por regex: `/^[A-Z]{3}-?\d{3}[A-Z0-9]$/`

### CORS

```typescript
// Apenas origens autorizadas. NUNCA '*' em produção.
origin: [
  'https://rota-financeira.app',       // futuro web (V3)
]
// No MVP: apenas app mobile (sem CORS necessário para apps nativos)
```

---

## 6. Segurança no App Mobile

### Armazenamento de Dados Sensíveis

```
PROIBIDO: AsyncStorage para dados sensíveis
OBRIGATÓRIO: Expo SecureStore para:
  - access_token
  - refresh_token
  - biometry_key (para desbloqueio local)

NUNCA armazenar localmente:
  - CPF
  - Senha
  - Credenciais de plataformas
  - Número de cartão
```

### Certificate Pinning

```typescript
// Bloqueia ataques de interceptação (MITM)
// Configurado via Expo + react-native-ssl-pinning
// Pinos dos certificados do api.rota-financeira.app atualizados antes de expirar
```

### Jailbreak / Root Detection

```typescript
// Alertar (não bloquear) usuários em devices com jailbreak/root
// Exibir aviso: "Este device pode estar comprometido. Use com cautela."
```

---

## 7. Segurança das Integrações com Plataformas

### Credenciais Uber/99

```
1. Recebidas via HTTPS
2. NUNCA logadas
3. Criptografadas com chave derivada por usuário ANTES de qualquer persistência
4. Decriptadas APENAS no worker de sync, em memória
5. Nunca retornadas pela API (nem mascaradas)
6. Removidas imediatamente ao desconectar a plataforma
```

### Webhook do Pagar.me

```typescript
// Validação obrigatória por HMAC-SHA256
function validateWebhook(payload: string, signature: string): boolean {
  const expected = crypto
    .createHmac('sha256', PAGARME_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
// Requisição rejeitada com 401 se assinatura inválida
```

---

## 8. LGPD — Conformidade

### Dados Coletados e Base Legal

| Dado | Finalidade | Base Legal |
|------|-----------|------------|
| Nome | Identificação e personalização | Execução de contrato |
| CPF | Verificação de identidade única | Execução de contrato |
| Telefone | Verificação OTP e alertas | Execução de contrato |
| E-mail | Recibos e notificações | Execução de contrato |
| Ganhos e custos | Funcionalidade core do app | Execução de contrato |
| Dados do veículo | Cálculo de custo/km | Execução de contrato |
| Dados de uso (analytics) | Melhoria do produto | Legítimo interesse |

### Direitos do Titular

| Direito | Como exercer | Prazo |
|---------|-------------|-------|
| Acesso | GET /users/me e relatórios | Imediato |
| Correção | PATCH /users/me e edição de dados | Imediato |
| Exclusão | DELETE /users/me | 30 dias |
| Portabilidade | Exportar PDF dos relatórios | Imediato |
| Oposição ao tratamento | Cancelar conta | 30 dias |

### Retenção de Dados

```
Dados da conta ativa:      Enquanto a conta existir
Dados após cancelamento:   30 dias (após = exclusão)
Dados após exclusão solicitada: 30 dias (obrigação legal)
Logs de acesso (anonimizados): 6 meses
Dados de pagamento:        5 anos (obrigação fiscal)
```

### Exclusão de Conta — Fluxo

```
1. Usuário confirma com senha + texto "EXCLUIR MINHA CONTA"
2. Conta marcada como deleted_at = now()
3. Sessões invalidadas imediatamente
4. Job agendado para D+30
5. D+30: todos os dados pessoais removidos ou anonimizados
6. Histórico de pagamentos anonimizado (valor mantido para fins fiscais)
7. E-mail de confirmação enviado ao usuário
```

---

## 9. Política de Logs

### O que NUNCA vai para logs

```
- CPF (nem mascarado)
- Senha (nem hash)
- Token JWT (nem fragmento)
- Número de cartão
- Credenciais de plataformas (nem criptografadas)
- Código OTP
- Refresh token
```

### O que VAI para logs

```
- Timestamp da requisição
- Método HTTP e rota (sem query params com dados sensíveis)
- Status code da resposta
- user_id (UUID — não identificável por si só)
- Duração da requisição
- Erros e stack traces (sem dados de usuário)
```

### Exemplo de log correto

```json
{
  "timestamp": "2026-06-15T10:30:00Z",
  "method": "POST",
  "path": "/v1/auth/login",
  "status": 401,
  "duration_ms": 45,
  "request_id": "req_abc123"
}
```

---

## 10. Auditoria e Monitoramento

| Evento | Ação | Alerta |
|--------|------|--------|
| 5+ logins falhos no mesmo CPF | Log + bloqueio | Slack alert |
| Exclusão de conta | Log auditável | E-mail para admin |
| Alteração de telefone | Log auditável | E-mail para usuário |
| Falha no webhook Pagar.me | Log + retry | Slack alert |
| Erro 500 | Log com stack | Sentry + Slack |
| Sync falhou 3x seguidas | Log + notificação ao usuário | — |
