# Rota Financeira — Product Requirements Document (PRD)

**Versão:** 1.0 | **Data:** Junho 2026 | **Status:** Aprovado para desenvolvimento

---

## 1. Visão do Produto

Rota Financeira é um aplicativo mobile de gestão financeira exclusivo para motoristas de aplicativo (Uber, 99, iFood). Resolve um problema crítico: motoristas não sabem quanto ganham de verdade depois de descontar combustível, manutenção, impostos e a parcela do financiamento do veículo.

**Proposta de valor:** "Saiba exatamente quanto precisa ganhar por dia para pagar o carro, cobrir seus custos e ainda sobrar dinheiro no bolso."

---

## 2. Público-Alvo

- Motoristas de app ativos (Uber, 99, iFood, Lalamove)
- Faixa etária: 25–50 anos | Renda bruta: R$ 2.500–6.000/mês
- Dispositivo: Android 80%, iOS 20%
- Localização: capitais e cidades com +100k habitantes

---

## 3. Plataformas

- Mobile: Android 10+ e iOS 14+ via React Native + Expo
- Idioma: Português brasileiro exclusivamente
- NÃO há versão web no MVP nem V2

---

## 4. Funcionalidades MVP — Cadastro e Onboarding

| ID | Funcionalidade | Descrição |
|----|---------------|-----------|
| F01 | Cadastro CPF + telefone | OTP via SMS 6 dígitos. CPF validado por dígitos verificadores. CPF único no sistema |
| F02 | Nome completo | Obrigatório. Mínimo 2 palavras |
| F03 | E-mail | Obrigatório. Usado para recibos e recuperação de acesso. Validado por formato |
| F04 | Senha | Mínimo 8 chars, 1 maiúscula, 1 número. Armazenado como hash bcrypt (custo 12) |
| F05 | Verificação OTP | Código SMS válido por 5 minutos. Máximo 3 tentativas por código |
| F06 | Reenvio OTP | Permitido após 60 segundos. Máximo 5 reenvios por sessão |
| F07 | Cadastro do veículo | Modelo (texto, max 60 chars), ano (1990–2027), placa (AAA-0000 ou AAA0A00), consumo km/L (4–30) |
| F08 | Cadastro financiamento | Parcela mensal (R$ 100–10.000), dia vencimento (1–28), renda desejada (R$ 500–20.000), dias trabalho/mês (1–30) |
| F09 | Conexão plataforma | Uber e/ou 99. Mínimo 1 obrigatória para avançar |
| F10 | Tutorial onboarding | 4 telas fixas explicativas. Pode pular. Não repete após primeira vez |
| F11 | Trial Pro 14 dias | Ativado automaticamente no cadastro. Sem cartão. Exibir data de expiração |

## 5. Funcionalidades MVP — Autenticação

| ID | Funcionalidade | Descrição |
|----|---------------|-----------|
| F12 | Login CPF + senha | Tela principal de acesso |
| F13 | Recuperação de senha | OTP via SMS → nova senha. Mesmas regras da senha original |
| F14 | Sessão JWT | Access token 15 min + refresh token 30 dias. Refresh token rotaciona a cada uso |
| F15 | Logout | Invalida refresh token no servidor imediatamente |
| F16 | Bloqueio por tentativas | 5 tentativas falhas seguidas = bloqueio 15 minutos. Log do evento |
| F17 | Biometria | Face ID / Touch ID após primeiro login. Toggle nas configurações |
| F18 | Sessão em múltiplos devices | Não permitido no MVP. Login em novo device desloga o anterior |

## 6. Funcionalidades MVP — Home

| ID | Funcionalidade | Descrição |
|----|---------------|-----------|
| F19 | Lucro líquido do dia | ganho_bruto_dia - custos_proporcionais_dia |
| F20 | Barra de meta diária | % da meta. Verde ≥100%, âmbar 60–99%, vermelho <60% |
| F21 | Progresso da parcela | % coberta até hoje (soma lucros / parcela) |
| F22 | Gráfico semanal | Barras por dia da semana. Linha horizontal = meta diária |
| F23 | Alertas priorizados | Máximo 2. Ordenados por urgência. Toque navega para detalhe |
| F24 | Atalho registrar corrida | Abre modal de registro manual |
| F25 | Atalho registrar gasto | Abre bottom sheet de seleção de tipo de gasto |
| F26 | Status do sync | "Sync há X minutos" ou "Sync falhou — toque para tentar" |

## 7. Funcionalidades MVP — Ganhos

| ID | Funcionalidade | Descrição |
|----|---------------|-----------|
| F27 | Sync Uber automático | Diário às 04h. Credenciais criptografadas AES-256 |
| F28 | Sync 99 automático | Diário às 04h. Credenciais criptografadas AES-256 |
| F29 | Registro manual corrida | Plataforma, valor (R$), km rodados, horário início, data |
| F30 | Lista corridas do dia | Plataforma, valor, horário, origem (auto/manual) |
| F31 | Filtro plataforma e período | Uber/99/iFood/Todos × dia/semana/mês |
| F32 | Total por plataforma | Ganho bruto por plataforma no período |
| F33 | Melhor horário histórico | Horário de maior rendimento médio nos últimos 30 dias |

## 8. Funcionalidades MVP — Custos

| ID | Funcionalidade | Descrição |
|----|---------------|-----------|
| F34 | Registro abastecimento | Posto, litros, preço/litro, total pago, km odômetro, data |
| F35 | Custo/km automático | total_combustível_mês ÷ km_rodados_mês. Exibido em tempo real |
| F36 | Registro manutenção | Tipo (chip), descrição, valor, km atual, próxima revisão em km, toggle lembrete |
| F37 | Registro lavagem | Tipo chip (simples/completa/polimento/higienização), valor, data |
| F38 | Registro outros gastos | Descrição, categoria chip (seguro/IPVA/multa/estacionamento/outros), valor, data |
| F39 | Lembrete manutenção | Push quando km_odômetro_atual >= km_próxima_revisão |
| F40 | Histórico de custos | Lista mensal agrupada por categoria, valor e data |
| F41 | Resumo mensal de custos | Total por categoria e % sobre total de custos |
| F42 | Alerta custo/km alto | Push quando custo/km atual > média_3_meses × 1.10 |

## 9. Funcionalidades MVP — Meu Carro

| ID | Funcionalidade | Descrição |
|----|---------------|-----------|
| F43 | Painel do financiamento | Modelo, parcela mensal, dia de vencimento |
| F44 | Meta diária | (parcela + custos_mensais_estimados + renda_desejada) ÷ dias_trabalho |
| F45 | Distribuição dos R$ 100 | Barra segmentada: % parcela, % custos, % renda. Soma = 100% |
| F46 | Progresso da parcela | Barra: lucros_acumulados_no_mês ÷ parcela. Atualizada diariamente |
| F47 | Gráfico semanal | Barras por dia. Verde ≥ meta, âmbar < meta, cinza = não trabalhou |
| F48 | Dias restantes e meta residual | (parcela - acumulado) ÷ dias_úteis_restantes |
| F49 | Saúde financeira | Verde: parcela <40% bruto. Âmbar: 40–50%. Vermelho: >50% |
| F50 | Dica de recuperação | "Trabalhe X dias a mais para cobrir o déficit de R$ Y" |

## 10. Funcionalidades MVP — Relatórios

| ID | Funcionalidade | Descrição |
|----|---------------|-----------|
| F51 | Relatório mensal | Ganho bruto, total custos (detalhado), IR estimado, parcela separada, renda disponível |
| F52 | Comparativo mês anterior | Delta e variação % de cada item |
| F53 | Melhor e pior dia | Extremos de lucro líquido do mês |
| F54 | Custo/km médio | Calculado sobre todos os abastecimentos do mês |
| F55 | Projeção próximo mês | Média simples dos últimos 3 meses por item |
| F56 | Exportar PDF | Relatório mensal em PDF. Download local no device |
| F57 | Relatório anual | Consolidado de 12 meses para declaração IR |

## 11. Funcionalidades MVP — Impostos

| ID | Funcionalidade | Descrição |
|----|---------------|-----------|
| F58 | Cálculo IR mensal | Tabela progressiva IRPF 2026 sobre (ganho_bruto - deduções_permitidas) |
| F59 | Deduções automáticas | Soma combustível + manutenção registrados no mês |
| F60 | Card "Reserve R$ X" | Exibido na tela de impostos e como alerta na home |
| F61 | Lembrete vencimento | Push dia 25 de cada mês. Condição: IR_calculado > 0 |
| F62 | Histórico de recolhimentos | Lista meses: pago / pendente / vencido |
| F63 | Guia passo a passo | Como emitir DARF e pagar carnê-leão. Tela informativa estática |
| F64 | Relatório anual IR | Totais anuais formatados para declaração |

## 12. Funcionalidades MVP — Alertas

| ID | Alerta | Tipo | Condição |
|----|--------|------|----------|
| F65 | Meta batida | Push | lucro_líquido_dia >= meta_diária |
| F66 | Abaixo do ritmo | Push | projeção < parcela E dias_restantes > 5 |
| F67 | Parcela em risco | Push | déficit > 0 E dias_restantes <= 5 |
| F68 | Parcela vencendo | Push | dias_até_vencimento == 5 |
| F69 | Custo/km alto | Push | custo_km > média_3m * 1.10 |
| F70 | Manutenção no prazo | Push | km_atual >= km_próxima_revisão |
| F71 | IR vencendo | Push | dia_mês == 25 E IR > 0 |
| F72 | Sync concluído | Silencioso | após sync bem-sucedido |
| F73 | Sync falhou | Push | após 3 tentativas falhas |
| F74 | Pagamento aprovado | Push | webhook Pagar.me payment.paid |
| F75 | Pagamento falhou | Push | webhook Pagar.me payment.failed |
| F76 | Trial expirando | Push | trial_dias_restantes == 3 |

## 13. Funcionalidades MVP — Perfil e Configurações

| ID | Funcionalidade | Descrição |
|----|---------------|-----------|
| F77 | Ver dados pessoais | Nome, CPF mascarado, telefone mascarado, e-mail |
| F78 | Editar nome e e-mail | Confirmação por senha atual |
| F79 | Alterar senha | Senha atual + nova senha + confirmação |
| F80 | Alterar telefone | Novo número + OTP SMS de confirmação |
| F81 | Editar veículo | Todos os campos do veículo |
| F82 | Editar financiamento | Parcela, vencimento, renda, dias de trabalho |
| F83 | Status plataformas | Ver conectadas, toggle desconectar |
| F84 | Gerenciar assinatura | Plano atual, próxima cobrança, cancelar |
| F85 | Preferências de alerta | Toggle por tipo de alerta (F65–F76) |
| F86 | Biometria on/off | Toggle Face ID / Touch ID |
| F87 | Suporte | Abre WhatsApp com número da equipe |
| F88 | Termos de uso | Link externo |
| F89 | Política de privacidade | Link externo |
| F90 | Excluir conta | Confirmação por senha. Inicia exclusão em até 30 dias (LGPD) |

## 14. Funcionalidades MVP — Assinatura e Pagamento

| ID | Funcionalidade | Descrição |
|----|---------------|-----------|
| F91 | Trial 14 dias | Pro completo ao cadastrar, sem cartão. Exibir countdown |
| F92 | Tela de upgrade | Comparativo gratuito vs Pro. CTA "Assinar Pro" |
| F93 | Pro Mensal R$ 19,90 | Recorrência mensal via Pagar.me |
| F94 | Pro Anual R$ 159 | Cobrança única via Pagar.me |
| F95 | Cartão de crédito/débito | Tokenizado via Pagar.me. Número do cartão nunca no servidor |
| F96 | PIX | Para plano anual. QR Code gerado via Pagar.me. Válido 30 min |
| F97 | Renovação automática | Cobrança automática na data de renovação |
| F98 | Falha no pagamento | 3 tentativas em 5 dias → downgrade automático para gratuito |
| F99 | Cancelamento | Mantém acesso Pro até fim do período pago. Sem reembolso |
| F100 | Recibo por e-mail | Enviado automaticamente após cobrança aprovada |
| F101 | Reativação | Usuário cancelado pode reativar sem perder histórico |
| F102 | Upgrade gratuito → Pro | Durante trial ou após expiração. Não cobra período já trial |

---

## 15. Fora do Escopo — NUNCA implementar sem aprovação

- Processamento de pagamentos de corridas
- Carteira digital, conta bancária ou custódia de dinheiro
- Empréstimos, crédito ou antecipação de recebíveis
- Integração com DETRAN, Receita Federal ou governo
- Chat, fórum ou comunidade entre motoristas
- Marketplace de serviços automotivos
- Versão web ou desktop
- Suporte a outros países ou idiomas
- Qualquer funcionalidade não listada neste documento

---

## 16. Modelo de Receita

| Plano | Preço | Restrições do gratuito |
|-------|-------|------------------------|
| Gratuito | R$ 0 | Histórico 7 dias, 1 plataforma, sem IR, sem PDF, alertas básicos (F65, F68, F72) |
| Pro Mensal | R$ 19,90/mês | Sem restrições |
| Pro Anual | R$ 159/ano | Sem restrições |

---

## 17. Critérios de Aceite do MVP

- [ ] Cadastro completo em menos de 5 minutos
- [ ] Sync automático Uber funciona sem intervenção do usuário
- [ ] Meta diária calculada corretamente (validado por testes unitários)
- [ ] Alerta de parcela disparado com mínimo 5 dias de antecedência
- [ ] Assinatura contratada e cancelada pelo próprio usuário
- [ ] PDF exportado e legível no device
- [ ] Exclusão de conta remove todos os dados em até 30 dias
- [ ] Credenciais de plataformas nunca aparecem em logs ou respostas de API
