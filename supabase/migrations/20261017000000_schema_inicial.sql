-- Schema inicial do CRM Araújo Cruz Seguros.
-- Premissa: todo acesso passa por usuário autenticado (RLS ligado em todas as tabelas).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type public.papel_usuario as enum ('admin', 'corretor', 'atendente');
create type public.tipo_pessoa as enum ('fisica', 'juridica');
create type public.ramo_seguro as enum ('auto', 'vida', 'residencial', 'empresarial', 'saude', 'outros');
create type public.status_apolice as enum ('cotacao', 'ativa', 'vencida', 'cancelada');
create type public.tipo_interacao as enum ('ligacao', 'whatsapp', 'email', 'reuniao', 'nota');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Perfis (1:1 com auth.users)
-- ---------------------------------------------------------------------------
create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  papel public.papel_usuario not null default 'atendente',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger perfis_updated_at before update on public.perfis
  for each row execute function public.set_updated_at();

-- Cria o perfil automaticamente ao criar um usuário no Auth.
-- O papel NUNCA vem do metadata do cliente (evita escalonamento de privilégio).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfis (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Funções de autorização usadas nas policies.
create or replace function public.papel_atual()
returns public.papel_usuario language sql stable security definer set search_path = '' as $$
  select papel from public.perfis where id = auth.uid() and ativo
$$;

create or replace function public.eh_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.papel_atual() = 'admin', false)
$$;

-- ---------------------------------------------------------------------------
-- Seguradoras
-- ---------------------------------------------------------------------------
create table public.seguradoras (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  cnpj text unique,
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger seguradoras_updated_at before update on public.seguradoras
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Clientes (dados pessoais: LGPD)
-- ---------------------------------------------------------------------------
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  tipo public.tipo_pessoa not null default 'fisica',
  nome text not null,
  documento text unique,              -- CPF/CNPJ (somente dígitos)
  email text,
  telefone text,
  data_nascimento date,
  endereco jsonb,
  observacoes text,
  consentimento_lgpd_em timestamptz,  -- base legal / registro de consentimento
  responsavel_id uuid references public.perfis (id) on delete set null,
  created_by uuid references public.perfis (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clientes_documento_digitos check (documento is null or documento ~ '^\d{11}$|^\d{14}$')
);
create index clientes_nome_idx on public.clientes (nome);
create index clientes_responsavel_idx on public.clientes (responsavel_id);
create trigger clientes_updated_at before update on public.clientes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Apólices / cotações
-- ---------------------------------------------------------------------------
create table public.apolices (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete restrict,
  seguradora_id uuid references public.seguradoras (id) on delete set null,
  ramo public.ramo_seguro not null,
  numero text,
  status public.status_apolice not null default 'cotacao',
  premio numeric(12, 2) check (premio is null or premio >= 0),
  vigencia_inicio date,
  vigencia_fim date,
  created_by uuid references public.perfis (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint apolices_vigencia_valida check (vigencia_fim is null or vigencia_inicio is null or vigencia_fim >= vigencia_inicio),
  unique (seguradora_id, numero)
);
create index apolices_cliente_idx on public.apolices (cliente_id);
create index apolices_vigencia_fim_idx on public.apolices (vigencia_fim) where status = 'ativa';
create trigger apolices_updated_at before update on public.apolices
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Interações (histórico de contato)
-- ---------------------------------------------------------------------------
create table public.interacoes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  apolice_id uuid references public.apolices (id) on delete set null,
  tipo public.tipo_interacao not null,
  descricao text not null,
  ocorrida_em timestamptz not null default now(),
  created_by uuid references public.perfis (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index interacoes_cliente_idx on public.interacoes (cliente_id, ocorrida_em desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.perfis enable row level security;
alter table public.seguradoras enable row level security;
alter table public.clientes enable row level security;
alter table public.apolices enable row level security;
alter table public.interacoes enable row level security;

-- Perfis: cada um vê o próprio; admin vê e gerencia todos.
-- O papel só é alterável por admin (impede auto-promoção).
create policy perfis_select on public.perfis for select to authenticated
  using (id = auth.uid() or public.eh_admin());
create policy perfis_update_admin on public.perfis for update to authenticated
  using (public.eh_admin()) with check (public.eh_admin());
create policy perfis_update_proprio_nome on public.perfis for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and papel = (select papel from public.perfis where id = auth.uid()));

-- Seguradoras: leitura para a equipe; escrita só admin.
create policy seguradoras_select on public.seguradoras for select to authenticated
  using (public.papel_atual() is not null);
create policy seguradoras_write on public.seguradoras for all to authenticated
  using (public.eh_admin()) with check (public.eh_admin());

-- Clientes / apólices / interações: equipe ativa lê e escreve; só admin exclui.
create policy clientes_select on public.clientes for select to authenticated
  using (public.papel_atual() is not null);
create policy clientes_insert on public.clientes for insert to authenticated
  with check (public.papel_atual() is not null);
create policy clientes_update on public.clientes for update to authenticated
  using (public.papel_atual() is not null) with check (public.papel_atual() is not null);
create policy clientes_delete on public.clientes for delete to authenticated
  using (public.eh_admin());

create policy apolices_select on public.apolices for select to authenticated
  using (public.papel_atual() is not null);
create policy apolices_insert on public.apolices for insert to authenticated
  with check (public.papel_atual() in ('admin', 'corretor'));
create policy apolices_update on public.apolices for update to authenticated
  using (public.papel_atual() in ('admin', 'corretor'))
  with check (public.papel_atual() in ('admin', 'corretor'));
create policy apolices_delete on public.apolices for delete to authenticated
  using (public.eh_admin());

create policy interacoes_select on public.interacoes for select to authenticated
  using (public.papel_atual() is not null);
create policy interacoes_insert on public.interacoes for insert to authenticated
  with check (public.papel_atual() is not null);
create policy interacoes_update on public.interacoes for update to authenticated
  using (created_by = auth.uid() or public.eh_admin())
  with check (created_by = auth.uid() or public.eh_admin());
create policy interacoes_delete on public.interacoes for delete to authenticated
  using (public.eh_admin());

-- Nada para o papel anônimo.
revoke all on all tables in schema public from anon;
