# Importação de planilhas

Layouts das planilhas que alimentam o CRM: a planilha de renovações da corretora e o relatório de renovações (próximos ~30 dias) que cada seguradora exporta. Base para os modelos de importação por seguradora (`porto_v1`, `tokio_v1` etc., ver [modelo de dados](../arquitetura/modelo-dados.md#modelos-de-importação)).

> **Regra inegociável:** as planilhas reais têm dados pessoais (nome, CPF/CNPJ, e-mail, telefone, placa, apólice) e **nunca** vão para o Git. Este repositório é público.

## Onde ficam os arquivos

| Pasta | Conteúdo | Vai para o Git? |
| --- | --- | --- |
| `data/raw/<seguradora>/` | Relatórios reais, como baixados da seguradora | **Não** (`data/` está no `.gitignore`) |
| `data/raw/consolidada/` | Planilha de renovações da corretora (uma aba por mês) | **Não** |
| `data/raw/_nao_identificado/` | Arquivos cuja seguradora não foi identificada | **Não** |
| `tests/fixtures/planilhas/<seguradora>/` | `exemplo-anonimizado.*`: mesma estrutura, dados 100% inventados | Sim |

O `.gitignore` também bloqueia `*.xls`, `*.xlsx`, `*.xlsm` e `*.csv` em qualquer pasta, exceto `tests/fixtures/`.

## Layouts conhecidos

| Seguradora | Arquivo real | Formato real | Doc |
| --- | --- | --- | --- |
| Corretora (consolidada) | — (ainda não recebida) | .xlsx, uma aba por mês | [consolidada.md](consolidada.md) |
| Porto Seguro (e Azul) | `.xlsx` | XLSX | [porto.md](porto.md) |
| Tokio Marine | `.xls` | **XLSX** com extensão .xls | [tokio.md](tokio.md) |
| Allianz | `.xls` | XLS binário (BIFF) | [allianz.md](allianz.md) |
| Mapfre | `.csv` | CSV `;`, cp1252 | [mapfre.md](mapfre.md) |
| Suhai | `.xls` | **HTML** (tabela) com extensão .xls | [suhai.md](suhai.md) |
| HDI | `.xls` | **Texto separado por TAB** com extensão .xls | [hdi.md](hdi.md) |
| Zurich | `.xls` | HTML **sem tabela** (exportação vazia) | [zurich.md](zurich.md) |
| Azul | — | Vem dentro do relatório da Porto | [porto.md](porto.md) |

A extensão não diz o formato: três dos sete arquivos têm extensão `.xls` mas não são XLS. O importador precisa detectar o formato pelo conteúdo (o script abaixo faz isso).

## Como inspecionar uma planilha

```bash
python -m venv .venv
.venv/Scripts/pip install -r scripts/requirements.txt      # Windows (Linux/macOS: .venv/bin/pip)
.venv/Scripts/python scripts/inspecionar_planilha.py data/raw/porto   # pasta ou arquivo
```

Mostra, para cada arquivo: formato real (xlsx, xls, HTML disfarçado de .xls ou texto/CSV), abas, linha do cabeçalho, colunas com tipo inferido e % preenchido, quantidade de linhas e 3 linhas de exemplo **mascaradas**. Todo texto sai mascarado por padrão (letras → `A`/`a`, dígitos → `9`); só colunas de categoria (ramo, produto, status, prêmio, comissão, datas de vigência) aparecem em claro. Se o cabeçalho não for reconhecido, os nomes de coluna também são mascarados.

Para regenerar as amostras anonimizadas: `.venv/Scripts/python scripts/gerar_fixtures_seguradoras.py`.

## Esquema de destino

Cada linha de relatório vira (ver [docs/arquitetura/modelo-dados.md](../arquitetura/modelo-dados.md)):

- **`clientes`**: nome, CPF/CNPJ (só dígitos; chave de deduplicação quando existir), e-mail, telefone.
- **`seguros`**: seguradora (fixa pelo modelo), ramo, nº da apólice, início e fim de vigência, prêmio líquido, comissão %, parcelas.
- **`renovacoes`**: vencimento (= fim da vigência atual), corretor, status (`pendente` por padrão nos relatórios das seguradoras).

Deduplicação: CPF/CNPJ quando houver; senão, nome normalizado (mesmo nome = mesmo cliente). Um CPF que chegue num relatório completa o cadastro de um cliente que só tinha nome.

## Conversões que aparecem em mais de um relatório

| Situação | Exemplo inventado | Conversão |
| --- | --- | --- |
| Data dd/mm/aaaa em texto | `05/11/2026` | `2026-11-05` |
| Data com hora | `05/11/2026 00:00:00`, `2026-11-05 00:00:00.0` | descartar a hora |
| Data ISO em texto | `2026-11-05` | direto |
| Valor com milhar e vírgula | `1.234,56` | `1234.56` |
| Valor só com vírgula | `1234,5678` | `1234.5678` (arredondar a 2 casas) |
| Valor zerado | `0` | sem informação (nulo) |
| CPF/CNPJ sem zeros à esquerda | 10 ou 13 dígitos | completar com zeros até 11/14 e validar |
| Ramo por código SUSEP/da seguradora | `531`, `1211` | tabela de códigos por seguradora (ver dúvidas em cada doc) |

## Dúvidas gerais em aberto

1. **Ramo residencial:** todos os relatórios recebidos são de auto (ou combinado auto+residencial na Porto). Falta um exemplo com seguro residencial puro de cada seguradora, para conhecer o código/descrição do ramo.
2. **HDI** não está na tabela `seguradoras` (migration `…000200`): precisa ser cadastrada antes de importar.
3. **Zurich:** o arquivo recebido veio vazio. Exportar de novo (talvez outro filtro de datas ou outro formato no portal).
4. **Planilha consolidada da corretora:** ainda não recebida em `data/raw/consolidada/`. O layout em [consolidada.md](consolidada.md) é o da reunião/prints.
