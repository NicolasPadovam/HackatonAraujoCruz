# Guia de contribuição

## Branches
- `main`: versão estável/entregue. Só recebe merge vindo da `develop`, quando o time decidir publicar. Sem push direto.
- `develop`: branch de integração (padrão do repositório). **Todo trabalho novo parte dela e volta para ela.**
- Trabalho em branches curtas criadas a partir da `develop`: `feat/<assunto>`, `fix/<assunto>`, `docs/<assunto>`, `chore/<assunto>`.
- Pull Requests sempre com base na `develop`, com ao menos 1 revisão de outra pessoa do time.

```bash
git checkout develop && git pull
git checkout -b feat/minha-feature
# ... commits ...
git push -u origin feat/minha-feature   # abrir PR para develop
```

## Commits
Formato [Conventional Commits](https://www.conventionalcommits.org/pt-br/): `feat: cadastro de cliente`, `fix: validação de CPF`, `docs: ...`.

## Evitando conflitos entre os 3 devs
- Cada pessoa trabalha em uma área/pasta distinta por vez (ex.: web, api, shared) e combina antes de mexer em `packages/shared`.
- Faça `git pull --rebase origin develop` antes de abrir PR.
- PRs pequenos e frequentes.
- Mudanças no contrato da API: atualizar `docs/api` no mesmo PR.

## Decisões técnicas
Registre em `docs/decisoes/NNNN-titulo.md` usando o `TEMPLATE.md`.

## Segredos
Nunca commitar `.env`. Mantenha um `.env.example` atualizado em cada app.
