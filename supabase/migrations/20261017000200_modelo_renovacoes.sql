-- Alinha o schema ao modelo de dados do MVP (docs/arquitetura/modelo-dados.md):
-- clientes, seguradoras, corretores, seguros, renovacoes, cotacoes, importacoes.
-- Não destrutiva: renomeia e acrescenta colunas, preservando dados já carregados.

create extension if not exists unaccent with schema extensions;

-- ---------------------------------------------------------------------------
-- Tipos novos
-- ---------------------------------------------------------------------------
create type public.origem_cliente as enum ('carteira', 'indicacao', 'marketing');
create type public.situacao_seguro as enum ('ativo', 'renovado', 'nao_renovado', 'cancelado');
create type public.status_renovacao as enum ('pendente', 'cotando', 'renovada', 'nao_renovada');
create type public.origem_cotacao as enum ('manual', 'multicalculo', 'automatica');
create type public.status_cotacao as enum ('cotada', 'enviada', 'aceita', 'recusada');
create type public.status_linha_importacao as enum ('ok', 'erro', 'revisao');

-- ---------------------------------------------------------------------------
-- Clientes: CPF/CNPJ, origem e nome normalizado (deduplicação por nome)
-- ---------------------------------------------------------------------------
alter table public.clientes rename column documento to cpf_cnpj;
alter table public.clientes rename constraint clientes_documento_digitos to clientes_cpf_cnpj_digitos;
alter table public.clientes add column origem public.origem_cliente not null default 'carteira';
alter table public.clientes add column nome_normalizado text;

create or replace function public.normalizar_nome(nome text)
returns text language sql immutable set search_path = '' as $$
  select lower(regexp_replace(btrim(extensions.unaccent(nome)), '\s+', ' ', 'g'))
$$;

create or replace function public.clientes_set_nome_normalizado()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.nome_normalizado = public.normalizar_nome(new.nome);
  return new;
end $$;

create trigger clientes_nome_normalizado before insert or update of nome on public.clientes
  for each row execute function public.clientes_set_nome_normalizado();

update public.clientes set nome_normalizado = public.normalizar_nome(nome);
alter table public.clientes alter column nome_normalizado set not null;
create index clientes_nome_normalizado_idx on public.clientes (nome_normalizado);

-- ---------------------------------------------------------------------------
-- Seguradoras: apelidos vistos nas planilhas
-- ---------------------------------------------------------------------------
alter table public.seguradoras add column apelidos text[] not null default '{}';

-- Seguradoras que aparecem na planilha de renovações (dado de referência, não de clientes).
insert into public.seguradoras (nome, apelidos) values
  ('Porto Seguro', '{Porto}'),
  ('Tokio Marine', '{Tokio}'),
  ('Mapfre', '{}'),
  ('Allianz', '{}'),
  ('Zurich', '{}'),
  ('Azul', '{}'),
  ('Suhai', '{}')
on conflict (nome) do nothing;

-- ---------------------------------------------------------------------------
-- Corretores (R = Renata, C = Carlos, como aparece na planilha)
-- ---------------------------------------------------------------------------
create table public.corretores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  sigla text not null unique,
  perfil_id uuid references public.perfis (id) on delete set null,
  created_at timestamptz not null default now()
);
insert into public.corretores (nome, sigla) values ('Renata', 'R'), ('Carlos', 'C')
on conflict (sigla) do nothing;

-- ---------------------------------------------------------------------------
-- Seguros (antes "apolices")
-- ---------------------------------------------------------------------------
alter table public.apolices rename to seguros;
alter table public.seguros rename column numero to numero_apolice;
alter table public.seguros rename column premio to premio_liquido;
alter table public.seguros rename column vigencia_inicio to inicio_vigencia;
alter table public.seguros rename column vigencia_fim to fim_vigencia;
alter table public.seguros rename constraint apolices_vigencia_valida to seguros_vigencia_valida;
alter index public.apolices_cliente_idx rename to seguros_cliente_idx;
alter table public.seguros add column comissao_pct numeric(5, 2) check (comissao_pct is null or comissao_pct between 0 and 100);
alter table public.seguros add column parcelas int check (parcelas is null or parcelas > 0);
alter table public.seguros add column valor_parcela numeric(12, 2) check (valor_parcela is null or valor_parcela >= 0);

alter table public.seguros add column situacao public.situacao_seguro not null default 'ativo';
update public.seguros set situacao = case status
  when 'cancelada' then 'cancelado'::public.situacao_seguro
  when 'vencida' then 'nao_renovado'::public.situacao_seguro
  else 'ativo'::public.situacao_seguro
end;
alter table public.seguros drop column status; -- derruba junto o índice parcial que dependia dele
drop type public.status_apolice;
create index seguros_fim_vigencia_idx on public.seguros (fim_vigencia);
alter trigger apolices_updated_at on public.seguros rename to seguros_updated_at;

alter policy apolices_select on public.seguros rename to seguros_select;
alter policy apolices_insert on public.seguros rename to seguros_insert;
alter policy apolices_update on public.seguros rename to seguros_update;
alter policy apolices_delete on public.seguros rename to seguros_delete;

-- A importação de planilhas (feita por qualquer pessoa da equipe) grava seguros:
-- escrita liberada à equipe ativa, como nas demais tabelas. Só admin exclui.
drop policy seguros_insert on public.seguros;
drop policy seguros_update on public.seguros;
create policy seguros_insert on public.seguros for insert to authenticated
  with check (public.papel_atual() is not null);
create policy seguros_update on public.seguros for update to authenticated
  using (public.papel_atual() is not null) with check (public.papel_atual() is not null);

alter table public.interacoes rename column apolice_id to seguro_id;

-- ---------------------------------------------------------------------------
-- Renovações: uma linha da planilha de renovações = um registro
-- ---------------------------------------------------------------------------
create table public.renovacoes (
  id uuid primary key default gen_random_uuid(),
  seguro_id uuid not null references public.seguros (id) on delete cascade,
  vencimento date not null,
  corretor_id uuid references public.corretores (id) on delete set null,
  status public.status_renovacao not null default 'pendente',
  cotada boolean not null default false,
  seguradora_fechada_id uuid references public.seguradoras (id) on delete set null,
  seguro_novo_id uuid references public.seguros (id) on delete set null,
  valor_recebido numeric(12, 2) check (valor_recebido is null or valor_recebido >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (seguro_id, vencimento) -- reimportar a mesma planilha não duplica
);
create index renovacoes_vencimento_idx on public.renovacoes (vencimento);
create trigger renovacoes_updated_at before update on public.renovacoes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Cotações (vazia no MVP; base da cotação automática futura)
-- ---------------------------------------------------------------------------
create table public.cotacoes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  renovacao_id uuid references public.renovacoes (id) on delete set null,
  ramo public.ramo_seguro not null,
  seguradora_id uuid references public.seguradoras (id) on delete set null,
  premio numeric(12, 2) check (premio is null or premio >= 0),
  origem public.origem_cotacao not null default 'manual',
  status public.status_cotacao not null default 'cotada',
  data date not null default current_date,
  created_at timestamptz not null default now()
);
create index cotacoes_cliente_idx on public.cotacoes (cliente_id);

-- ---------------------------------------------------------------------------
-- Importações e linhas importadas (rastreabilidade)
-- ---------------------------------------------------------------------------
create table public.importacoes (
  id uuid primary key default gen_random_uuid(),
  modelo text not null default 'renovacoes_consolidada_v1',
  arquivo_nome text not null,
  aba text,
  mes_referencia date not null, -- 1º dia do mês da planilha
  importado_por uuid references public.perfis (id) on delete set null default auth.uid(),
  importado_por_nome text,
  importado_em timestamptz not null default now(),
  linhas_ok int not null default 0,
  linhas_erro int not null default 0,
  linhas_revisao int not null default 0
);

create table public.importacao_linhas (
  id uuid primary key default gen_random_uuid(),
  importacao_id uuid not null references public.importacoes (id) on delete cascade,
  dados_brutos jsonb not null, -- contém dados pessoais: mesma regra de acesso
  status public.status_linha_importacao not null,
  mensagem text,
  renovacao_id uuid references public.renovacoes (id) on delete set null
);
create index importacao_linhas_importacao_idx on public.importacao_linhas (importacao_id);

-- ---------------------------------------------------------------------------
-- Gravação atômica de uma importação (clientes + seguros + renovações + registro).
-- SECURITY INVOKER: as policies (RLS) do usuário continuam valendo.
-- ---------------------------------------------------------------------------
create or replace function public.registrar_importacao(
  p_importacao jsonb,
  p_clientes jsonb default '[]',
  p_seguros jsonb default '[]',
  p_renovacoes jsonb default '[]'
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid;
begin
  insert into public.clientes (id, nome, origem)
  select id, nome, coalesce(origem, 'carteira')
  from jsonb_to_recordset(p_clientes) as x(id uuid, nome text, origem public.origem_cliente);

  insert into public.seguros (id, cliente_id, seguradora_id, ramo, inicio_vigencia, fim_vigencia, comissao_pct, situacao)
  select id, cliente_id, seguradora_id, ramo, inicio_vigencia, fim_vigencia, comissao_pct, coalesce(situacao, 'ativo')
  from jsonb_to_recordset(p_seguros) as x(
    id uuid, cliente_id uuid, seguradora_id uuid, ramo public.ramo_seguro,
    inicio_vigencia date, fim_vigencia date, comissao_pct numeric, situacao public.situacao_seguro);

  insert into public.renovacoes (id, seguro_id, vencimento, corretor_id, status, cotada)
  select id, seguro_id, vencimento, corretor_id, status, coalesce(cotada, false)
  from jsonb_to_recordset(p_renovacoes) as x(
    id uuid, seguro_id uuid, vencimento date, corretor_id uuid,
    status public.status_renovacao, cotada boolean);

  insert into public.importacoes (id, modelo, arquivo_nome, aba, mes_referencia, importado_por_nome, linhas_ok, linhas_erro, linhas_revisao)
  select id, coalesce(modelo, 'renovacoes_consolidada_v1'), arquivo_nome, aba, mes_referencia, importado_por_nome,
         coalesce(linhas_ok, 0), coalesce(linhas_erro, 0), coalesce(linhas_revisao, 0)
  from jsonb_to_record(p_importacao) as x(
    id uuid, modelo text, arquivo_nome text, aba text, mes_referencia date, importado_por_nome text,
    linhas_ok int, linhas_erro int, linhas_revisao int)
  returning id into v_id;

  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- Row Level Security das tabelas novas
-- Equipe ativa lê e escreve; só admin exclui. Nada para o papel anônimo.
-- ---------------------------------------------------------------------------
alter table public.corretores enable row level security;
alter table public.renovacoes enable row level security;
alter table public.cotacoes enable row level security;
alter table public.importacoes enable row level security;
alter table public.importacao_linhas enable row level security;

create policy corretores_select on public.corretores for select to authenticated
  using (public.papel_atual() is not null);
create policy corretores_write on public.corretores for all to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

create policy renovacoes_select on public.renovacoes for select to authenticated
  using (public.papel_atual() is not null);
create policy renovacoes_insert on public.renovacoes for insert to authenticated
  with check (public.papel_atual() is not null);
create policy renovacoes_update on public.renovacoes for update to authenticated
  using (public.papel_atual() is not null) with check (public.papel_atual() is not null);
create policy renovacoes_delete on public.renovacoes for delete to authenticated
  using (public.eh_admin());

create policy cotacoes_select on public.cotacoes for select to authenticated
  using (public.papel_atual() is not null);
create policy cotacoes_insert on public.cotacoes for insert to authenticated
  with check (public.papel_atual() is not null);
create policy cotacoes_update on public.cotacoes for update to authenticated
  using (public.papel_atual() is not null) with check (public.papel_atual() is not null);
create policy cotacoes_delete on public.cotacoes for delete to authenticated
  using (public.eh_admin());

create policy importacoes_select on public.importacoes for select to authenticated
  using (public.papel_atual() is not null);
create policy importacoes_insert on public.importacoes for insert to authenticated
  with check (public.papel_atual() is not null);
create policy importacoes_delete on public.importacoes for delete to authenticated
  using (public.eh_admin());

create policy importacao_linhas_select on public.importacao_linhas for select to authenticated
  using (public.papel_atual() is not null);
create policy importacao_linhas_insert on public.importacao_linhas for insert to authenticated
  with check (public.papel_atual() is not null);
create policy importacao_linhas_delete on public.importacao_linhas for delete to authenticated
  using (public.eh_admin());

-- O Supabase concede acesso ao anon por padrão em tabelas novas: remove agora e daqui em diante.
revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke execute on functions from anon;
