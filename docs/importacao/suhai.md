# Suhai

> Modelo: `suhai_v1`. Amostra: [tests/fixtures/planilhas/suhai/exemplo-anonimizado.xls](../../tests/fixtures/planilhas/suhai/exemplo-anonimizado.xls).

## Formato

- **HTML com extensão `.xls`**: uma `<table>` (GridView do ASP.NET) dentro de `<div>`. Ler como HTML (`pd.read_html` / DOMParser); ler como xls binário ou xlsx falha.
- Cabeçalho em `<th>` na **primeira linha** da tabela; acentos como entidades HTML (`&#234;`).
- Valores com vírgula decimal **sem** separador de milhar (`1234,56`). Atenção: `pd.read_html` por padrão trata a vírgula como milhar e transforma `799,05` em `79905`; ler com `thousands=None`.
- CPF/CNPJ como **número sem zeros à esquerda** (10 ou 13 dígitos).
- Datas `dd/mm/aaaa 00:00:00`.
- Arquivo recebido: 3 linhas de dados (auto), vencimentos de nov/2026.

## Colunas

| Coluna original | Exemplo inventado | Campo de destino | Conversão |
| --- | --- | --- | --- |
| `ID da Renovacao` | 1234567 | — | Identificador da renovação na Suhai |
| `Status da Renovacao` | `A Renovar` | — | Renovação entra como `pendente` |
| `Número da Apólice` | 1234567890123 | `seguros.numero_apolice` | Texto |
| `Status da Apólice` | `Emitida` | — | Sem uso |
| `Início de Vigência` | `05/11/2025 00:00:00` | `seguros.inicio_vigencia` | Descartar a hora |
| `Término de Vigência` | `05/11/2026 00:00:00` | `seguros.fim_vigencia`, `renovacoes.vencimento` | Descartar a hora |
| `Dias de Vigência` | `365` | — | Sem uso |
| `Cancelamento de Vigência` | (vazio) | — | Se preenchido, a apólice foi cancelada (confirmar) |
| `Marca`, `Modelo`, `Placa`, `Chassi` | MARCA EXEMPLO | — | Dados do veículo; não importar no MVP |
| `Prêmio Líquido` | `799,05` | `seguros.premio_liquido` | Vírgula decimal |
| `Prêmio Anualizado`, `Prêmio Pago` | `799,05` | — | Sem uso |
| `Visilibidade` (sic) | 22 dígitos | — | Sem uso |
| `ID do Cálculo` | (vazio) | — | Sem uso |
| `Nome do Proponente` | ANA FICTICIA DOS SANTOS | `clientes.nome` | Maiúsculas |
| `CPF/CNPJ do Proponente` | 10–14 dígitos | `clientes.cpf_cnpj` | **Completar com zeros** (10→11, 13→14) e validar |
| `Telefone do Proponente` | 1140123456 | `clientes.telefone` (se não houver celular) | Número; pode vir vazio |
| `Celular do Proponente` | 11901234567 | `clientes.telefone` | Número com DDD |
| `Email do Proponente` | cliente@exemplo.com | `clientes.email` | |
| `ID do Corretor`, `CPF/CNPJ do Corretor`, `Código SUSEP do Corretor`, `Nome do Corretor`, `Email do Corretor` | CORRETORA EXEMPLO | — | Dados da **corretora**, não do cliente |
| `Comissão do Corretor` | `16%`, `20%` | `seguros.comissao_pct` | Tirar o `%` |
| `Tabela de Comissão` | `tab 24`, `tab 5` | — | Sem uso |
| `ID da Assessoria`, `Nome da Assessoria` | ASSESSORIA EXEMPLO | — | Assessoria intermediária; sem uso |
| `Fator de Ajuste FIPE` | `10000` | — | Sem uso |
| `Classe de Bônus` | `0`, `1` | — | Sem uso |

## Colunas sem correspondência

Dados do veículo, da corretora e da assessoria, IDs internos, prêmios anualizado/pago, bônus, FIPE.

## Dúvidas em aberto

1. A Suhai só faz auto/moto? (Se sim, ramo fixo `auto`.)
2. Outros valores de `Status da Renovacao`?
3. O `Prêmio Líquido` é o da apólice atual ou o calculado para a renovação?
