# apps/web — protótipo do CRM

Protótipo navegável do CRM, pensado para **celular**. Serve para o time ver a cara do produto e decidir as próximas features. Escopo: [docs/produto/mvp.md](../../docs/produto/mvp.md).

**Todos os dados são fictícios**, gerados em [src/data/mock.ts](src/data/mock.ts). Eles ficam só no navegador (localStorage). Nada vai para servidor.

## Rodar

```bash
cd apps/web
npm install
npm run dev
```

Abra http://localhost:5173. No computador, use o modo celular do DevTools (F12 → ícone de celular). Para abrir no celular na mesma rede Wi-Fi, rode `npm run dev -- --host` e acesse o IP mostrado.

## Telas

| Rota | Tela |
| --- | --- |
| `#/` | Renovações do mês: filtro por mês, ramo (padrão: residencial), corretor e status. Toque em um item para mudar o status |
| `#/clientes` | Busca e lista de clientes (um cadastro por cliente, vários seguros) |
| `#/clientes/:id` | Ficha: seguros ativos, histórico de renovações e trocas de seguradora, cotações |
| `#/importar` | Fluxo de importação: arquivo → aba do mês → prévia (vínculo por nome, erros) → confirmar. **Simulado**: o arquivo não é lido |
| `#/painel` | Indicadores do mês: taxa de renovação, urgências, por ramo/seguradora/corretor |
| `#/roadmap` | O que já está no protótipo e o que vem depois (ícone ⓘ na tela inicial) |

## Estrutura

- `src/domain/types.ts`: tipos que espelham [docs/arquitetura/modelo-dados.md](../../docs/arquitetura/modelo-dados.md).
- `src/data/store.tsx`: camada de dados. **É o ponto a trocar pelo Supabase.** As páginas só usam `useStore()` e `useIndices()`.
- `src/data/importacao.ts`: regras de conversão da planilha (data M/D/AAAA, ✅/❌ → status, sigla → corretor, mesmo nome = mesmo cliente). Elas são reaproveitáveis no parser real.
- `src/pages/`: uma tela por arquivo.

Stack: React 19 + Vite + TypeScript + Tailwind 4 + React Router (HashRouter) + lucide-react.
