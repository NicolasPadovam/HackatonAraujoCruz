# Tokio Marine

> Modelo: `tokio_v1`. Amostra: [tests/fixtures/planilhas/tokio/exemplo-anonimizado.xls](../../tests/fixtures/planilhas/tokio/exemplo-anonimizado.xls).

## Formato

- **XLSX com extensão `.xls`** (o conteúdo é um ZIP/OOXML). Ler como xlsx; ler como xls binário falha.
- Uma aba: `Sheet0`. Cabeçalho na **linha 1**, sem títulos.
- Todas as células são texto. Datas `dd/mm/aaaa`.
- Traz a apólice **anterior** e o negócio de **renovação** já com as novas datas.
- Arquivo recebido: 4 linhas de dados (auto e moto), vencimentos de nov/2026.

## Colunas

| Coluna original | Exemplo inventado | Campo de destino | Conversão |
| --- | --- | --- | --- |
| `Produto` | `Auto`, `Moto` | `seguros.ramo` | `Auto`/`Moto` → `auto` (ver dúvidas para residencial) |
| `Código do Cliente` | 12345678 | — | Código interno Tokio |
| `Nome Cliente` | ANA FICTICIA DOS SANTOS | `clientes.nome` | Maiúsculas |
| `CPF/CNPJ Segurado` | 11 dígitos | `clientes.cpf_cnpj` | Só dígitos; validar |
| `CPF/CNPJ Condutor` | 11 dígitos | — | Condutor (pode ser outra pessoa); não usar como cliente |
| `E-mail Segurado` | CLIENTE1@EXEMPLO.COM | `clientes.email` | Minúsculas |
| `Motivo/Situação` | `Disponível para Cálculo` | — | Situação da renovação na Tokio; renovação entra como `pendente` |
| `Apólice Anterior` | 12345678 | `seguros.numero_apolice` | Apólice que está vencendo |
| `Negocio Anterior`, `Item Anterior` | 123456789 | — | Sem uso |
| `Início Vigência Anterior` | 05/11/2025 | `seguros.inicio_vigencia` | dd/mm/aaaa |
| `Fim Vigência Anterior` | 05/11/2026 | `seguros.fim_vigencia`, `renovacoes.vencimento` | dd/mm/aaaa. **Este é o vencimento** |
| `Negócio Renovação`, `Item Renovação` | 123456789 | — | Sem uso |
| `Início Vigência Renovação` | 05/11/2026 | — | = fim da anterior |
| `Fim Vigência Renovação` | 05/11/2027 | — | Fim da próxima apólice, se renovar |
| `Código do Corretor` | 10001 | — | Código da corretora na Tokio |
| `Nome Empresa Parceira`, `Código Empresa Parceira`, `Código do Parceiro de Negocio` | (vazio) | — | Vazias no arquivo recebido |
| `Código Crivo` | 123 | — | Sem uso |
| `Quantidade Sinistro` | 0 | — | Poderia virar observação |
| `Quantidade Parcelas` | `1`, `5`, `12` | `seguros.parcelas` | Inteiro |
| `Descrição Item Segurado` | MARCA-MODELO 1.0 | — | Veículo; sem uso no MVP |
| `Placa`, `Chassi` | TST1A23 | — | Dados do veículo; não importar no MVP |
| `Cep Risco` | 01000123 | — | CEP do risco; sem uso no MVP |
| `Bônus`, `Bônus Interno` | `2`, `3`, `10` | — | Classe de bônus |
| `Código Sucursal` | `8106` | — | Sem uso |
| `CAP` | `-9`, `99` | — | Sem uso |
| `Telefone de Contato` | `(11) 40001234 / (11) 900012345` | `clientes.telefone` | **Vários telefones separados por " / "**: usar o primeiro celular (11 dígitos) |
| `Renovação Facilitada` | `NÃO` | — | Sem uso |

## Colunas sem correspondência

Prêmio e comissão **não vêm** neste relatório. Também ficam de fora: códigos internos, dados do veículo (placa, chassi, descrição), bônus, CAP, CEP.

## Dúvidas em aberto

1. Como a Tokio descreve um seguro **residencial** na coluna `Produto`?
2. `Motivo/Situação` tem outros valores (ex.: renovado, recusado)? Algum deveria mudar o status da renovação?
3. Usar `Fim Vigência Renovação` para já criar a apólice seguinte quando a equipe marcar "renovada"?
