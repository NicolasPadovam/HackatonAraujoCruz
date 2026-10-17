// Acesso ao Supabase: leitura do banco inteiro e as gravações do CRM.
// Converte snake_case (tabelas) <-> camelCase (src/domain/types.ts).
// Sem dados reais aqui: nada além de mapeamento.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Acesso, Cliente, Corretor, Cotacao, Db, Funcao, Importacao, ModeloImportacao, Renovacao, Seguradora, Seguro, Usuario } from '../domain/types'
import type { DadosCotacao } from '../lib/atividades'

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
  const [clientes, seguradoras, corretores, seguros, renovacoes, cotacoes, importacoes, modelos] = await Promise.all([
    lerTabela(client, 'clientes', 'nome'),
    lerTabela(client, 'seguradoras', 'nome'),
    lerTabela(client, 'corretores', 'nome'),
    lerTabela(client, 'seguros', 'fim_vigencia'),
    lerTabela(client, 'renovacoes', 'vencimento'),
    lerTabela(client, 'cotacoes', 'data'),
    lerTabela(client, 'importacoes', 'importado_em'),
    lerTabela(client, 'modelos_importacao', 'nome').catch(() => [] as Row[]), // antes da migration 000400
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
    seguradoras: seguradoras.map((r): Seguradora => ({
      id: r.id as string,
      nome: r.nome as string,
      apelidos: (r.apelidos as string[] | null) ?? [],
      ativa: r.ativa == null ? undefined : (r.ativa as boolean),
    })),
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
      comissaoPct: numero(r.comissao_pct),
      caminho: texto(r.caminho) as Cotacao['caminho'],
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
        seguradoraId: texto(r.seguradora_id) ?? null,
        importadoPor: texto(r.importado_por_nome) ?? 'Equipe',
        importadoEm: r.importado_em as string,
        linhasOk: r.linhas_ok as number,
        linhasErro: r.linhas_erro as number,
        linhasRevisao: r.linhas_revisao as number,
      }))
      .reverse(), // mais recente primeiro
    modelos: modelos.map((r): ModeloImportacao => ({
      id: r.id as string,
      nome: r.nome as string,
      seguradoraId: texto(r.seguradora_id) ?? null,
      mapeamento: (r.mapeamento as Record<string, string>) ?? {},
      opcoes: (r.opcoes as ModeloImportacao['opcoes']) ?? {},
    })),
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
  if (error.code === '23514') return error.message // regras do fluxo (etapas, cotação, administradores)
  if (error.code === 'PGRST202' && error.message.includes('avancar_renovacao')) return 'A função avancar_renovacao não existe no banco: aplique as migrations 000600 e 000700.'
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
    .in('status', ['pendente', 'cotando', 'cotada', 'enviada', 'negociando'])
  if (e2) throw new Error(mensagem(e2))
}

// ---------------------------------------------------------------------------
// Importação de planilhas
// ---------------------------------------------------------------------------

export interface LoteImportacao {
  importacao: Importacao & { modelo: string }
  clientes: Cliente[]
  seguros: Seguro[]
  renovacoes: Renovacao[]
  linhas: { dadosBrutos: Record<string, unknown>; status: 'ok' | 'erro' | 'revisao'; mensagem?: string; renovacaoId?: string }[]
}

/** Grava a importação inteira numa transação (função importar_lote, migration 000400). */
export async function importarLote(client: SupabaseClient, lote: LoteImportacao) {
  const { importacao: imp } = lote
  const { error } = await client.rpc('importar_lote', {
    p_importacao: {
      id: imp.id,
      modelo: imp.modelo,
      arquivo_nome: imp.arquivoNome,
      aba: imp.aba,
      mes_referencia: `${imp.mesReferencia}-01`,
      importado_por_nome: imp.importadoPor,
      linhas_ok: imp.linhasOk,
      linhas_erro: imp.linhasErro,
      linhas_revisao: imp.linhasRevisao,
    },
    p_clientes: lote.clientes.map((c) => ({ id: c.id, ...linhaCliente(c) })),
    p_seguros: lote.seguros.map((s) => ({ id: s.id, ...linhaSeguro(s) })),
    p_renovacoes: lote.renovacoes.map((r) => ({
      id: r.id,
      seguro_id: r.seguroId,
      vencimento: r.vencimento,
      corretor_id: r.corretorId,
      status: r.status,
      cotada: r.cotada,
      seguradora_fechada_id: r.seguradoraFechadaId ?? null,
      seguro_novo_id: r.seguroNovoId ?? null,
      valor_recebido: r.valorRecebido ?? null,
    })),
    p_linhas: lote.linhas.map((l) => ({
      dados_brutos: l.dadosBrutos,
      status: l.status,
      mensagem: l.mensagem ?? null,
      renovacao_id: l.renovacaoId ?? null,
    })),
  })
  if (error) {
    if (error.code === 'PGRST202') throw new Error('A função importar_lote não existe no banco: aplique a migration 20261017000400_importacao_xlsx.')
    throw new Error(mensagem(error))
  }
  // Seguradora do relatório (aviso do ciclo de importação). Antes da migration 000700 a coluna não existe: ignora.
  if (imp.seguradoraId) {
    const { error: e2 } = await client.from('importacoes').update({ seguradora_id: imp.seguradoraId }).eq('id', imp.id)
    if (e2 && e2.code !== '42703' && e2.code !== 'PGRST204') throw new Error(mensagem(e2))
  }
}

export async function salvarModelo(client: SupabaseClient, m: ModeloImportacao, novo: boolean) {
  const linha = { nome: m.nome, seguradora_id: m.seguradoraId, mapeamento: m.mapeamento, opcoes: m.opcoes }
  const { error } = novo
    ? await client.from('modelos_importacao').insert({ id: m.id, ...linha })
    : await client.from('modelos_importacao').update(linha).eq('id', m.id)
  if (error) throw new Error(mensagem(error))
}

// ---------------------------------------------------------------------------
// Etapas da renovação
// ---------------------------------------------------------------------------

/** Cotação (quando exigida) + nova etapa numa transação (função avancar_renovacao, migration 000700). */
export async function avancarRenovacao(
  client: SupabaseClient,
  id: string,
  status: Renovacao['status'],
  dados: { cotacao?: DadosCotacao; seguradoraFechadaId?: string },
) {
  const { error } = await client.rpc('avancar_renovacao', {
    p_renovacao: id,
    p_status: status,
    p_cotacao: dados.cotacao
      ? {
          seguradora_id: dados.cotacao.seguradoraId,
          premio: dados.cotacao.premio,
          comissao_pct: dados.cotacao.comissaoPct ?? null,
          caminho: dados.cotacao.caminho ?? null,
        }
      : null,
    p_seguradora_fechada: dados.seguradoraFechadaId ?? null,
  })
  if (error) throw new Error(mensagem(error))
}

// ---------------------------------------------------------------------------
// Usuários (Configurações)
// ---------------------------------------------------------------------------

const ACESSO_POR_PAPEL = (papel: unknown): Acesso => (papel === 'admin' ? 'administrador' : 'usuario')
const PAPEL_POR_ACESSO: Record<Acesso, string> = { administrador: 'admin', usuario: 'corretor' }

export function linhaUsuario(r: Row): Usuario {
  return {
    id: r.id as string,
    nome: r.nome as string,
    email: texto(r.email) ?? '',
    funcao: ((r.funcao as Funcao | null) ?? 'administrativo'),
    acesso: ACESSO_POR_PAPEL(r.papel),
    ativo: r.ativo as boolean,
  }
}

export async function carregarPerfil(client: SupabaseClient, id: string): Promise<Usuario | null> {
  const { data, error } = await client.from('perfis').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return data ? linhaUsuario(data as Row) : null
}

/** Só administradores enxergam a lista inteira (policy perfis_select). */
export async function listarUsuarios(client: SupabaseClient): Promise<Usuario[]> {
  const { data, error } = await client.from('perfis').select('*').order('nome')
  if (error) throw new Error(mensagem(error))
  return (data as Row[]).map(linhaUsuario)
}

export async function atualizarUsuario(client: SupabaseClient, u: Pick<Usuario, 'id' | 'nome' | 'funcao' | 'acesso'>) {
  const { error } = await client
    .from('perfis')
    .update({ nome: u.nome, funcao: u.funcao, papel: PAPEL_POR_ACESSO[u.acesso] })
    .eq('id', u.id)
  if (error) throw new Error(mensagem(error))
}

async function chamarGerirUsuarios(client: SupabaseClient, corpo: Record<string, unknown>) {
  const { data, error } = await client.functions.invoke('gerir-usuarios', { body: corpo })
  if (error) {
    // Respostas de erro da função trazem { erro } no corpo.
    const resp = (error as { context?: Response }).context
    const detalhe = resp ? await resp.json().catch(() => null) : null
    throw new Error(detalhe?.erro ?? 'Não foi possível concluir. Confira se a função gerir-usuarios foi publicada.')
  }
  return data as Record<string, unknown>
}

export async function convidarUsuario(
  client: SupabaseClient,
  u: Pick<Usuario, 'nome' | 'email' | 'funcao' | 'acesso'>,
): Promise<string> {
  const r = await chamarGerirUsuarios(client, { acao: 'criar', ...u, redirectTo: window.location.origin + window.location.pathname })
  return r.id as string
}

export async function mudarSituacaoUsuario(client: SupabaseClient, id: string, ativo: boolean) {
  await chamarGerirUsuarios(client, { acao: 'situacao', id, ativo })
}
