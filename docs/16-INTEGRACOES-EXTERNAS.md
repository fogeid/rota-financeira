# Rota Financeira — Integrações Externas (Produção)

**Versão:** 1.0 | **Data:** Junho 2026

---

## 1. SMS (OTP de verificação)

### Ação manual do usuário (fora do código)
```
[ ] Escolher provedor: Zenvia ou Total Voice (nacionais, melhor
    entrega no Brasil) ou Twilio (internacional, mais documentado)
[ ] Criar conta no provedor escolhido
[ ] Validar/configurar o remetente (sender ID) se o provedor exigir
[ ] Obter API Key/Token de produção
[ ] Verificar custo por SMS enviado (variável entre provedores,
    relevante para o volume esperado de cadastros)
```

### O que o código já suporta (de AGENTE-DIAGNOSTICO-SMS.md)
```
- SmsService já implementado com chamada HTTP genérica
- OTP_BYPASS_MODE já existe, protegido contra uso em produção
- Falta apenas: plugar a API Key real do provedor escolhido na
  variável SMS_PROVIDER_API_KEY do ambiente de produção
```

### Checklist de ativação
```
[ ] OTP_BYPASS_MODE=false em produção (NUNCA true)
[ ] OTP_BYPASS_MODE=true permitido em staging (facilita testes)
[ ] SMS_PROVIDER_API_KEY configurada com valor REAL em produção
[ ] Testar cadastro real em staging com bypass desativado
    temporariamente (validar que o SMS chega de verdade) antes de
    confiar que vai funcionar em produção
[ ] Monitorar taxa de entrega nos primeiros dias após ativação
```

---

## 2. Pagar.me (Pagamentos)

### Ação manual do usuário (fora do código)
```
[ ] Criar conta Pagar.me (ou Stone, empresa controladora)
[ ] Completar verificação KYC da empresa (CNPJ, documentos —
    processo pode levar alguns dias úteis)
[ ] Obter chaves de API: modo TESTE (sandbox) primeiro, modo
    PRODUÇÃO só após validar tudo em sandbox
[ ] Configurar a conta bancária de recebimento
[ ] Configurar o webhook endpoint apontando para a URL do backend
    (ex: https://api-staging.rotafinanceira.app/v1/subscriptions/webhook
    em staging, URL de produção em produção)
[ ] Obter o Webhook Secret para validar a assinatura das chamadas
```

### Diferença crítica entre staging e produção
```
Em STAGING: usar SEMPRE as chaves de TESTE do Pagar.me (sandbox).
Cartões de teste, PIX simulado — nenhuma cobrança real acontece,
mesmo que o fluxo pareça idêntico ao real.

Em PRODUÇÃO: usar as chaves REAIS. Qualquer pagamento processado
aqui é dinheiro de verdade saindo do cartão/conta de um usuário real.

NUNCA usar chave de produção em staging — um teste mal feito em
staging com chave real cobraria um cartão de verdade.
```

### Checklist de ativação
```
[ ] Conta Pagar.me criada e KYC aprovado
[ ] PAGARME_API_KEY (sandbox) configurada em staging
[ ] PAGARME_API_KEY (produção) configurada em produção
[ ] PAGARME_WEBHOOK_SECRET configurado em ambos (valores diferentes)
[ ] Testar uma assinatura completa em staging com cartão de teste
[ ] Testar uma assinatura completa em staging com PIX de teste
[ ] Confirmar que o webhook payment.paid chega e processa
    corretamente (incluindo o fluxo de cashback de indicação)
[ ] Só então configurar produção e testar com um pagamento real
    pequeno (ex: a própria assinatura do fundador) antes de abrir
    para usuários externos
```

---

## 3. Ordem de Implementação Recomendada

```
1. SMS primeiro (mais simples, menos arriscado financeiramente)
2. Validar SMS funcionando em staging
3. Pagar.me em modo sandbox em staging
4. Validar fluxo completo de assinatura + webhook em staging
5. Só então avançar para chaves de produção de ambos
```