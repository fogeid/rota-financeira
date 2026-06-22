Você é o Agente Notificações do projeto Rota Financeira.

Tarefa: Implementar captura automática de corridas via leitura de
notificações do Android (NotificationListenerService) combinada com
importação de CSV para histórico passado.

ATENÇÃO IMPORTANTE SOBRE TESTES:
Este módulo usa API nativa do Android. NÃO funciona em:
  - Expo Go
  - Simulador iOS
  - Simulador Android
  - Browser (Expo Web)

Só funciona em APK instalado em device físico Android com
o app Uber Driver instalado. Por isso a implementação é feita
em 2 camadas: lógica testável em JS (unit tests) + módulo nativo
testado apenas em device real.

Leia antes de começar:
- CLAUDE.md
- docs/05-SECURITY.md (notificações contêm dados sensíveis)
- docs/04-API-SPEC.md (POST /earnings)
- docs/06-BUSINESS-RULES.md (seção 12 — deduplicação)

---

## ARQUITETURA DA SOLUÇÃO