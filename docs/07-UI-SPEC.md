# Rota Financeira — Especificação de UI/UX

**Versão:** 1.0 | **Data:** Junho 2026
**Referência visual:** arquivo rota-financeira-app.html (protótipo interativo aprovado)

---

## 1. Design Tokens

### Cores (tema escuro — único tema no MVP)

```typescript
const colors = {
  bg:        '#0F1117',  // Background principal
  bg2:       '#181B24',  // Background de modais e bottom sheets
  bg3:       '#1E2130',  // Background de cards internos
  card:      '#1E2130',  // Cards
  border:    'rgba(255,255,255,0.07)',  // Bordas padrão
  border2:   'rgba(255,255,255,0.12)', // Bordas de destaque

  text:      '#F0F2F8',  // Texto primário
  text2:     '#8A8FA8',  // Texto secundário
  text3:     '#555A72',  // Texto terciário (labels, hints)

  green:     '#2ECC8A',  // Cor de acento principal. Sucesso, metas, positivo
  greenBg:   'rgba(46,204,138,0.12)',
  greenBorder: 'rgba(46,204,138,0.25)',

  amber:     '#F5A623',  // Atenção, alertas intermediários
  amberBg:   'rgba(245,166,35,0.12)',
  amberBorder: 'rgba(245,166,35,0.25)',

  red:       '#F25C5C',  // Erro, risco, valor negativo
  redBg:     'rgba(242,92,92,0.12)',
  redBorder: 'rgba(242,92,92,0.25)',

  blue:      '#4F8EF7',  // Informativo, parcela do carro
  blueBg:    'rgba(79,142,247,0.12)',
  blueBorder: 'rgba(79,142,247,0.25)',
}
```

### Tipografia

```typescript
const typography = {
  fontDisplay: 'Space Grotesk',  // Números grandes, títulos, valores monetários
  fontBody:    'Inter',          // Textos, labels, descrições

  // Escala
  h1:    { size: 28, weight: '700', font: 'display' },  // Valor principal da home
  h2:    { size: 22, weight: '700', font: 'display' },  // Título de tela
  h3:    { size: 18, weight: '600', font: 'display' },  // Subtítulo / valor grande
  body:  { size: 15, weight: '400', font: 'body' },     // Texto corrido
  label: { size: 13, weight: '500', font: 'body' },     // Labels de campos
  small: { size: 11, weight: '400', font: 'body' },     // Hints, metadados
  micro: { size: 10, weight: '500', font: 'body' },     // Labels de eixo, eyebrow
}
```

### Espaçamento e Bordas

```typescript
const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 22, xxl: 28 }
const radius = { xs: 7, sm: 10, md: 14, lg: 16, xl: 20, full: 99 }
```

---

## 2. Componentes Padrão

### HeroCard
Card de destaque com gradiente sutil. Usado em: Home (lucro do dia), Ganhos (total bruto), Custos (total).
```
- Background: gradiente linear 135° de #162F25 para #1a2d3d (positivo) ou #2d1818 para #2d201a (negativo)
- Border: 1px rgba(46,204,138,0.2)
- Padding: 20px
- Label: 11px, cor do acento com 70% opacidade
- Valor: 38px, font-display, bold, cor do acento
- Sub: 12px, text2
- Progress bar opcional na parte inferior
```

### Card
Card padrão para listas e informações agrupadas.
```
- Background: var(card)
- Border: 1px var(border)
- Border-radius: 16px
- Padding: 16px
```

### MetricCard (2 por linha)
Card compacto para métricas. Sempre em grid 2 colunas.
```
- Background: bg3
- Border: 1px border
- Border-radius: 10px
- Padding: 13px
- Label: 10px uppercase text3
- Valor: 18px font-display
- Sub: 10px text3
```

### ListItem
Item de lista com ícone, info e valor.
```
- Altura: mínimo 48px
- Divisor: 1px border entre itens
- Ícone: 36x36px, border-radius 10px, background colorido
- Nome: 13px weight 500
- Sub: 11px text3
- Valor: 14px font-display, colorido conforme contexto
```

### AlertBox
Caixa de alerta contextual com ícone.
```
- Cores: green / amber / red / blue (background + border + texto da cor correspondente)
- Padding: 12px 14px
- Border-radius: 10px
- Ícone emoji: 16px
- Texto: 12px, line-height 1.5
```

### ProgressBar
Barra de progresso com label.
```
- Background: rgba(255,255,255,0.07)
- Fill: animado, cor contextual
- Height: 7px (padrão) ou 10px (destaque) ou 14px (grande)
- Border-radius: 99px
- Label header: % à direita, colorida conforme progresso
```

### FAB (Floating Action Button)
Botão flutuante de ação primária.
```
- Tamanho: 52x52px
- Background: green
- Border-radius: 50%
- Position: absolute, bottom 96px, right 20px (acima da nav)
- Shadow: 0 4px 20px rgba(46,204,138,0.4)
- Ícone: + centralizado, cor #0F1117
```

### BottomSheet / Modal
Painel deslizante de baixo para cima.
```
- Background: bg2
- Border-radius: 28px 28px 0 0
- Border-top: 1px border2
- Handle: 36x4px, background border2, margin 12px auto
- Max-height: 86% da tela
- Animação: slideUp 300ms cubic-bezier(.4,0,.2,1)
- Fechar: toque no overlay escuro
```

### Chip de Seleção
Para seleção de categorias em formulários.
```
- Default: background bg3, border border, text text2
- Active: background greenBg, border greenBorder, text green
- Padding: 6px 14px
- Border-radius: 99px
- Font: 12px weight 500
```

### FormInput
Campo de formulário padrão.
```
- Background: bg3
- Border: 1px border (focus: green)
- Border-radius: 10px
- Padding: 12px 14px
- Font: 15px Inter
- Placeholder: text3, 14px
- Label: 11px uppercase weight 500 text3, margin-bottom 7px
```

### ConfirmButton
Botão primário de confirmação.
```
- Background: green
- Text: #0F1117, 15px, font-display, weight 600
- Padding: 14px
- Border-radius: 10px
- Width: 100%
- Active: opacity 0.88, scale 0.98
```

### Badge
Indicador de status compacto.
```
- Tamanhos de fonte: 10px weight 600
- Padding: 3px 8px
- Border-radius: 99px
- Variantes: green / amber / red / blue (background + border + texto)
```

### WeekBarChart
Gráfico de barras semanal (7 colunas).
```
- Altura total da área: 60px
- Barra verde: >= meta diária
- Barra âmbar: < meta diária (mas trabalhou)
- Cinza (empty): não trabalhou / sem dados
- Label dia: 9px uppercase text3
- Label valor: 9px text3
```

---

## 3. Navegação

### Tab Bar Inferior (6 tabs)

```
Ordem: Home | Ganhos | Custos | Meu Carro | Relatórios | Perfil
Background: rgba(15,17,23,0.95) com blur
Height: 82px (inclui safe area do iOS)
Border-top: 1px border
Ícone ativo: verde (green)
Ícone inativo: text3
Label: 9px, mesma cor do ícone
```

### Mapeamento de ícones

```
Home       → house / home
Ganhos     → currency-dollar / cash
Custos     → gas-station / receipt
Meu Carro  → car
Relatórios → chart-bar / bar-chart
Perfil     → user / person
```

---

## 4. Fluxos de Tela

### Fluxo de Cadastro (Onboarding)

```
Splash →
Step 1: Nome + CPF + Telefone →
OTP Screen (verificação SMS) →
Step 2: E-mail + Senha →
Step 3: Dados do veículo →
Step 4: Dados do financiamento →
Step 5: Conectar plataforma (Uber/99) →
Tutorial (4 slides) →
Home
```

### Fluxo de Login

```
Login Screen →
[Sucesso] → Home
[Erro] → Mensagem inline
[Esqueci senha] → Informe telefone → OTP → Nova senha → Login
[Biometria] → Desbloqueio nativo → Home
```

### Fluxo de Registro de Gasto (Bottom Sheet)

```
[FAB ou atalho home] →
Step 1: Selecionar tipo (4 opções em grid 2x2) →
Step 2: Formulário específico do tipo →
Step 3: Tela de sucesso com animação →
[Fechar] ou [Registrar outro]
```

### Fluxo de Assinatura

```
[Tela de upgrade] →
Selecionar plano (Mensal / Anual) →
Selecionar pagamento (Cartão / PIX) →
[Cartão] → Formulário tokenizado Pagar.me →
[PIX] → QR Code com countdown 30min →
Confirmação de pagamento →
Home com badge Pro
```

---

## 5. Telas — Especificação por Tela

### Home
```
Header: saudação + data + avatar com notif dot
HeroCard: Lucro líquido do dia (grande, destaque)
QuickActions: 2 botões em grid (Registrar corrida / Registrar gasto)
MetricGrid: 4 métricas (Parcela, IR, Semana, Custo/km)
AlertBoxes: máximo 2, priorizados por urgência
Section: Semana — WeekBarChart
Section: Plataformas conectadas — ListItems com status
```

### Ganhos
```
Header: data + título
HeroCard: Total bruto do dia
MetricGrid: 4 (Semana, Mês, Melhor horário, Corridas hoje)
Section: Por plataforma — ListItems
Section: Últimas corridas — ListItems (últimas 4, "ver mais" ao fim)
Section: Evolução mensal — MiniChart (barras por mês)
```

### Custos
```
Header: mês atual + título
HeroCard: Total custos do mês (background vermelho/laranja)
MetricGrid: 4 (Combustível, Manutenção, Km rodados, Lavagens)
Section: Abastecimentos recentes — ListItems
Section: Manutenções — ListItems
Section: Alertas — AlertBoxes
FAB: + para registrar novo gasto
```

### Meu Carro
```
Header: "Financiamento" + título
Card: Dados do veículo + parcela
MetricGrid: 4 (Meta diária, Só parcela, Só renda, Total mensal)
Section: Distribuição — barra segmentada + legenda
Section: Progresso da parcela — barra grande + detalhes
Section: Semana — WeekBarChart
AlertBoxes: saúde financeira + dica de recuperação
```

### Relatórios
```
Header: título + tabs (Junho / Maio / 2026)
HeroCard: Lucro líquido do período
MetricGrid: 4 (Ganho bruto, Lucro real, Parcela paga, Renda restante)
Section: Detalhamento — stat rows
Section: Comparativo — stat rows com deltas
AlertBox: projeção por IA
Button: Exportar PDF (apenas Pro)
```

### Perfil
```
Header: título
Card: Avatar + nome + plano badge
Section: Meu veículo — stat rows + botão editar
Section: Plataformas — setting items com toggles
Section: Preferências — setting items (notif, biometria, dark mode)
Section: Conquistas (V2) — conquista cards
Card: Plano atual + data de renovação
Botão destrutivo: Excluir conta (vermelho, ao final)
```

---

## 6. Estados de Loading e Erro

### Loading
```
Skeleton screens: retângulos cinza animados no lugar do conteúdo
Nunca spinner no centro da tela (experiência ruim)
Dados críticos (lucro do dia, meta): skeleton de 2 linhas
Listas: 3 skeleton items
```

### Estado vazio
```
Ícone grande (40px) centralizado
Título: 16px, text
Sub: 13px, text2
CTA: botão verde quando aplicável

Exemplos:
- Ganhos vazios: "Nenhuma corrida hoje" + "Registrar manualmente"
- Custos vazios: "Nenhum gasto registrado" + "Registrar gasto"
```

### Erro
```
AlertBox vermelho no topo da tela
Mensagem: clara e em português simples
Botão "Tentar novamente" quando aplicável
Nunca mostrar detalhes técnicos ao usuário
```

---

## 7. Restrições de Design

- NUNCA usar tema claro (apenas escuro no MVP)
- NUNCA usar emojis como ícones de navegação
- NUNCA exibir CPF completo em nenhuma tela
- NUNCA exibir senha ou token em nenhuma tela
- NUNCA exibir credenciais de Uber/99 (nem mascaradas) após conexão
- NUNCA usar fonte menor que 10px
- Valores monetários: sempre com prefixo "R$" e 2 casas decimais
- Valores negativos (custos): prefixo "- R$" em vermelho
- Valores positivos (ganhos): sem prefixo adicional, em verde
