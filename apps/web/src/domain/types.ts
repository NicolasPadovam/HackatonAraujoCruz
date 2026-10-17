// Espelha docs/arquitetura/modelo-dados.md. Quando o Supabase entrar,
// estes tipos devem bater com as tabelas (ou ser gerados a partir delas).

export type Ramo = 'residencial' | 'auto' | 'vida' | 'outro'

/**
 * Etapas da renovação (docs/produto/features/002-atividades-por-funcao.md).
 * Em aberto: pendente -> cotando -> cotada -> enviada -> (negociando <-> enviada) -> renovada.
 * Finais: renovada, nao_renovada (cliente não quis) e cancelada (negociação sem acordo).
 */
export type StatusRenovacao =
  | 'pendente'
  | 'cotando'
  | 'cotada'
  | 'enviada'
  | 'negociando'
  | 'renovada'
  | 'nao_renovada'
  | 'cancelada'

/** Função na operação: define quais atividades aparecem para o usuário. */
export type Funcao = 'administrativo' | 'corretora'

/** Nível de acesso: administradores também gerenciam usuários (Configurações). */
export type Acesso = 'administrador' | 'usuario'

/** Como a nova oferta foi obtida na negociação. */
export type Caminho = 'contato_seguradora' | 'reducao_comissao'

export type OrigemCliente = 'carteira' | 'indicacao' | 'marketing'

export type TipoPessoa = 'fisica' | 'juridica'

export interface Cliente {
  id: string
  tipo?: TipoPessoa
  nome: string
  cpfCnpj?: string // só dígitos
  observacoes?: string
  telefone?: string
  email?: string
  origem: OrigemCliente
}

export interface Seguradora {
  id: string
  nome: string
  /** Seguradora parceira (entra no ciclo de importação). Ausente = ativa. */
  ativa?: boolean
  apelidos?: string[] // variações vistas nas planilhas ("Porto", "PORTO SEGURO")
}

export interface Corretor {
  id: string
  nome: string
  sigla: string
}

export interface Seguro {
  id: string
  clienteId: string
  seguradoraId: string
  ramo: Ramo
  numeroApolice?: string
  inicioVigencia: string // ISO yyyy-mm-dd
  fimVigencia: string
  premioLiquido?: number
  comissaoPct?: number
  parcelas?: number
  valorParcela?: number
  situacao: 'ativo' | 'renovado' | 'nao_renovado' | 'cancelado'
}

export interface Renovacao {
  id: string
  seguroId: string
  vencimento: string // ISO yyyy-mm-dd
  corretorId?: string
  status: StatusRenovacao
  cotada: boolean
  seguradoraFechadaId?: string
  seguroNovoId?: string
  valorRecebido?: number
}

export interface Cotacao {
  id: string
  clienteId: string
  renovacaoId?: string
  ramo: Ramo
  seguradoraId: string
  premio?: number
  /** Comissão (%) desta oferta; registrada nas rodadas de negociação. */
  comissaoPct?: number
  /** Como a oferta nasceu na negociação; vazio na primeira cotação. */
  caminho?: Caminho
  origem: 'manual' | 'multicalculo' | 'automatica'
  status: 'cotada' | 'enviada' | 'aceita' | 'recusada'
  data: string
}

export interface Importacao {
  id: string
  arquivoNome: string
  aba: string
  mesReferencia: string // yyyy-mm
  /** Seguradora do relatório importado; nulo/ausente para a planilha consolidada. */
  seguradoraId?: string | null
  importadoPor: string
  importadoEm: string // ISO datetime
  linhasOk: number
  linhasErro: number
  linhasRevisao: number
}

/** Como ler o relatório de uma seguradora (ou a planilha da corretora, seguradoraId = null). */
export interface ModeloImportacao {
  id: string
  nome: string
  seguradoraId: string | null
  /** campo do CRM -> texto do cabeçalho da coluna na planilha */
  mapeamento: Record<string, string>
  opcoes: {
    formatoData?: 'dmy' | 'mdy'
    ramoPadrao?: Ramo
    corretorPadraoId?: string
  }
}

/** Usuário do sistema (tabela perfis). */
export interface Usuario {
  id: string
  nome: string
  email: string
  funcao: Funcao
  acesso: Acesso
  ativo: boolean
}

export interface Db {
  clientes: Cliente[]
  seguradoras: Seguradora[]
  corretores: Corretor[]
  seguros: Seguro[]
  renovacoes: Renovacao[]
  cotacoes: Cotacao[]
  importacoes: Importacao[]
  modelos: ModeloImportacao[]
}
