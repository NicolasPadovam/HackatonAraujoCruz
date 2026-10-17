# Supabase

Schema do CRM versionado em `migrations/`. Seed local em `seed.sql`.

## Desenvolvimento local
```bash
npx supabase start          # sobe Postgres/Auth/Studio via Docker
npx supabase db reset       # aplica migrations + seed
```

## Projeto na nuvem
1. Crie o projeto em https://supabase.com/dashboard (região São Paulo).
2. Copie `.env.example` para `.env` e preencha URL e chaves (Project Settings > API).
3. Vincule e publique o schema:
```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```
4. Crie o primeiro usuário em Authentication > Users e promova a admin no SQL Editor:
```sql
update public.perfis set papel = 'admin' where id = '<uuid-do-usuario>';
```

## Regras
- Mudança de schema = nova migration (`npx supabase migration new <nome>`); não edite migrations já aplicadas.
- Toda tabela nova em `public` precisa de RLS e policies.
- `SUPABASE_SERVICE_ROLE_KEY` nunca vai para o frontend nem para o git.
