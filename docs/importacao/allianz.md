# Allianz

> Modelo: `allianz_v1`. Amostra: [tests/fixtures/planilhas/allianz/exemplo-anonimizado.xls](../../tests/fixtures/planilhas/allianz/exemplo-anonimizado.xls).

## Formato

- **XLS binário** (BIFF/OLE2) de verdade. Ler com `xlrd`.
- Uma aba: `title.aplication`. Cabeçalho na **linha 1**, sem títulos.
- Todas as células são texto. Datas `dd/mm/aaaa`; valores `1.234,56`.
- Arquivo recebido: 4 linhas de dados, vencimentos de nov/2026.

## Colunas

| Coluna original | Exemplo inventado | Campo de destino | Conversão |
| --- | --- | --- | --- |
| `Apólice` | `123456789J123456789` | `seguros.numero_apolice` | Texto (contém letra) |
| `Item` | `1` | — | Sem uso |
| `CPF` | 11 dígitos | `clientes.cpf_cnpj` | Só dígitos; validar. Nome da coluna diz CPF, mas pode vir CNPJ (confirmar) |
| `Nome` | ANA FICTICIA DOS SANTOS | `clientes.nome` | Maiúsculas |
| `Ramo` | `1211` | `seguros.ramo` (via tabela) | Código Allianz (ver dúvidas) |
| `Fim de Vigencia` | 05/11/2026 | `seguros.fim_vigencia`, `renovacoes.vencimento` | dd/mm/aaaa |
| `Prazo para Renovação` | 05/10/2026 | — | Data-limite para renovar; poderia virar lembrete |
| `Prêmio Liq. Atual` | `0` | — | **Veio zerado** em todas as linhas (renovação ainda não calculada) |
| `Prêmio Liq. Anterior` | `1.234,56` | `seguros.premio_liquido` | Milhar com ponto, decimal com vírgula |
| `Status` | `   ` (espaços) | — | Vazio no arquivo recebido |

## Colunas sem correspondência

`Item`, `Prazo para Renovação`, `Prêmio Liq. Atual`, `Status`. Não há início de vigência (usar fim − 1 ano), e-mail, telefone ou comissão.

## Dúvidas em aberto

1. O que é o ramo `1211` (auto?) e qual código a Allianz usa para **residencial**?
2. `Status` passa a ter valores quando a renovação anda? Quais?
3. A coluna `CPF` traz CNPJ para pessoa jurídica?
