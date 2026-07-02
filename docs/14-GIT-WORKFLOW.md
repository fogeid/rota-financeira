# Rota Financeira — Git Workflow e Ambientes

**Versão:** 1.0 | **Data:** Junho 2026

---

## 1. Estratégia de Branches

```
main                    → Produção. Só recebe merge de release/* via PR aprovado.
                           Todo push em main dispara deploy automático em PRODUÇÃO.

develop                 → Desenvolvimento/staging. Branch padrão de trabalho.
                           Todo push em develop dispara deploy automático em STAGING.

feature/nome-da-feature → Branches de trabalho do dia a dia, sempre a partir de develop.
                           Mergeadas em develop via PR (sem deploy automático).

fix/nome-do-bug         → Mesma lógica de feature/, para correções pontuais.

release/x.y.z           → Criada a partir de develop quando um conjunto de features
                           está pronto para ir para produção. Só existe durante a
                           janela de release. Mergeada em main E em develop ao final.

hotfix/nome             → Criada a partir de main, para corrigir um bug crítico em
                           produção sem esperar o próximo ciclo de release. Mergeada
                           em main E em develop ao final.
```

**Por que não pular direto de feature/ para main:** isso garante que
develop seja sempre testável em staging antes de qualquer coisa
chegar em produção, e que produção nunca receba código que não
passou por pelo menos um ambiente de teste real.

---

## 2. Fluxo do Dia a Dia

```
1. git checkout develop && git pull
2. git checkout -b feature/nome-da-feature
3. Trabalhar, commitar
4. git push origin feature/nome-da-feature
5. Abrir Pull Request para develop
6. CI roda (lint + testes) automaticamente no PR
7. Revisão (mesmo sendo só você, revisar o diff antes de mergear)
8. Merge em develop → deploy automático em STAGING
9. Testar em staging
10. Quando pronto para produção: criar release/x.y.z a partir de
    develop, abrir PR de release/x.y.z para main
11. Merge em main → deploy automático em PRODUÇÃO
12. Mergear release/x.y.z de volta em develop (manter sincronizado)
```

---

## 3. Proteções de Branch (configurar no GitHub)

### main
```
- Requer Pull Request antes de merge (sem push direto)
- Requer ao menos 1 aprovação (mesmo que seja autoaprovação em
  equipe pequena, force o hábito de revisar o PR antes de aprovar)
- Requer que os checks de CI passem (lint, build, testes)
- Não permite force push
- Não permite deletar a branch
```

### develop
```
- Requer Pull Request antes de merge
- Requer que os checks de CI passem
- Não permite force push
```

---

## 4. Versionamento de Variáveis de Ambiente

```
NUNCA commitar .env com valores reais.

.env.example          → committed, com chaves e valores de EXEMPLO/placeholder
.env                   → NUNCA committed (.gitignore), valores reais locais
.env.staging           → NUNCA committed, configurado diretamente no Railway
.env.production         → NUNCA committed, configurado diretamente no Railway

Cada ambiente (staging/production) no Railway tem seu PRÓPRIO
conjunto de variáveis — incluindo secrets de JWT diferentes entre
ambientes (nunca reaproveitar o mesmo ADMIN_JWT_SECRET ou
JWT_ACCESS_SECRET entre staging e produção).
```

---

## 5. Convenção de Commits

```
tipo(escopo): descrição curta no imperativo

Tipos: feat, fix, docs, refactor, test, chore, perf

Exemplos:
  feat(referral): adicionar saque por quantidade de indicações
  fix(auth): bloquear login de usuário desativado
  docs(admin): atualizar especificação de roles
```

Isso já é o padrão usado nos commits dos agentes até aqui — apenas
formalizando como convenção do projeto daqui para frente.

---

## 6. Mapa de Ambientes

| Ambiente | Branch | Backend | Banco | Propósito |
|---|---|---|---|---|
| Local | qualquer feature/fix | localhost:3000 | Docker local | Desenvolvimento do dia a dia |
| Staging | develop | Railway (staging) | Railway Postgres (staging) | Testes antes de produção, ambiente do AGENTE-REGRESSAO |
| Produção | main | Railway (production) | Railway Postgres (production) | Usuários reais |

Mobile e dashboard apontam para a URL de staging ou produção via
variável de ambiente de build (ver docs/14-RAILWAY-DEPLOY.md e
configuração do EAS).