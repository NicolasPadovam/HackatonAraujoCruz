-- Cadastro manual pelo CRM: grava um seguro e a renovação dele (no fim da vigência)
-- numa única transação, para não sobrar seguro sem renovação se algo falhar.
-- SECURITY INVOKER: valem as policies (RLS) de quem está logado.

create or replace function public.cadastrar_seguro(p_seguro jsonb, p_renovacao jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid;
begin
  insert into public.seguros (
    id, cliente_id, seguradora_id, ramo, numero_apolice, inicio_vigencia, fim_vigencia,
    premio_liquido, comissao_pct, parcelas, valor_parcela, situacao
  )
  select id, cliente_id, seguradora_id, ramo, numero_apolice, inicio_vigencia, fim_vigencia,
         premio_liquido, comissao_pct, parcelas, valor_parcela, coalesce(situacao, 'ativo')
  from jsonb_to_record(p_seguro) as x(
    id uuid, cliente_id uuid, seguradora_id uuid, ramo public.ramo_seguro, numero_apolice text,
    inicio_vigencia date, fim_vigencia date, premio_liquido numeric, comissao_pct numeric,
    parcelas int, valor_parcela numeric, situacao public.situacao_seguro)
  returning id into v_id;

  insert into public.renovacoes (id, seguro_id, vencimento, corretor_id, status, cotada)
  select id, v_id, vencimento, corretor_id, coalesce(status, 'pendente'), coalesce(cotada, false)
  from jsonb_to_record(p_renovacao) as x(
    id uuid, vencimento date, corretor_id uuid, status public.status_renovacao, cotada boolean);

  return v_id;
end $$;

revoke execute on function public.cadastrar_seguro(jsonb, jsonb) from anon, public;
grant execute on function public.cadastrar_seguro(jsonb, jsonb) to authenticated;
