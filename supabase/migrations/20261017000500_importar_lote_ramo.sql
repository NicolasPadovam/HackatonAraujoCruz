-- importar_lote passa a atualizar também o ramo e a seguradora do seguro: uma reimportação
-- corrige seguros gravados como "outro" quando o ramo não tinha sido reconhecido (e, no relatório
-- da Porto, os produtos Azul que tinham ficado na Porto). Igual à 000400, exceto ramo/seguradora_id.

create or replace function public.importar_lote(
  p_importacao jsonb,
  p_clientes jsonb default '[]',
  p_seguros jsonb default '[]',
  p_renovacoes jsonb default '[]',
  p_linhas jsonb default '[]'
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid;
begin
  insert into public.importacoes (id, modelo, arquivo_nome, aba, mes_referencia, importado_por_nome, linhas_ok, linhas_erro, linhas_revisao)
  select id, coalesce(modelo, 'xlsx'), arquivo_nome, aba, mes_referencia, importado_por_nome,
         coalesce(linhas_ok, 0), coalesce(linhas_erro, 0), coalesce(linhas_revisao, 0)
  from jsonb_to_record(p_importacao) as x(
    id uuid, modelo text, arquivo_nome text, aba text, mes_referencia date, importado_por_nome text,
    linhas_ok int, linhas_erro int, linhas_revisao int)
  returning id into v_id;

  insert into public.clientes as c (id, tipo, nome, cpf_cnpj, telefone, email, origem)
  select id, coalesce(tipo, 'fisica'), nome, cpf_cnpj, telefone, email, coalesce(origem, 'carteira')
  from jsonb_to_recordset(p_clientes) as x(
    id uuid, tipo public.tipo_pessoa, nome text, cpf_cnpj text, telefone text, email text, origem public.origem_cliente)
  on conflict (id) do update set
    cpf_cnpj = coalesce(c.cpf_cnpj, excluded.cpf_cnpj),
    telefone = coalesce(c.telefone, excluded.telefone),
    email = coalesce(c.email, excluded.email);

  insert into public.seguros as s (
    id, cliente_id, seguradora_id, ramo, numero_apolice, inicio_vigencia, fim_vigencia,
    premio_liquido, comissao_pct, parcelas, valor_parcela, situacao)
  select id, cliente_id, seguradora_id, ramo, numero_apolice, inicio_vigencia, fim_vigencia,
         premio_liquido, comissao_pct, parcelas, valor_parcela, coalesce(situacao, 'ativo')
  from jsonb_to_recordset(p_seguros) as x(
    id uuid, cliente_id uuid, seguradora_id uuid, ramo public.ramo_seguro, numero_apolice text,
    inicio_vigencia date, fim_vigencia date, premio_liquido numeric, comissao_pct numeric,
    parcelas int, valor_parcela numeric, situacao public.situacao_seguro)
  on conflict (id) do update set
    ramo = excluded.ramo,
    seguradora_id = excluded.seguradora_id,
    numero_apolice = coalesce(s.numero_apolice, excluded.numero_apolice),
    premio_liquido = coalesce(excluded.premio_liquido, s.premio_liquido),
    comissao_pct = coalesce(excluded.comissao_pct, s.comissao_pct),
    parcelas = coalesce(excluded.parcelas, s.parcelas),
    valor_parcela = coalesce(excluded.valor_parcela, s.valor_parcela),
    situacao = excluded.situacao;

  insert into public.renovacoes as r (id, seguro_id, vencimento, corretor_id, status, cotada, seguradora_fechada_id, seguro_novo_id, valor_recebido)
  select id, seguro_id, vencimento, corretor_id, coalesce(status, 'pendente'), coalesce(cotada, false),
         seguradora_fechada_id, seguro_novo_id, valor_recebido
  from jsonb_to_recordset(p_renovacoes) as x(
    id uuid, seguro_id uuid, vencimento date, corretor_id uuid, status public.status_renovacao, cotada boolean,
    seguradora_fechada_id uuid, seguro_novo_id uuid, valor_recebido numeric)
  on conflict (id) do update set
    corretor_id = excluded.corretor_id,
    status = excluded.status,
    cotada = excluded.cotada,
    seguradora_fechada_id = coalesce(excluded.seguradora_fechada_id, r.seguradora_fechada_id),
    seguro_novo_id = coalesce(excluded.seguro_novo_id, r.seguro_novo_id),
    valor_recebido = coalesce(excluded.valor_recebido, r.valor_recebido);

  insert into public.importacao_linhas (importacao_id, dados_brutos, status, mensagem, renovacao_id)
  select v_id, dados_brutos, status, mensagem, renovacao_id
  from jsonb_to_recordset(p_linhas) as x(
    dados_brutos jsonb, status public.status_linha_importacao, mensagem text, renovacao_id uuid);

  return v_id;
end $$;

revoke execute on function public.importar_lote(jsonb, jsonb, jsonb, jsonb, jsonb) from anon, public;
grant execute on function public.importar_lote(jsonb, jsonb, jsonb, jsonb, jsonb) to authenticated;
