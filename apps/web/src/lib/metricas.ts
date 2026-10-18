// Cálculos do Painel. Funções puras sobre o Db: sem acesso a rede nem a estado.
// Usam apenas campos que a planilha de renovações já traz (nada de prêmio/comissão).

import type { Db, Ramo, Renovacao, Seguro } from '../domain/types'
import { macroStatus, statusEmAberto, type Macro } from './atividades'
import { addMeses, diasAte, hojeIso, mesKey, mesLabel, toIso } from './format'

export const JANELA_MESES = 12
export const SEMANAS_CALENDARIO = 13 // ~90 dias
/** Renovação ainda em andamento (qualquer etapa antes de um desfecho). */
export const emAberto = (r: Renovacao) => statusEmAberto(r.status)

/** Desfecho que não virou renovação: o cliente não quis ou a negociação não fechou. */
const perdida = (r: Renovacao) => r.status === 'nao_renovada' || r.status === 'cancelada'

/** Últimos n meses (yyyy-mm), terminando no mês atual. */
export function ultimosMeses(n = JANELA_MESES): string[] {
  const atual = mesKey(hojeIso())
  return Array.from({ length: n }, (_, i) => addMeses(atual, i - (n - 1)))
}

/** Os 12 meses (yyyy-mm) de um ano, inclusive os que ainda não chegaram. */
export function mesesDoAno(ano: string | number): string[] {
  return Array.from({ length: 12 }, (_, i) => `${ano}-${String(i + 1).padStart(2, '0')}`)
}

/** Período mostrado no Painel: um ano inteiro ou, opcionalmente, um mês dele. */
export interface Periodo {
  ano: string
  mes: string | null
  /** Meses (yyyy-mm) cobertos pelo período. */
  meses: string[]
  rotulo: string
}

export function periodoDe(ano: string, mes: string | null): Periodo {
  return { ano, mes, meses: mes ? [mes] : mesesDoAno(ano), rotulo: mes ? mesLabel(mes) : ano }
}

/** Anos com renovações (mais o atual), em ordem crescente. */
export function anosDisponiveis(db: Db): string[] {
  const anos = new Set(db.renovacoes.map((r) => r.vencimento.slice(0, 4)))
  anos.add(hojeIso().slice(0, 4))
  return [...anos].sort()
}

function seguroDe(db: Db): Map<string, Seguro> {
  return new Map(db.seguros.map((s) => [s.id, s]))
}

// ---------- 1. Retenção e renovação ----------

export interface PontoTaxa {
  mes: string
  total: number
  renovadas: number
  naoRenovadas: number
  /** % de renovadas entre as fechadas; null quando nada foi fechado no mês. */
  taxa: number | null
}

export function taxaPorMes(db: Db, meses: string[]): PontoTaxa[] {
  return meses.map((mes) => {
    const doMes = db.renovacoes.filter((r) => mesKey(r.vencimento) === mes)
    const renovadas = doMes.filter((r) => r.status === 'renovada').length
    const naoRenovadas = doMes.filter(perdida).length
    const fechadas = renovadas + naoRenovadas
    return {
      mes,
      total: doMes.length,
      renovadas,
      naoRenovadas,
      taxa: fechadas ? Math.round((renovadas / fechadas) * 100) : null,
    }
  })
}

export interface Funil {
  total: number
  cotadas: number
  fechadas: number
  renovadas: number
  naoRenovadas: number
  /** Negociações encerradas sem acordo (já contadas em `fechadas`, separadas das não renovadas). */
  canceladas: number
  pendentes: number
  /** Em andamento: cotando, cotada, enviada ao cliente ou em negociação. */
  cotando: number
}

/** Funil das renovações que vencem nos meses informados (um mês ou o ano todo). */
export function funilDoPeriodo(db: Db, meses: string[]): Funil {
  const janela = new Set(meses)
  const doMes = db.renovacoes.filter((r) => janela.has(mesKey(r.vencimento)))
  const conta = (f: (r: Renovacao) => boolean) => doMes.filter(f).length
  return {
    total: doMes.length,
    cotadas: conta((r) => r.cotada || r.status !== 'pendente'),
    fechadas: conta((r) => r.status === 'renovada' || perdida(r)),
    renovadas: conta((r) => r.status === 'renovada'),
    naoRenovadas: conta((r) => r.status === 'nao_renovada'),
    canceladas: conta((r) => r.status === 'cancelada'),
    pendentes: conta((r) => r.status === 'pendente'),
    cotando: conta((r) => macroStatus(r.status) === 'andamento'),
  }
}

export interface Perda {
  chave: string
  perdidas: number
  fechadas: number
  /** % de não renovadas entre as fechadas. */
  taxa: number
}

/** Não renovadas por ramo ou seguradora (a do seguro que venceu), nos meses informados. */
export function perdas(db: Db, meses: string[], chave: (s: Seguro) => string): Perda[] {
  const seguros = seguroDe(db)
  const janela = new Set(meses)
  const m = new Map<string, { perdidas: number; fechadas: number }>()
  for (const r of db.renovacoes) {
    if (!janela.has(mesKey(r.vencimento))) continue
    if (r.status !== 'renovada' && !perdida(r)) continue
    const s = seguros.get(r.seguroId)
    if (!s) continue
    const k = chave(s)
    const g = m.get(k) ?? { perdidas: 0, fechadas: 0 }
    g.fechadas++
    if (perdida(r)) g.perdidas++
    m.set(k, g)
  }
  return [...m.entries()]
    .map(([k, g]) => ({ chave: k, ...g, taxa: Math.round((g.perdidas / g.fechadas) * 100) }))
    .filter((p) => p.perdidas > 0)
    .sort((a, b) => b.perdidas - a.perdidas || b.taxa - a.taxa)
}

// ---------- 2. Operação e urgência ----------

export interface Semana {
  /** null = renovações em aberto que já venceram. */
  inicio: string | null
  contagem: Record<Macro, number>
  total: number
}

const zerado = (): Record<Macro, number> => ({ pendente: 0, andamento: 0, renovada: 0, nao_renovada: 0, cancelada: 0 })

/** Vencimentos agrupados em semanas a partir de hoje; o primeiro item reúne os atrasados em aberto. */
export function vencimentosPorSemana(db: Db, semanas = SEMANAS_CALENDARIO): Semana[] {
  const hoje = new Date(`${hojeIso()}T00:00:00`)
  const lista: Semana[] = [
    { inicio: null, contagem: zerado(), total: 0 },
    ...Array.from({ length: semanas }, (_, i) => {
      const d = new Date(hoje)
      d.setDate(d.getDate() + i * 7)
      return { inicio: toIso(d), contagem: zerado(), total: 0 }
    }),
  ]
  for (const r of db.renovacoes) {
    const d = diasAte(r.vencimento)
    let idx: number
    if (d < 0) idx = emAberto(r) ? 0 : -1
    else if (d < semanas * 7) idx = 1 + Math.floor(d / 7)
    else idx = -1
    if (idx < 0) continue
    lista[idx].contagem[macroStatus(r.status)]++
    lista[idx].total++
  }
  return lista
}

/** Renovações em aberto, das mais urgentes (atrasadas) às mais distantes. */
export function filaDeAcao(db: Db): Renovacao[] {
  return db.renovacoes.filter(emAberto).sort((a, b) => a.vencimento.localeCompare(b.vencimento))
}

/** Chave dos agrupamentos para renovações sem corretor definido (importadas sem a coluna). */
export const SEM_CORRETOR = ''

export interface Carga {
  corretorId: string
  pendente: number
  andamento: number
  total: number
}

/** Em aberto que vencem em até `dias` dias (inclui as já atrasadas), por corretor. */
export function cargaPorCorretor(db: Db, dias = 30): Carga[] {
  const m = new Map<string, Carga>(db.corretores.map((c) => [c.id, { corretorId: c.id, pendente: 0, andamento: 0, total: 0 }]))
  for (const r of db.renovacoes) {
    if (!emAberto(r) || diasAte(r.vencimento) > dias) continue
    const c = m.get(r.corretorId ?? SEM_CORRETOR) ?? { corretorId: r.corretorId ?? SEM_CORRETOR, pendente: 0, andamento: 0, total: 0 }
    if (r.status === 'pendente') c.pendente++
    else c.andamento++
    c.total++
    m.set(r.corretorId ?? SEM_CORRETOR, c)
  }
  return [...m.values()].sort((a, b) => b.total - a.total)
}

// ---------- 3. Composição da carteira ----------

const ativos = (db: Db) => db.seguros.filter((s) => s.situacao === 'ativo')

/** Clientes com seguro ativo agrupados em 1, 2 e 3+ seguros. */
export function clientesPorQtdSeguros(db: Db): { um: number; dois: number; tresOuMais: number } {
  const porCliente = new Map<string, number>()
  for (const s of ativos(db)) porCliente.set(s.clienteId, (porCliente.get(s.clienteId) ?? 0) + 1)
  const out = { um: 0, dois: 0, tresOuMais: 0 }
  for (const n of porCliente.values()) {
    if (n === 1) out.um++
    else if (n === 2) out.dois++
    else out.tresOuMais++
  }
  return out
}

/** Seguros ativos contados por uma chave (ramo, seguradora...), do maior para o menor. */
export function mixDaCarteira(db: Db, chave: (s: Seguro) => string): { chave: string; valor: number }[] {
  const m = new Map<string, number>()
  for (const s of ativos(db)) m.set(chave(s), (m.get(chave(s)) ?? 0) + 1)
  return [...m.entries()].map(([chave, valor]) => ({ chave, valor })).sort((a, b) => b.valor - a.valor)
}

export interface VendaCruzada {
  /** Têm auto ativo e nenhum residencial ativo. */
  semResidencial: string[]
  /** Têm residencial ativo e nenhum auto ativo. */
  semAuto: string[]
}

export function vendaCruzada(db: Db): VendaCruzada {
  const ramos = new Map<string, Set<Ramo>>()
  for (const s of ativos(db)) {
    const set = ramos.get(s.clienteId) ?? new Set<Ramo>()
    set.add(s.ramo)
    ramos.set(s.clienteId, set)
  }
  const out: VendaCruzada = { semResidencial: [], semAuto: [] }
  for (const [clienteId, set] of ramos) {
    if (set.has('auto') && !set.has('residencial')) out.semResidencial.push(clienteId)
    if (set.has('residencial') && !set.has('auto')) out.semAuto.push(clienteId)
  }
  return out
}

export interface PontoCarteira {
  mes: string
  /** null nos meses que ainda não chegaram. */
  clientes: number | null
  seguros: number | null
}

/** Seguros vigentes no fim de cada mês (hoje, para o mês atual). Vale tanto quanto o histórico importado. */
export function evolucaoDaCarteira(db: Db, meses: string[]): PontoCarteira[] {
  const hoje = hojeIso()
  const comVigencia = db.seguros.filter((s) => s.inicioVigencia && s.fimVigencia && s.situacao !== 'cancelado')
  const mesAtual = mesKey(hoje)
  return meses.map((mes) => {
    if (mes > mesAtual) return { mes, seguros: null, clientes: null }
    const [a, m] = mes.split('-').map(Number)
    const fimDoMes = toIso(new Date(a, m, 0))
    const ref = fimDoMes < hoje ? fimDoMes : hoje
    const vigentes = comVigencia.filter((s) => s.inicioVigencia <= ref && ref < s.fimVigencia)
    return { mes, seguros: vigentes.length, clientes: new Set(vigentes.map((s) => s.clienteId)).size }
  })
}

// ---------- 4. Movimento entre seguradoras ----------

export interface Trocas {
  /** `${de}|${para}` → quantidade. */
  fluxo: Map<string, number>
  saldo: { seguradoraId: string; ganhou: number; perdeu: number; saldo: number }[]
  total: number
}

/** Renovações fechadas com uma seguradora diferente da anterior. */
export function trocasEntreSeguradoras(db: Db, meses: string[]): Trocas {
  const seguros = seguroDe(db)
  const janela = new Set(meses)
  const fluxo = new Map<string, number>()
  const saldo = new Map<string, { ganhou: number; perdeu: number }>()
  const acc = (id: string) => saldo.get(id) ?? { ganhou: 0, perdeu: 0 }
  let total = 0
  for (const r of db.renovacoes) {
    if (r.status !== 'renovada' || !r.seguradoraFechadaId || !janela.has(mesKey(r.vencimento))) continue
    const de = seguros.get(r.seguroId)?.seguradoraId
    if (!de || de === r.seguradoraFechadaId) continue
    const k = `${de}|${r.seguradoraFechadaId}`
    fluxo.set(k, (fluxo.get(k) ?? 0) + 1)
    const a = acc(de)
    a.perdeu++
    saldo.set(de, a)
    const b = acc(r.seguradoraFechadaId)
    b.ganhou++
    saldo.set(r.seguradoraFechadaId, b)
    total++
  }
  return {
    fluxo,
    total,
    saldo: [...saldo.entries()]
      .map(([seguradoraId, v]) => ({ seguradoraId, ...v, saldo: v.ganhou - v.perdeu }))
      .sort((a, b) => b.saldo - a.saldo),
  }
}
