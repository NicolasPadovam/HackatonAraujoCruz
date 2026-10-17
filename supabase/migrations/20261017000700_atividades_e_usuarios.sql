-- Atividades por função e gestão de usuários
-- (docs/produto/features/002-atividades-por-funcao.md e 003-configuracoes-usuarios.md).
--  * cotacoes: comissão e caminho da oferta (negociação).
--  * importacoes: seguradora do relatório, para o aviso do ciclo de importação.
--  * perfis: função (Administrativo/Corretora) e e-mail, com guarda contra auto-promoção
--    e contra ficar sem administrador.
--  * renovacao_eventos: histórico de mudanças de etapa.
--  * trigger de transição e função avancar_renovacao (cotação + etapa numa transação).

-- ---------------------------------------------------------------------------
-- Cotações e importações
-- ---------------------------------------------------------------------------
create type public.caminho_negociacao as enum ('contato_seguradora', 'reducao_comissao');

alter table public.cotacoes
  add column comissao_pct numeric(5, 2) check (comissao_pct is null or (comissao_pct >= 0 and comissao_pct <= 100)),
  add column caminho public.caminho_negociacao;

alter table public.importacoes
  add column seguradora_id uuid references public.seguradoras (id) on delete set null; -- null = planilha consolidada

-- ---------------------------------------------------------------------------
-- Perfis: função e e-mail
-- ---------------------------------------------------------------------------
create type public.funcao_usuario as enum ('administrativo', 'corretora');

alter table public.perfis
  add column funcao public.funcao_usuario not null default 'administrativo',
  add column email text;

update public.perfis p set email = u.email from auth.users u where u.id = p.id;

-- O papel e a função NUNCA vêm do metadata do cliente: a Edge Function gerir-usuarios os grava depois.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfis (id, nome, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)), new.email);
  return new;
end $$;

-- Só admin altera papel, função, e-mail e situação; ninguém desativa a si mesmo;
-- sempre sobra ao menos um administrador ativo. auth.uid() nulo = chamada de serviço (Edge Function).
create or replace function public.perfis_guardar()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not public.eh_admin() then
    if new.papel is distinct from old.papel or new.funcao is distinct from old.funcao
       or new.ativo is distinct from old.ativo or new.email is distinct from old.email then
      raise exception 'Apenas administradores alteram função, acesso e situação.' using errcode = '42501';
    end if;
  end if;
  if auth.uid() = old.id and old.ativo and not new.ativo then
    raise exception 'Você não pode desativar o próprio usuário.' using errcode = '23514';
  end if;
  if old.papel = 'admin' and old.ativo and (new.papel <> 'admin' or not new.ativo) then
    if not exists (select 1 from public.perfis where papel = 'admin' and ativo and id <> old.id) then
      raise exception 'Mantenha ao menos um administrador ativo.' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;

create trigger perfis_guardar before update on public.perfis
  for each row execute function public.perfis_guardar();

-- ---------------------------------------------------------------------------
-- Histórico de etapas
-- ---------------------------------------------------------------------------
create table public.renovacao_eventos (
  id uuid primary key default gen_random_uuid(),
  renovacao_id uuid not null references public.renovacoes (id) on delete cascade,
  status_anterior public.status_renovacao,
  status_novo public.status_renovacao not null,
  usuario_id uuid references public.perfis (id) on delete set null,
  usuario_nome text,
  ocorrido_em timestamptz not null default now()
);
create index renovacao_eventos_renovacao_idx on public.renovacao_eventos (renovacao_id, ocorrido_em);

alter table public.renovacao_eventos enable row level security;
create policy renovacao_eventos_select on public.renovacao_eventos for select to authenticated
  using (public.papel_atual() is not null);
-- Sem policy de escrita: só o trigger abaixo (security definer) grava.
revoke all on public.renovacao_eventos from anon;

create or replace function public.renovacoes_registrar_status()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.renovacao_eventos (renovacao_id, status_anterior, status_novo, usuario_id, usuario_nome)
  select new.id, old.status, new.status, auth.uid(), p.nome
  from (select 1) x left join public.perfis p on p.id = auth.uid();
  return new;
end $$;

create trigger renovacoes_registrar_status after update of status on public.renovacoes
  for each row when (old.status is distinct from new.status)
  execute function public.renovacoes_registrar_status();

-- ---------------------------------------------------------------------------
-- Transições de etapa
-- O fluxo antigo (pendente, cotando, renovada, não renovada) continua livre, para a importação
-- não quebrar; qualquer movimento que envolva uma etapa nova precisa seguir a tabela.
-- Espelha TRANSICOES em apps/web/src/lib/atividades.ts.
-- ---------------------------------------------------------------------------
create or replace function public.renovacoes_validar_status()
returns trigger language plpgsql set search_path = '' as $$
declare
  novos constant text[] := array['cotada', 'enviada', 'negociando', 'cancelada'];
begin
  if not (old.status::text = any (novos) or new.status::text = any (novos)) then
    return new;
  end if;
  if exists (
    select 1
    from (values
      ('cotando', 'cotada'),
      ('cotada', 'enviada'), ('cotada', 'cotando'), ('cotada', 'nao_renovada'),
      ('enviada', 'renovada'), ('enviada', 'negociando'), ('enviada', 'nao_renovada'),
      ('negociando', 'enviada'), ('negociando', 'cancelada'), ('negociando', 'nao_renovada'),
      ('cancelada', 'negociando')
    ) as t (de, para)
    where t.de = old.status::text and t.para = new.status::text
  ) then
    return new;
  end if;
  raise exception 'Movimento de etapa não permitido: % para %.', old.status, new.status using errcode = '23514';
end $$;

create trigger renovacoes_validar_status before update of status on public.renovacoes
  for each row when (old.status is distinct from new.status)
  execute function public.renovacoes_validar_status();

-- ---------------------------------------------------------------------------
-- Avanço de etapa: registra a cotação (quando exigida) e muda a etapa numa transação.
-- SECURITY INVOKER: as policies de quem chama continuam valendo.
-- p_cotacao: { seguradora_id, premio, comissao_pct?, caminho? }
-- ---------------------------------------------------------------------------
create or replace function public.avancar_renovacao(
  p_renovacao uuid,
  p_status public.status_renovacao,
  p_cotacao jsonb default null,
  p_seguradora_fechada uuid default null
) returns void language plpgsql security invoker set search_path = '' as $$
declare
  v_ren public.renovacoes%rowtype;
  v_seg public.seguros%rowtype;
  v_exige text;
  v_premio numeric := nullif(p_cotacao ->> 'premio', '')::numeric;
  v_comissao numeric := nullif(p_cotacao ->> 'comissao_pct', '')::numeric;
  v_caminho public.caminho_negociacao := nullif(p_cotacao ->> 'caminho', '')::public.caminho_negociacao;
begin
  select * into v_ren from public.renovacoes where id = p_renovacao for update;
  if not found then
    raise exception 'Renovação não encontrada.' using errcode = 'P0002';
  end if;
  select * into v_seg from public.seguros where id = v_ren.seguro_id;

  v_exige := case
    when v_ren.status = 'cotando' and p_status = 'cotada' then 'cotacao'
    when v_ren.status = 'negociando' and p_status = 'enviada' then 'oferta'
  end;
  if v_exige is not null then
    if v_premio is null or v_premio <= 0 then
      raise exception 'Informe o prêmio da cotação.' using errcode = '23514';
    end if;
    if v_exige = 'oferta' and (v_comissao is null or v_caminho is null) then
      raise exception 'Informe a comissão e como a nova oferta foi obtida.' using errcode = '23514';
    end if;
    insert into public.cotacoes (cliente_id, renovacao_id, ramo, seguradora_id, premio, comissao_pct, caminho, origem, status, data)
    values (
      v_seg.cliente_id, v_ren.id, v_seg.ramo, (p_cotacao ->> 'seguradora_id')::uuid, v_premio, v_comissao,
      case when v_exige = 'oferta' then v_caminho end, 'manual',
      case when v_exige = 'oferta' then 'enviada' else 'cotada' end::public.status_cotacao, current_date
    );
  end if;

  if v_ren.status = 'cotada' and p_status = 'enviada' then
    update public.cotacoes set status = 'enviada' where renovacao_id = v_ren.id and status = 'cotada';
  elsif v_ren.status = 'enviada' and p_status = 'negociando' then
    update public.cotacoes set status = 'recusada' where renovacao_id = v_ren.id and status = 'enviada';
  elsif v_ren.status = 'enviada' and p_status = 'renovada' then
    update public.cotacoes set status = 'aceita' where renovacao_id = v_ren.id and status = 'enviada';
  end if;

  update public.renovacoes set
    status = p_status,
    cotada = p_status <> 'pendente',
    seguradora_fechada_id = case
      when p_status = 'renovada' then coalesce(p_seguradora_fechada, v_ren.seguradora_fechada_id, v_seg.seguradora_id)
    end
  where id = v_ren.id; -- o trigger de transição valida a etapa
end $$;

revoke execute on function public.avancar_renovacao(uuid, public.status_renovacao, jsonb, uuid) from anon, public;
grant execute on function public.avancar_renovacao(uuid, public.status_renovacao, jsonb, uuid) to authenticated;
