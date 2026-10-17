// Acesso ao Supabase: leitura do banco inteiro e as gravações do CRM.
// Converte snake_case (tabelas) <-> camelCase (src/domain/types.ts).
// Sem dados reais aqui: nada além de mapeamento.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Cliente, Corretor, Cotacao, Db, Importacao, Renovacao, Seguradora, Seguro } from '../domain/types'

type Row = Record<string, unknown>

const TAMANHO_PAGINA = 1000 // limite padrão de linhas por consulta no Supabase

async function lerTabela(client: SupabaseClient, tabela: string, ordem: string): Promise<Row[]> {
  const linhas: Row[] = []
  for (let de = 0; ; de += TAMANHO_PAGINA) {
    const { data, error } = await client
      .from(tabela)
      .select('*')
      .order(ordem)
      .order('id')
      .range(de, de + TAMANHO_PAGINA - 1)
    if (error) throw new Error(`${tabela}: ${error.message}`)
    linhas.push(...(data as Row[]))
    if (data.length < TAMANHO_PAGINA) return linhas
  }
}

const texto = (v: unknown) => (v == null ? undefined : String(v))
const numero = (v: unknown) => (v == null ? undefined : Number(v)) // numeric chega como string/number

export async function carregarDb(client: SupabaseClient): Promise<Db> {
  const [clientes, seguradoras, corretores, seguros, renovacoes, cotacoes, importacoes] = await Promise.all([
    lerTabela(client, 'clientes', 'nome'),
    lerTabela(client, 'seguradoras', 'nome'),
    lerTabela(client, 'corretores', 'nome'),
    lerTabela(client, 'seguros', 'fim_vigencia'),
    lerTabela(client, 'renovacoes', 'vencimento'),
    lerTabela(client, 'cotacoes', 'data'),
    lerTabela(client, 'importacoes', 'importado_em'),
  ])

  return {
    clientes: clientes.map((r): Cliente => ({
      id: r.id as string,
      tipo: r.tipo as Cliente['tipo'],
      nome: r.nome as string,
      cpfCnpj: texto(r.cpf_cnpj),
      telefone: texto(r.telefone),
      email: texto(r.email),
      observacoes: texto(r.observacoes),
      origem: r.origem as Cliente['origem'],
    })),
    seguradoras: seguradoras.map((r): Seguradora => ({ id: r.id as string, nome: r.nome as string })),
    corretores: corretores.map((r): Corretor => ({ id: r.id as string, nome: r.nome as string, sigla: r.sigla as string })),
    seguros: seguros.map((r): Seguro => ({
      id: r.id as string,
      clienteId: r.cliente_id as string,
      seguradoraId: r.seguradora_id as string,
      ramo: r.ramo === 'outros' ? 'outro' : (r.ramo as Seguro['ramo']),
      numeroApolice: texto(r.numero_apolice),
      inicioVigencia: texto(r.inicio_vigencia) ?? '',
      fimVigencia: texto(r.fim_vigencia) ?? '',
      premioLiquido: numero(r.premio_liquido),
      comissaoPct: numero(r.comissao_pct),
      parcelas: numero(r.parcelas),
      valorParcela: numero(r.valor_parcela),
      situacao: r.situacao as Seguro['situacao'],
    })),
    renovacoes: renovacoes.map((r): Renovacao => ({
      id: r.id as string,
      seguroId: r.seguro_id as string,
      vencimento: r.vencimento as string,
      corretorId: r.corretor_id as string,
      status: r.status as Renovacao['status'],
      cotada: r.cotada as boolean,
      seguradoraFechadaId: texto(r.seguradora_fechada_id),
      seguroNovoId: texto(r.seguro_novo_id),
      valorRecebido: numero(r.valor_recebido),
    })),
    cotacoes: cotacoes.map((r): Cotacao => ({
      id: r.id as string,
      clienteId: r.cliente_id as string,
      renovacaoId: texto(r.renovacao_id),
      ramo: r.ramo === 'outros' ? 'outro' : (r.ramo as Cotacao['ramo']),
      seguradoraId: r.seguradora_id as string,
      premio: numero(r.premio),
      origem: r.origem as Cotacao['origem'],
      status: r.status as Cotacao['status'],
      data: r.data as string,
    })),
    importacoes: importacoes
      .map((r): Importacao => ({
        id: r.id as string,
        arquivoNome: r.arquivo_nome as string,
        aba: texto(r.aba) ?? '',
        mesReferencia: (r.mes_referencia as string).slice(0, 7),
        importadoPor: texto(r.importado_por_nome) ?? 'Equipe',
        importadoEm: r.importado_em as string,
        linhasOk: r.linhas_ok as number,
        linhasErro: r.linhas_erro as number,
        linhasRevisao: r.linhas_revisao as number,
      }))
      .reverse(), // mais recente primeiro
  }
}

const COLUNAS_RENOVACAO: Record<keyof Renovacao, string> = {
  id: 'id',
  seguroId: 'seguro_id',
  vencimento: 'vencimento',
  corretorId: 'corretor_id',
  status: 'status',
  cotada: 'cotada',
  seguradoraFechadaId: 'seguradora_fechada_id',
  seguroNovoId: 'seguro_novo_id',
  valorRecebido: 'valor_recebido',
}

export async function salvarRenovacao(client: SupabaseClient, id: string, patch: Partial<Renovacao>) {
  const dados = Object.fromEntries(
    Object.entries(patch).map(([k, v]) => [COLUNAS_RENOVACAO[k as keyof Renovacao], v ?? null]),
  )
  const { error } = await client.from('renovacoes').update(dados).eq('id', id)
  if (error) throw new Error(error.message)
}

// ---------------------------------------------------------------------------
// Cadastro manual
// ---------------------------------------------------------------------------

function linhaCliente(c: Cliente) {
  return {
    tipo: c.tipo ?? 'fisica',
    nome: c.nome,
    cpf_cnpj: c.cpfCnpj ?? null,
    telefone: c.telefone ?? null,
    email: c.email ?? null,
    observacoes: c.observacoes ?? null,
    origem: c.origem,
  }
}

function linhaSeguro(s: Seguro) {
  return {
    cliente_id: s.clienteId,
    seguradora_id: s.seguradoraId,
    ramo: s.ramo,
    numero_apolice: s.numeroApolice ?? null,
    inicio_vigencia: s.inicioVigencia,
    fim_vigencia: s.fimVigencia,
    premio_liquido: s.premioLiquido ?? null,
    comissao_pct: s.comissaoPct ?? null,
    parcelas: s.parcelas ?? null,
    valor_parcela: s.valorParcela ?? null,
    situacao: s.situacao,
  }
}

/** Traduz erros do Postgres que a pessoa consegue resolver. */
function mensagem(error: { message: string; code?: string }): string {
  if (error.code === '23505' && error.message.includes('cpf_cnpj')) return 'Já existe um cliente com este CPF/CNPJ.'
  if (error.code === '23505' && error.message.includes('numero')) return 'Já existe um seguro com este número de apólice nesta seguradora.'
  if (error.code === 'PGRST202') return 'A função cadastrar_seguro não existe no banco: aplique a migration 20261017000300_cadastro_manual.'
  if (error.code === '42501') return 'Seu usuário não tem permissão para esta gravação.'
  return error.message
}

export async function inserirCliente(client: SupabaseClient, c: Cliente) {
  const { error } = await client.from('clientes').insert({ id: c.id, ...linhaCliente(c) })
  if (error) throw new Error(mensagem(error))
}

export async function atualizarCliente(client: SupabaseClient, c: Cliente) {
  const { error } = await client.from('clientes').update(linhaCliente(c)).eq('id', c.id)
  if (error) throw new Error(mensagem(error))
}

/** Seguro + renovação no fim da vigência, numa transação (função cadastrar_seguro). */
export async function cadastrarSeguro(client: SupabaseClient, s: Seguro, r: Renovacao) {
  const { error } = await client.rpc('cadastrar_seguro', {
    p_seguro: { id: s.id, ...linhaSeguro(s) },
    p_renovacao: { id: r.id, vencimento: r.vencimento, corretor_id: r.corretorId, status: r.status, cotada: r.cotada },
  })
  if (error) throw new Error(mensagem(error))
}

/** Atualiza o seguro e move o vencimento das renovações ainda em aberto. */
export async function atualizarSeguro(client: SupabaseClient, s: Seguro) {
  const { error } = await client.from('seguros').update(linhaSeguro(s)).eq('id', s.id)
  if (error) throw new Error(mensagem(error))
  const { error: e2 } = await client
    .from('renovacoes')
    .update({ vencimento: s.fimVigencia })
    .eq('seguro_id', s.id)
    .in('status', ['pendente', 'cotando'])
  if (e2) throw new Error(mensagem(e2))
}

export interface NovosRegistros {
  clientes: Cliente[]
  seguros: Seguro[]
  renovacoes: Renovacao[]
}

/** Grava a importação inteira numa transação (função registrar_importacao no banco). */
export async function salvarImportacao(client: SupabaseClient, imp: Importacao, novos: NovosRegistros) {
  const { error } = await client.rpc('registrar_importacao', {
    p_importacao: {
      id: imp.id,
      arquivo_nome: imp.arquivoNome,
      aba: imp.aba,
      mes_referencia: `${imp.mesReferencia}-01`,
      importado_por_nome: imp.importadoPor,
      linhas_ok: imp.linhasOk,
      linhas_erro: imp.linhasErro,
      linhas_revisao: imp.linhasRevisao,
    },
    p_clientes: novos.clientes.map((c) => ({ id: c.id, nome: c.nome, origem: c.origem })),
    p_seguros: novos.seguros.map((s) => ({
      id: s.id,
      cliente_id: s.clienteId,
      seguradora_id: s.seguradoraId,
      ramo: s.ramo,
      inicio_vigencia: s.inicioVigencia,
      fim_vigencia: s.fimVigencia,
      comissao_pct: s.comissaoPct ?? null,
      situacao: s.situacao,
    })),
    p_renovacoes: novos.renovacoes.map((r) => ({
      id: r.id,
      seguro_id: r.seguroId,
      vencimento: r.vencimento,
      corretor_id: r.corretorId,
      status: r.status,
      cotada: r.cotada,
    })),
  })
  if (error) throw new Error(error.message)
}
