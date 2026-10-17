# Porto Seguro (e Azul)

> Modelo: `porto_v1`. Amostra: [tests/fixtures/planilhas/porto/exemplo-anonimizado.xlsx](../../tests/fixtures/planilhas/porto/exemplo-anonimizado.xlsx).

## Formato

- **XLSX** de verdade (extensão `.xlsx`), uma aba: `Sheet1`.
- Cabeçalho na **linha 1**, sem títulos. Nomes de coluna em camelCase.
- **Todas as células são texto**, inclusive datas e códigos.
- Datas em texto ISO: `AAAA-MM-DD`.
- O relatório traz também produtos da **Azul** (grupo Porto), ex.: `Azul Automóvel`.
- Arquivo recebido: 4 linhas de dados, vencimentos de out/2026.

## Colunas

| Coluna original | Exemplo inventado | Campo de destino | Conversão |
| --- | --- | --- | --- |
| `nomeRazaoSocial` | Ana Ficticia dos Santos | `clientes.nome` | Texto em caixa mista |
| `nomeSocialPessoa` | Ana Ficticia dos Santos | — | Igual a `nomeRazaoSocial` nos exemplos; ignorar (ou usar se o primeiro vier vazio) |
| `nomeProduto` | `Automóvel`, `Azul Automóvel`, `PROT COMB AUTO+RESID` | `seguros.ramo` + seguradora | "Azul …" → seguradora **Azul**; senão Porto. Ramo pelo nome/código do produto (ver dúvidas) |
| `codigoProduto` | `27`, `188`, `68` | `seguros.ramo` (via tabela) | Código do produto Porto |
| `codigoPessoa` | 12345678 | — | Código interno do cliente na Porto; poderia virar chave externa |
| `ramo` | `531` | `seguros.ramo` (via tabela) | Código SUSEP (531 = automóvel) |
| `sucursal` | `22` | — | Sem uso |
| `apolice` | 12345678 | `seguros.numero_apolice` | Texto |
| `endosso` | 0 | — | Sem uso |
| `origemProposta` | `12`, `20` | — | Sem uso |
| `numeroProposta` | 12345678 | — | Sem uso |
| `susep` | 12345J | — | SUSEP da corretora; sem uso |
| `dataEmissao` | 2025-10-01 | — | Sem uso |
| `dataFinalVigencia` | 2026-11-05 | `seguros.fim_vigencia`, `renovacoes.vencimento` | ISO em texto |
| `dataInicioVigencia` | 2025-11-05 | `seguros.inicio_vigencia` | ISO em texto |
| `status` | `ATIVO` | — | Situação da apólice atual; renovação entra como `pendente` |
| `cpfCnpj` | 11 dígitos | `clientes.cpf_cnpj` | Só dígitos; validar |
| `email` | cliente@exemplo.com | `clientes.email` | Pode vir vazio |
| `celular` | `(11) 9XX12-XX34` | — | **Vem mascarado pela própria Porto** (com X): inútil para contato |
| `ano` | `25` ou vazio | — | Provável ano do veículo (2 dígitos); sem uso |

## Colunas sem correspondência

`nomeSocialPessoa`, `codigoPessoa`, `sucursal`, `endosso`, `origemProposta`, `numeroProposta`, `susep`, `dataEmissao`, `status`, `celular`, `ano`.

## Decisões

- `PROT COMB AUTO+RESID` (código 68) é **um seguro só**: é um pacote, com preço próprio, diferente de contratar auto e residencial separados (decisão da equipe, 17/10/2026).

## Dúvidas em aberto

1. Tabela de `codigoProduto`/`nomeProduto` → ramo para os demais produtos.
2. Como aparece um seguro **residencial puro** neste relatório (código de produto e ramo)?
3. O relatório da Azul é sempre o mesmo da Porto, ou a Azul também exporta um arquivo próprio?
4. `codigoPessoa` vale guardar como identificador externo do cliente na Porto?
