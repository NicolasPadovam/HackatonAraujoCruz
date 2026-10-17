# 001 — Tela inicial com renovações vencendo

**Status:** em dev

## Contexto

Hoje a tela inicial é a lista de Renovações do mês ([mvp.md](../mvp.md) §Funcionalidades, item 4). Quem abre o sistema precisa ver primeiro o que está para vencer, sem filtrar nada.

## Comportamento esperado

- Nova tela **Início** na rota `/`, primeiro item do menu. Renovações passa para `/renovacoes`.
- Lista as renovações **em aberto** (pendente ou cotando) que vencem em **até 10 dias** ou **já venceram**, de todos os ramos, corretores e meses.
- Ordem: por vencimento, a mais atrasada primeiro.
- Faixas de alerta (dias = vencimento − hoje):

  | Dias | Faixa | Visual |
  | --- | --- | --- |
  | 6 a 10 | atenção baixa | neutro |
  | 2 a 5 | preste atenção | amarelo |
  | 1, 0 (hoje) ou negativo (vencida) | urgente | vermelho |

- Cada linha mostra: prazo ("vence em 3 dias", "venceu há 2 dias"), segurado, ramo, seguradora, corretor, status.
- Contadores no topo: quantas em vermelho, amarelo e neutro.
- Clicar numa linha abre o mesmo painel de andamento da tela Renovações (`RenovacaoSheet`). Ao marcar como renovada / não renovada, ela sai da lista.
- Lista vazia: mensagem "Nenhuma renovação vencendo nos próximos 10 dias".

## Fora de escopo

- Notificação por e-mail, WhatsApp ou push. O aviso existe só dentro do sistema.
- Prazos configuráveis pelo usuário (10/5/1 ficam fixos no código).
- Filtros na tela inicial (para filtrar, usa-se a tela Renovações).
- Seguros sem renovação importada (ex.: vida fora da planilha) não aparecem.

## Impacto no modelo de dados

Nenhum. Usa `renovacoes.vencimento` e `renovacoes.status`.

## Impacto na API

Nenhum (protótipo lê do store local). Com Supabase: uma consulta de leitura em `renovacoes` filtrando status em aberto e `vencimento <= hoje + 10`.

## Impacto na UI

- `pages/Inicio.tsx` (nova) e rota/menu em `App.tsx`.
- `lib/format.ts`: função única `faixaVencimento(iso)` com as regras acima, reaproveitada por Renovações e Painel.
- Coluna "Prazo" de Renovações e o KPI "vencendo em até 7 dias" do Painel passam a usar a mesma regra (hoje usam 7 dias, vermelho).

## Critério de aceite

1. Renovação pendente vencendo em 8 dias aparece sem cor de alerta; em 11 dias não aparece.
2. Vencendo em 5 e em 2 dias: amarelo. Em 1 dia, hoje ou vencida: vermelho.
3. Renovação com status renovada ou não renovada nunca aparece, mesmo vencida.
4. Atualizar o status pelo painel lateral remove a linha sem recarregar a página.
5. Testes unitários de `faixaVencimento` cobrindo 11, 10, 6, 5, 2, 1, 0 e −1 dias, com datas fictícias.

## Decisões

- Vencidas: aparecem todas as que estão em aberto, sem limite de dias.
- Painel e Renovações usam a mesma regra 10/5/1 (`faixaVencimento` em `lib/format.ts`).

## Perguntas em aberto

1. Filtrar pelo corretor logado quando houver login, ou todos veem tudo?
