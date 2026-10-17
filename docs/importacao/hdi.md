# HDI

> Modelo: `hdi_v1`. Amostra: [tests/fixtures/planilhas/hdi/exemplo-anonimizado.xls](../../tests/fixtures/planilhas/hdi/exemplo-anonimizado.xls).

> ⚠️ A HDI **não está** na tabela `seguradoras` (migration `…000200`). Cadastrar antes de importar.

## Formato

- **Texto separado por TAB com extensão `.xls`** (não é XLS). ASCII (nomes sem acento), linhas com CRLF, sem quebra no final.
- Cabeçalho na **linha 1**, sem títulos. Nomes de coluna abreviados em CamelCase.
- Datas `dd/mm/aaaa`; valores com vírgula decimal e até 4 casas (`1234,5678`).
- Arquivo recebido: 2 linhas de dados, vencimentos de out/2026.

## Colunas

| Coluna original | Exemplo inventado | Campo de destino | Conversão |
| --- | --- | --- | --- |
| `Empresa` | `01` | — | Sem uso |
| `Sucursal` | `068` | — | Sem uso |
| `Carteira` | `431` | `seguros.ramo` (via tabela) | Código da carteira/ramo (ver dúvidas) |
| `TipDocum` | `A` | — | Tipo de documento (A = apólice?) |
| `SeqDocum` | 123456 | `seguros.numero_apolice` | Junto com sucursal/carteira formaria o nº completo? (ver dúvidas) |
| `Endosso` | 123456 | — | Sem uso |
| `Nome` | ANA FICTICIA DOS SANTOS | `clientes.nome` | Maiúsculas, sem acento |
| `CliEspecial` | `ESPECIAL` | — | Classificação do cliente na HDI |
| `FimVigencia` | 05/11/2026 | `seguros.fim_vigencia`, `renovacoes.vencimento` | dd/mm/aaaa |
| `PremioLiq` | `1234,5678` | `seguros.premio_liquido` | Vírgula decimal; arredondar a 2 casas |
| `TotIndeniza` | (vazio) | — | Total indenizado (sinistros) |

## Colunas sem correspondência

Não há **CPF/CNPJ**, e-mail, telefone, início de vigência nem comissão. Cliente só pelo nome.

## Dúvidas em aberto

1. O que é a carteira `431`, e qual código a HDI usa para **residencial**?
2. O número da apólice é `SeqDocum` sozinho ou `Empresa/Sucursal/Carteira/SeqDocum`?
3. O portal da HDI permite exportar em .xlsx ou com CPF/CNPJ?
