# Mapfre

> Modelo: `mapfre_v1`. Amostra: [tests/fixtures/planilhas/mapfre/exemplo-anonimizado.csv](../../tests/fixtures/planilhas/mapfre/exemplo-anonimizado.csv).

## Formato

- **CSV** separado por `;`, codificação **Windows-1252 (cp1252)**, quebra de linha LF, sem aspas.
- Cabeçalho na **linha 1**, sem títulos.
- Datas `AAAA-MM-DD HH:MM:SS.0`.
- O nome do segurado pode vir com **espaço no final**.
- Arquivo recebido: 1 linha de dados (auto), vencimento de dez/2026.

## Colunas

| Coluna original | Exemplo inventado | Campo de destino | Conversão |
| --- | --- | --- | --- |
| `Apólice` | 123456789012 | `seguros.numero_apolice` | Texto |
| `Segurado` | `ANA FICTICIA DOS SANTOS ` | `clientes.nome` | Remover espaços nas pontas |
| `Fim de Vigência` | `2026-11-05 00:00:00.0` | `seguros.fim_vigencia`, `renovacoes.vencimento` | Descartar a hora |
| `Produto` | `231-MAPFRE AUTO` | `seguros.ramo` | `código-descrição`: "AUTO" → `auto` |
| `Modalidade` | `Auto Compreensivo` | — | Detalhe do produto |
| `Cód. Interno` | 12345 | — | Sem uso |
| `Status` | `A renovar` | — | Renovação entra como `pendente` |
| `Motivo` | (vazio) | — | Sem uso |

## Colunas sem correspondência

Não há **CPF/CNPJ**, e-mail, telefone, início de vigência, prêmio nem comissão. Cliente só pelo nome (deduplicação por nome normalizado).

## Dúvidas em aberto

1. Como aparece um seguro **residencial** em `Produto` (código e descrição)?
2. Outros valores de `Status`/`Motivo` (ex.: renovada, não renovada)?
3. O portal da Mapfre permite exportar com CPF/CNPJ ou prêmio?
