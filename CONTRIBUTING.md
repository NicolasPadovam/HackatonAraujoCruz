# Guia de contribuição

## Branches
- `main`: sempre estável; sem push direto.
- Trabalho em branches curtas: `feat/<assunto>`, `fix/<assunto>`, `docs/<assunto>`, `chore/<assunto>`.
- Integração via Pull Request com ao menos 1 revisão de outra pessoa do time.

## Commits
Formato [Conventional Commits](https://www.conventionalcommits.org/pt-br/): `feat: cadastro de cliente`, `fix: validação de CPF`, `docs: ...`.

## Evitando conflitos entre os 3 devs
- Cada pessoa trabalha em uma área/pasta distinta por vez (ex.: web, api, shared) e combina antes de mexer em `packages/shared`.
- Faça `git pull --rebase origin main` antes de abrir PR.
- PRs pequenos e frequentes.
- Mudanças no contrato da API: atualizar `docs/api` no mesmo PR.

## Decisões técnicas
Registre em `docs/decisoes/NNNN-titulo.md` usando o `TEMPLATE.md`.

## Segredos
Nunca commitar `.env`. Mantenha um `.env.example` atualizado em cada app.
