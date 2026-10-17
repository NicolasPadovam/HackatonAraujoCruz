# apps/web — protótipo do CRM

Protótipo navegável do CRM para **desktop** (menu lateral, tabelas, painel de detalhes à direita). Serve para o time ver a cara do produto e decidir as próximas features. Escopo: [docs/produto/mvp.md](../../docs/produto/mvp.md).

**No modo demonstração todos os dados são fictícios**, gerados em [src/data/mock.ts](src/data/mock.ts). No modo demonstração eles ficam só no navegador (localStorage). Nada vai para servidor.

## Rodar

```bash
cd apps/web
npm install
npm run dev
```

Abra http://localhost:5173.

## Modos de funcionamento

| Modo | Quando | Dados |
| --- | --- | --- |
| **Supabase** | `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` definidos | Reais, do banco. Exige login (Supabase Auth); acesso protegido por RLS |
| **Demonstração** | Variáveis ausentes | Fictícios, só no navegador |

Para usar o Supabase: aplique as migrations (`supabase db push`, ver [supabase/README.md](../../supabase/README.md)), crie `apps/web/.env.local` a partir de `.env.example` com a URL e a chave **anon** do projeto, e rode `npm run dev`. **Nunca** coloque a `service_role` em variáveis `VITE_*`.

As telas só falam com [src/data/store.tsx](src/data/store.tsx) (`useStore()`, `useIndices()`). O acesso ao banco e a conversão snake_case ↔ camelCase ficam em [src/data/remote.ts](src/data/remote.ts).

Já gravam no Supabase: **status/corretor/seguradora da renovação** (edição na tela de renovações) e o **cadastro manual**: Clientes → Novo cliente (com o primeiro seguro opcional e “Salvar e cadastrar outro”), e na ficha, Editar dados / Adicionar seguro / editar seguro. Cada seguro novo gera a renovação no fim da vigência (função `cadastrar_seguro`, migration `…000300`). E a **importação de planilhas** (ver abaixo, função `importar_lote`, migration `…000400`).

## Importação de planilhas

Dois usos, na mesma tela (`#/importar`):

1. **Planilha da corretora** (carga inicial): a planilha de renovações de vocês, uma aba por mês, com as colunas Seguradoras, Nome do Segurado, Ramo, Vigência, Corretor, Renovada, Cotada, Prêmio Líquido, Comissão, Valor Recebido, N. Parcelas, Valor Mensal, Seguradora Atual. Dá para marcar várias abas de uma vez.
2. **Relatório da seguradora** (todo mês): o arquivo exportado com as renovações dos próximos 30 dias. Na primeira vez, indique as colunas; o mapeamento fica salvo por seguradora (tabela `modelos_importacao`) e é reaplicado nos meses seguintes.

Como funciona:
- O arquivo é lido **no navegador** ([src/importacao/leitura.ts](src/importacao/leitura.ts), SheetJS 0.20.3 do CDN oficial). Nada é enviado até a confirmação.
- O cabeçalho é detectado (pode estar depois de linhas de título) e as colunas são sugeridas pelos nomes ([src/importacao/campos.ts](src/importacao/campos.ts)).
- Conversões ([src/importacao/conversao.ts](src/importacao/conversao.ts)): datas do Excel, dd/mm ou mm/dd (detectado); ✅/TRUE = renovada, ❌ = não renovada, caixa desmarcada = ainda não decidido; "R$ -" e zero = vazio; comissão 0,15 = 15%; "Porto" = Porto Seguro.
- Deduplicação ([src/importacao/processar.ts](src/importacao/processar.ts)): cliente pelo **CPF/CNPJ**; sem ele, pelo **nome** (mesmo nome = mesmo cliente). CPF que vier no relatório **completa** o cadastro existente. Nome repetido com CPF diferente vai para **Revisar** (não grava).
- Seguro: o mesmo cliente + ramo + seguradora com fim de vigência na data (±3 dias) é o mesmo seguro. Renovada gera a apólice do ano seguinte (na seguradora com que fechou); não renovada encerra a atual.
- Reimportar o mesmo arquivo **atualiza** em vez de duplicar. Relatório de seguradora (sem coluna de andamento) não desfaz o andamento marcado pela equipe.
- Gravação numa transação (`importar_lote`): se algo falhar, nada é gravado.

Planilhas **fictícias** para testar: `node scripts/gerar-planilhas-ficticias.mjs` gera `tests/fixtures/*.xlsx`. Planilhas reais ficam em `data/raw/<seguradora>/` (fora do Git); layouts em [docs/importacao/](../../docs/importacao/README.md).

## Telas

| Rota | Tela |
| --- | --- |
| `#/` | Renovações do mês: filtro por mês, ramo (padrão: residencial), corretor, status e busca. Clique numa linha para mudar o andamento |
| `#/clientes` | Busca e lista de clientes (um cadastro por cliente, vários seguros) |
| `#/clientes/:id` | Ficha: seguros ativos, histórico de renovações e trocas de seguradora, cotações |
| `#/importar` | Importação de .xlsx/.xls/.csv: arquivo → tipo e colunas → prévia → gravar |
| `#/painel` | Indicadores do mês: taxa de renovação, urgências, por ramo/seguradora/corretor |
| `#/roadmap` | O que já está no protótipo e o que vem depois ("Sobre o protótipo" no menu) |

## Estrutura

- `src/domain/types.ts`: tipos que espelham [docs/arquitetura/modelo-dados.md](../../docs/arquitetura/modelo-dados.md).
- `src/data/store.tsx`: camada de dados. **É o ponto a trocar pelo Supabase.** As páginas só usam `useStore()` e `useIndices()`.
- `src/importacao/`: leitura do .xlsx, sugestão de colunas, conversões e deduplicação (ver "Importação de planilhas").
- `src/pages/`: uma tela por arquivo.

Stack: React 19 + Vite + TypeScript + Tailwind 4 + React Router (HashRouter) + lucide-react.
