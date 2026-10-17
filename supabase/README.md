# Supabase

Schema do CRM versionado em `migrations/`:

| Migration | O que faz |
| --- | --- |
| `…000000_schema_inicial` | Perfis/papéis, clientes, seguradoras, RLS base |
| `…000100_ramo_outro` | Acrescenta o ramo `outro` |
| `…000200_modelo_renovacoes` | Alinha ao [modelo de dados](../docs/arquitetura/modelo-dados.md): corretores (R, C), seguros, renovações, cotações, importações e a função `registrar_importacao` |
| `…000300_cadastro_manual` | Função `cadastrar_seguro`: grava seguro + renovação numa transação (cadastro manual no CRM) |
| `…000400_importacao_xlsx` | Tabela `modelos_importacao` (mapeamento de colunas por seguradora) e função `importar_lote` (importação inteira numa transação) |
| `…000500_importar_lote_ramo` | `importar_lote` passa a corrigir ramo e seguradora do seguro numa reimportação |
| `…000600_etapas_renovacao` | Novas etapas da renovação: `cotada`, `enviada`, `negociando`, `cancelada` (feature [002](../docs/produto/features/002-atividades-por-funcao.md)) |
| `…000700_atividades_e_usuarios` | Comissão e caminho nas cotações, seguradora nas importações, função e e-mail em `perfis` (com guarda de administradores), histórico de etapas, validação de transições e a função `avancar_renovacao` |

Seguradoras e corretores vêm das migrations (dados de referência). `seed.sql` não tem dados.

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

## Edge Function: gestão de usuários
A tela Configurações > Usuários cria e desativa usuários pela função `gerir-usuarios` (`functions/gerir-usuarios`), que usa a chave de serviço no servidor. Publique depois das migrations:
```bash
npx supabase functions deploy gerir-usuarios
```
- Só administradores ativos conseguem chamá-la; ela confere o papel no banco.
- O convite é enviado por e-mail: configure o envio de e-mails do projeto (Authentication > SMTP) e inclua a URL do site em *Authentication > URL Configuration* (Site URL e Redirect URLs). Sem isso o convite não chega ou o link não volta ao sistema.
- No primeiro acesso, a pessoa define a própria senha no site (o administrador nunca vê a senha).

## Regras
- Mudança de schema = nova migration (`npx supabase migration new <nome>`); não edite migrations já aplicadas.
- Toda tabela nova em `public` precisa de RLS e policies.
- `SUPABASE_SERVICE_ROLE_KEY` nunca vai para o frontend nem para o git.
