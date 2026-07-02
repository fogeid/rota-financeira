# AGENTE 18 — Configurar EAS Build (Sair do Teste Local no Browser)

```
Você é o Agente 18 do projeto Rota Financeira.

Contexto: O app mobile está sendo testado hoje via Expo no browser
(modo web do Expo, não um build real de Android/iOS). Isso explica
por que vários bugs anteriores só apareceram em testes — o
comportamento no browser difere do app real em device. Esta tarefa
configura o EAS Build para gerar builds reais instaláveis, alinhado
aos 2 ambientes (staging/production) já definidos.

Leia obrigatoriamente:
- docs/14-GIT-WORKFLOW.md
- docs/15-RAILWAY-DEPLOY.md (para saber as URLs de staging/production
  que o app vai consumir)

---

## PASSO 0 — Reconhecimento

  cat apps/mobile/eas.json 2>/dev/null
  cat apps/mobile/app.json | grep -A 5 "expo"

Confirmar se já existe alguma configuração parcial de EAS (mencionada
em auditorias anteriores como já presente) ou se precisa criar do zero.

---

## PARTE 1 — Instalar e autenticar EAS CLI (ação do usuário, documentar)

  Isso requer login interativo do usuário — gerar as instruções,
  não tentar executar de forma não-interativa:

  npm install -g eas-cli
  eas login
  eas build:configure

---

## PARTE 2 — eas.json com 3 perfis (development, staging, production)

  // apps/mobile/eas.json

  {
    "cli": {
      "version": ">= 5.0.0"
    },
    "build": {
      "development": {
        "developmentClient": true,
        "distribution": "internal",
        "android": { "buildType": "apk" },
        "env": {
          "EXPO_PUBLIC_API_URL": "http://localhost:3000",
          "EXPO_PUBLIC_ENV": "development"
        }
      },
      "staging": {
        "distribution": "internal",
        "android": { "buildType": "apk" },
        "env": {
          "EXPO_PUBLIC_API_URL": "https://[URL-STAGING-RAILWAY].up.railway.app",
          "EXPO_PUBLIC_ENV": "staging"
        }
      },
      "production": {
        "distribution": "store",
        "android": { "buildType": "app-bundle" },
        "ios": { "distribution": "store" },
        "env": {
          "EXPO_PUBLIC_API_URL": "https://[URL-PRODUCTION-RAILWAY].up.railway.app",
          "EXPO_PUBLIC_ENV": "production"
        }
      }
    },
    "submit": {
      "production": {}
    }
  }

  Substituir as URLs placeholder pelas URLs reais geradas pelo
  Railway após o AGENTE-17 ser executado e o deploy inicial acontecer.

---

## PARTE 3 — Confirmar que o app lê EXPO_PUBLIC_API_URL corretamente

  grep -rn "API_URL\|baseURL\|localhost:3000" apps/mobile/src/services/api.ts

  // Garantir que a configuração do axios/fetch usa a env var, NUNCA
  // uma URL hardcoded (incluindo o IP 54.232.189.113 visto em
  // sessões anteriores, que era a máquina local do usuário exposta
  // — isso deve ser completamente substituído):

  const API_URL = process.env.EXPO_PUBLIC_API_URL;

  if (!API_URL) {
    throw new Error('EXPO_PUBLIC_API_URL não configurada — verificar eas.json ou .env');
  }

  export const api = axios.create({ baseURL: API_URL });

  Buscar e eliminar QUALQUER URL hardcoded restante no código:

  grep -rn "54\.232\.189\.113\|localhost:3000\|http://192\." apps/mobile/src --include="*.ts" --include="*.tsx"

---

## PARTE 4 — Primeiro build de staging (para o usuário rodar)

  Documentar o comando que o usuário vai rodar (build acontece nos
  servidores da Expo, não localmente):

  cd apps/mobile
  eas build --profile staging --platform android

  Isso gera um APK instalável diretamente em devices Android de
  teste (sem precisar de loja), o que resolve o "testar no browser"
  — o app passa a rodar de verdade, expondo bugs que só aparecem em
  ambiente nativo real (ex: comportamento de notificações, câmera,
  permissões do sistema).

---

## PARTE 5 — app.json: metadados básicos para quando for a hora de loja

  Mesmo sem submeter para as lojas ainda, preparar os metadados
  básicos agora evita retrabalho depois:

  // apps/mobile/app.json
  {
    "expo": {
      "name": "Rota Financeira",
      "slug": "rota-financeira",
      "version": "1.0.0",
      "icon": "./assets/icon.png",
      "android": {
        "package": "app.rotafinanceira.mobile",
        "versionCode": 1
      },
      "ios": {
        "bundleIdentifier": "app.rotafinanceira.mobile",
        "buildNumber": "1"
      }
    }
  }

  Confirmar se já existem ícone e splash screen reais (ou se ainda
  são os padrões do Expo) — se forem os padrões, isso é um item a
  resolver antes de qualquer submissão para loja, mas NÃO bloqueia
  o build de staging para teste interno.

---

## CHECKLIST FINAL

  [ ] eas.json criado com os 3 perfis
  [ ] Nenhuma URL hardcoded restante no código do mobile (incluindo
      o IP da máquina local usado durante o desenvolvimento)
  [ ] app.json com identificadores básicos de pacote configurados
  [ ] Instruções claras entregues ao usuário para rodar o primeiro
      build de staging
  [ ] (Após o usuário rodar o build) Testar o APK gerado em um
      device Android real, repetindo pelo menos as seções 1, 2 e 11
      do roteiro qa/REGRESSAO-GERAL.md — várias coisas só se
      confirmam em build real, não no browser

  git add .
  git commit -m "chore: configurar EAS Build com perfis development/staging/production"
  git push origin develop
```