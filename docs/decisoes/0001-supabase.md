# 0001 - Supabase como backend (banco + auth)

- Status: proposta
- Data: 2026-10-17
- Autores: time Hackaton

## Contexto
O CRM precisa de banco relacional, autenticação e API rapidamente, para um hackathon com 3 devs.

## Decisão
Usar Supabase (Postgres + Auth + RLS). O schema é versionado em `supabase/migrations`.
Cadastro público desabilitado (`enable_signup = false`): usuários são criados por um admin.
Papéis: `admin`, `corretor`, `atendente` (tabela `perfis`), aplicados via Row Level Security.

## Alternativas consideradas
Postgres próprio + auth própria (mais trabalho; sem ganho para o MVP).

## Consequências
- A `service_role` key só pode existir em backend/scripts; o frontend usa apenas a `anon` key + RLS.
- Dados de clientes são pessoais (LGPD): ver skill `security-lgpd`.
- O schema inicial é uma proposta e deve ser ajustado quando o MVP (`docs/produto/mvp.md`) for definido.
