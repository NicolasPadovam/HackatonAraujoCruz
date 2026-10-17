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

Já gravam no Supabase: **status/corretor/seguradora da renovação** (edição na tela de renovações). A gravação da **importação** está pronta (função `registrar_importacao`, transacional), mas o leitor do .xlsx ainda não existe; por isso a tela de importação fica desativada no modo Supabase (o fluxo simulado inventaria linhas).

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
