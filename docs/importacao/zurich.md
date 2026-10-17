# Zurich

> Modelo: `zurich_v1` (pendente). Amostra: [tests/fixtures/planilhas/zurich/exemplo-anonimizado.xls](../../tests/fixtures/planilhas/zurich/exemplo-anonimizado.xls) (cópia da estrutura vazia).

## Formato

- O arquivo recebido (`.xls`, 63 bytes) é um **fragmento HTML sem tabela**: só um `<style>` com `mso-number-format` e um `<div>` vazio. Nenhuma linha de dados nem cabeçalho.
- Indica uma **exportação vazia** do portal (filtro sem resultados) ou um export que falhou.
- Quando vier com dados, provavelmente será uma tabela HTML com extensão .xls (o estilo `mso-number-format` é típico desse tipo de export), como na Suhai.

## Colunas

Desconhecidas.

## Dúvidas em aberto

1. Exportar de novo, com um período que tenha renovações, e copiar para `data/raw/zurich/`.
2. Confirmar se o portal oferece .xlsx/.csv em vez do HTML.
