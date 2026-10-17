// Espelha docs/arquitetura/modelo-dados.md. Quando o Supabase entrar,
// estes tipos devem bater com as tabelas (ou ser gerados a partir delas).

export type Ramo = 'residencial' | 'auto' | 'vida' | 'outro'

export type StatusRenovacao = 'pendente' | 'cotando' | 'renovada' | 'nao_renovada'

export type OrigemCliente = 'carteira' | 'indicacao' | 'marketing'

export interface Cliente {
  id: string
  nome: string
  cpfCnpj?: string
  telefone?: string
  email?: string
  origem: OrigemCliente
}

export interface Seguradora {
  id: string
  nome: string
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
  corretorId: string
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
  origem: 'manual' | 'multicalculo' | 'automatica'
  status: 'cotada' | 'enviada' | 'aceita' | 'recusada'
  data: string
}

export interface Importacao {
  id: string
  arquivoNome: string
  aba: string
  mesReferencia: string // yyyy-mm
  importadoPor: string
  importadoEm: string // ISO datetime
  linhasOk: number
  linhasErro: number
  linhasRevisao: number
}

export interface Db {
  clientes: Cliente[]
  seguradoras: Seguradora[]
  corretores: Corretor[]
  seguros: Seguro[]
  renovacoes: Renovacao[]
  cotacoes: Cotacao[]
  importacoes: Importacao[]
}
