# Planilha de renovações da corretora (consolidada)

> Modelo: `renovacoes_consolidada_v1`. Arquivo real: `data/raw/consolidada/` (**ainda não recebido**; este layout vem da reunião e de um print da planilha). Movido de [docs/produto/mvp.md](../produto/mvp.md).

## Formato

- Planilha (Google Sheets/Excel) com **uma aba por mês**.
- Cabeçalho na linha 1. Sem linhas de título.
- Montada à mão pela equipe a partir dos relatórios das seguradoras.

## Colunas

| Coluna original | Exemplo inventado | Campo de destino | Conversão |
| --- | --- | --- | --- |
| A Seguradoras | Tokio Marine | `seguros.seguradora_id` | Normalizar nomes e apelidos (ex.: "Porto Seguro" / "Porto") |
| B Nome do Segurado | ANA FICTICIA | `clientes.nome` | **Sem CPF**: deduplicação por nome normalizado |
| C Ramo | Auto, Residencial, Vida | `seguros.ramo` | Texto → enum |
| D Vigência | 2/4/2026 | `renovacoes.vencimento` | Formato **M/D/AAAA** (EUA) quando vier como texto; tratar com cuidado |
| E Corretor | R, C | `renovacoes.corretor_id` | R = Renata, C = Carlos |
| F Renovada | ✅ / ❌ | `renovacoes.status` | ✅ = renovada, ❌ = não renovada, vazio = pendente |
| G Cotada | TRUE | `renovacoes.cotada` | Booleano; com F vazio e G = TRUE → `cotando` |
| H Prêmio Líquido | (vazio) | `seguros.premio_liquido` | Opcional; "R$ -" = vazio |
| I Comissão | (vazio) | `seguros.comissao_pct` | Percentual (0,15 em célula de % = 15) |
| J Valor Recebido | R$ - | `renovacoes.valor_recebido` | Opcional |
| K N. Parcelas | (vazio) | `seguros.parcelas` | Opcional |
| L Valor Mensal | - | `seguros.valor_parcela` | Opcional |
| M Seguradora Atual | (vazio) | `renovacoes.seguradora_fechada_id` | Quando preenchida e diferente de A, o cliente trocou de seguradora |

## Dúvidas em aberto

1. Conferir com o arquivo real: as datas vêm como data do Excel ou como texto M/D/AAAA?
2. Como o Google Sheets exporta as colunas "Renovada" (lista com ✅/❌) e "Cotada" (caixa de seleção) para .xlsx: texto, booleano ou fórmula?
3. Há abas além das mensais (resumo, totais)?
