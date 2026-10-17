// Regras do fluxo de renovação e das atividades por função
// (docs/produto/features/002-atividades-por-funcao.md). Funções puras: valem para a tela,
// para o modo demonstração e espelham a função avancar_renovacao do banco.

import type { Caminho, Cotacao, Funcao, Renovacao, Seguro, StatusRenovacao } from '../domain/types'
import { faixaVencimento, hojeIso, toIso } from './format'

export const STATUS_ORDEM: StatusRenovacao[] = [
  'pendente', 'cotando', 'cotada', 'enviada', 'negociando', 'renovada', 'nao_renovada', 'cancelada',
]

const FINAIS: StatusRenovacao[] = ['renovada', 'nao_renovada', 'cancelada']

export const ehFinal = (s: StatusRenovacao) => FINAIS.includes(s)

/** Renovação ainda em andamento (qualquer etapa antes de um desfecho). */
export const statusEmAberto = (s: StatusRenovacao) => !ehFinal(s)

/** Etapas que só existem a partir da feature de atividades; o fluxo antigo (4 status) continua livre. */
const NOVOS: StatusRenovacao[] = ['cotada', 'enviada', 'negociando', 'cancelada']

/** Agrupamento usado nos gráficos, para não ter oito cores em cada barra. */
export type Macro = 'pendente' | 'andamento' | 'renovada' | 'nao_renovada' | 'cancelada'

export function macroStatus(s: StatusRenovacao): Macro {
  if (s === 'renovada' || s === 'nao_renovada' || s === 'cancelada' || s === 'pendente') return s
  return 'andamento'
}

// ---------------------------------------------------------------------------
// Transições
// ---------------------------------------------------------------------------

/** Para onde cada etapa pode ir (avançar, voltar um passo ou encerrar). */
export const TRANSICOES: Record<StatusRenovacao, StatusRenovacao[]> = {
  pendente: ['cotando', 'renovada', 'nao_renovada'],
  cotando: ['cotada', 'pendente', 'nao_renovada'],
  cotada: ['enviada', 'cotando', 'nao_renovada'],
  enviada: ['renovada', 'negociando', 'nao_renovada'],
  negociando: ['enviada', 'cancelada', 'nao_renovada'],
  // Reabrir: corrige um desfecho marcado por engano.
  renovada: ['pendente'],
  nao_renovada: ['pendente'],
  cancelada: ['negociando'],
}

/**
 * Regra do banco (trigger): o fluxo antigo continua livre; qualquer movimento que envolva
 * uma etapa nova precisa seguir a tabela. A tela segue a tabela sempre.
 */
export function transicaoPermitida(de: StatusRenovacao, para: StatusRenovacao): boolean {
  return de !== para && TRANSICOES[de].includes(para)
}

export function transicaoPermitidaNoBanco(de: StatusRenovacao, para: StatusRenovacao): boolean {
  if (de === para) return true
  if (!NOVOS.includes(de) && !NOVOS.includes(para)) return true
  return TRANSICOES[de].includes(para)
}

/** Dados que precisam acompanhar certos avanços. */
export type ExigeCotacao = 'cotacao' | 'oferta' | null

export function exigeCotacao(de: StatusRenovacao, para: StatusRenovacao): ExigeCotacao {
  if (de === 'cotando' && para === 'cotada') return 'cotacao'
  if (de === 'negociando' && para === 'enviada') return 'oferta'
  return null
}

export interface DadosCotacao {
  seguradoraId: string
  premio: number
  comissaoPct?: number
  caminho?: Caminho
}

export function validarAvanco(de: StatusRenovacao, para: StatusRenovacao, cotacao?: DadosCotacao): string | null {
  if (!transicaoPermitida(de, para)) return 'Este movimento não faz parte do fluxo.'
  const exige = exigeCotacao(de, para)
  if (exige && !cotacao) return 'Registre a cotação para avançar.'
  if (exige && !(cotacao!.premio > 0)) return 'Informe o prêmio da cotação.'
  if (exige === 'oferta') {
    if (cotacao!.comissaoPct == null || cotacao!.comissaoPct < 0) return 'Informe a comissão (%) da nova oferta.'
    if (!cotacao!.caminho) return 'Informe como a nova oferta foi obtida.'
  }
  return null
}

export interface ResultadoAvanco {
  patch: Partial<Renovacao>
  novasCotacoes: Cotacao[]
  /** Cotações já existentes que mudam de status (enviada, recusada, aceita). */
  atualizacoes: { id: string; status: Cotacao['status'] }[]
}

/** Calcula o que muda ao levar a renovação para `para` (usado na tela e no modo demonstração). */
export function avancar(
  r: Renovacao,
  seguro: Seguro,
  para: StatusRenovacao,
  cotacoesDaRenovacao: Cotacao[],
  dados: { cotacao?: DadosCotacao; seguradoraFechadaId?: string } = {},
  hoje = hojeIso(),
): ResultadoAvanco {
  const erro = validarAvanco(r.status, para, dados.cotacao)
  if (erro) throw new Error(erro)

  const novasCotacoes: Cotacao[] = []
  const atualizacoes: ResultadoAvanco['atualizacoes'] = []
  const noStatus = (st: Cotacao['status']) => cotacoesDaRenovacao.filter((c) => c.status === st)

  if (dados.cotacao) {
    const exige = exigeCotacao(r.status, para)
    novasCotacoes.push({
      id: crypto.randomUUID(),
      clienteId: seguro.clienteId,
      renovacaoId: r.id,
      ramo: seguro.ramo,
      seguradoraId: dados.cotacao.seguradoraId,
      premio: dados.cotacao.premio,
      comissaoPct: dados.cotacao.comissaoPct,
      caminho: exige === 'oferta' ? dados.cotacao.caminho : undefined,
      origem: 'manual',
      status: exige === 'oferta' ? 'enviada' : 'cotada',
      data: hoje,
    })
  }
  if (r.status === 'cotada' && para === 'enviada') for (const c of noStatus('cotada')) atualizacoes.push({ id: c.id, status: 'enviada' })
  if (r.status === 'enviada' && para === 'negociando') for (const c of noStatus('enviada')) atualizacoes.push({ id: c.id, status: 'recusada' })
  if (r.status === 'enviada' && para === 'renovada') for (const c of noStatus('enviada')) atualizacoes.push({ id: c.id, status: 'aceita' })

  return {
    patch: {
      status: para,
      cotada: para !== 'pendente',
      seguradoraFechadaId: para === 'renovada' ? dados.seguradoraFechadaId ?? r.seguradoraFechadaId ?? seguro.seguradoraId : undefined,
    },
    novasCotacoes,
    atualizacoes,
  }
}

// ---------------------------------------------------------------------------
// Atividades
// ---------------------------------------------------------------------------

export interface Atividade {
  funcao: Funcao
  texto: string
}

const ATIVIDADE: Partial<Record<StatusRenovacao, Atividade>> = {
  pendente: { funcao: 'administrativo', texto: 'Cotar novamente' },
  cotando: { funcao: 'administrativo', texto: 'Concluir a cotação e enviar para a Corretora' },
  cotada: { funcao: 'corretora', texto: 'Enviar ao cliente' },
  enviada: { funcao: 'corretora', texto: 'Registrar a resposta do cliente' },
  negociando: { funcao: 'corretora', texto: 'Fazer nova oferta ou encerrar a negociação' },
}

export const FUNCAO_LABEL: Record<Funcao, string> = { administrativo: 'Administrativo', corretora: 'Corretora' }

/**
 * Próxima atividade da renovação, ou null se não há nada a fazer agora.
 * Pendente só vira atividade a partir de 10 dias do vencimento (janela de alerta); as demais etapas
 * já estão em andamento e sempre têm uma atividade.
 */
export function atividadeDe(r: Renovacao, hoje = hojeIso()): Atividade | null {
  const a = ATIVIDADE[r.status]
  if (!a) return null
  if (r.status === 'pendente' && faixaVencimento(r.vencimento, hoje) == null) return null
  return a
}

// ---------------------------------------------------------------------------
// Ciclo de importação (dias 10 a 20: renovações do mês seguinte)
// ---------------------------------------------------------------------------

export const CICLO_INICIO = 10
export const CICLO_FIM = 20

export type FaseCiclo = 'antes' | 'aberto' | 'atrasado'

/** Antes do dia 10 não há aviso; do 10 ao 20 está aberto; depois do 20 o que faltou está atrasado. */
export function faseDoCiclo(hoje = hojeIso()): FaseCiclo {
  const dia = Number(hoje.slice(8, 10))
  if (dia < CICLO_INICIO) return 'antes'
  return dia <= CICLO_FIM ? 'aberto' : 'atrasado'
}

/** Mês (yyyy-mm) cujas renovações devem ser importadas neste ciclo. */
export function mesAlvoDoCiclo(hoje = hojeIso()): string {
  const [a, m] = hoje.split('-').map(Number)
  return toIso(new Date(a, m, 1)).slice(0, 7)
}
