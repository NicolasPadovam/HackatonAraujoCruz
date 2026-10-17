# apps/web — protótipo do CRM

Protótipo navegável do CRM para **desktop** (menu lateral, tabelas, painel de detalhes à direita). Serve para o time ver a cara do produto e decidir as próximas features. Escopo: [docs/produto/mvp.md](../../docs/produto/mvp.md).

**Todos os dados são fictícios**, gerados em [src/data/mock.ts](src/data/mock.ts). Eles ficam só no navegador (localStorage). Nada vai para servidor.

## Rodar

```bash
cd apps/web
npm install
npm run dev
```

Abra http://localhost:5173.

## Para ligar ao Supabase

1. As telas só falam com [src/data/store.tsx](src/data/store.tsx), por meio de `useStore()` (dados e ações) e `useIndices()` (mapas por id). Troque o estado local por consultas ao Supabase mantendo essas assinaturas, e as páginas não precisam mudar.
2. As ações de escrita hoje são `atualizarRenovacao(id, patch)` e `registrarImportacao(importacao, novos)`.
3. Os tipos em [src/domain/types.ts](src/domain/types.ts) estão em camelCase; as tabelas propostas em [modelo-dados.md](../../docs/arquitetura/modelo-dados.md) estão em snake_case. Gere os tipos do Supabase (`supabase gen types typescript`) e converta, ou ajuste estes tipos.
4. A tabela de clientes que está sendo carregada no Supabase deve ser a mesma usada aqui (não criar outra).
5. Variáveis de ambiente: crie `.env.local` (já ignorado pelo git) com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` e mantenha um `.env.example` sem valores.

## Telas

| Rota | Tela |
| --- | --- |
| `#/` | Renovações do mês: filtro por mês, ramo (padrão: residencial), corretor, status e busca. Clique numa linha para mudar o andamento |
| `#/clientes` | Busca e lista de clientes (um cadastro por cliente, vários seguros) |
| `#/clientes/:id` | Ficha: seguros ativos, histórico de renovações e trocas de seguradora, cotações |
| `#/importar` | Fluxo de importação: arquivo → aba do mês → prévia (vínculo por nome, erros) → confirmar. **Simulado**: o arquivo não é lido |
| `#/painel` | Indicadores do mês: taxa de renovação, urgências, por ramo/seguradora/corretor |
| `#/roadmap` | O que já está no protótipo e o que vem depois ("Sobre o protótipo" no menu) |

## Estrutura

- `src/domain/types.ts`: tipos que espelham [docs/arquitetura/modelo-dados.md](../../docs/arquitetura/modelo-dados.md).
- `src/data/store.tsx`: camada de dados. **É o ponto a trocar pelo Supabase.** As páginas só usam `useStore()` e `useIndices()`.
- `src/data/importacao.ts`: regras de conversão da planilha (data M/D/AAAA, ✅/❌ → status, sigla → corretor, mesmo nome = mesmo cliente). Elas são reaproveitáveis no parser real.
- `src/pages/`: uma tela por arquivo.

Stack: React 19 + Vite + TypeScript + Tailwind 4 + React Router (HashRouter) + lucide-react.
