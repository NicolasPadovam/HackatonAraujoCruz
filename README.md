# CRM Araujo Cruz Seguros

CRM para corretora de seguros (Hackaton). Stack e MVP ainda em definição.

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `apps/web` | Frontend |
| `apps/api` | Backend / API |
| `packages/shared` | Código compartilhado (tipos, validações, constantes) |
| `docs/produto` | Escopo, MVP, user stories, regras de negócio |
| `docs/arquitetura` | Diagramas, modelo de dados, visão geral técnica |
| `docs/decisoes` | ADRs: uma decisão técnica por arquivo (ex.: escolha da stack) |
| `docs/api` | Contratos e documentação da API |
| `infra/docker` | Dockerfiles e docker-compose |
| `infra/ci` | Configurações de CI/CD auxiliares |
| `scripts` | Scripts de setup, seed e utilitários |
| `tests/e2e` | Testes ponta a ponta |
| `.github` | Workflows, templates de PR e issues |

Cada pasta de `apps/` e `packages/` é independente: define seu próprio README e dependências quando a stack for escolhida.

## Primeiros passos

1. Definir o MVP em `docs/produto/mvp.md`.
2. Registrar a stack em `docs/decisoes/0001-stack.md` (use `docs/decisoes/TEMPLATE.md`).
3. Inicializar `apps/web` e `apps/api`.

Veja [CONTRIBUTING.md](CONTRIBUTING.md) para o fluxo de trabalho em equipe.
