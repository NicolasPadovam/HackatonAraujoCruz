// Conversão de células da planilha para os tipos do CRM.

import type { Corretor, Ramo, Seguradora, StatusRenovacao } from '../domain/types'
import { normalizarNome } from '../lib/format'
import { somenteDigitos } from '../lib/validacao'
import type { Celula } from './leitura'

export type FormatoData = 'dmy' | 'mdy'

const vazio = (v: Celula) => v == null || (typeof v === 'string' && v.trim() === '')

export function texto(v: Celula): string | undefined {
  if (vazio(v)) return undefined
  return String(v).trim().replace(/\s+/g, ' ')
}

function isoDe(a: number, m: number, d: number): string | null {
  const dt = new Date(a, m - 1, d)
  if (dt.getFullYear() !== a || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null
  return `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Número serial do Excel (dias desde 30/12/1899) -> yyyy-mm-dd. */
function serialParaIso(serial: number): string | null {
  if (serial < 1 || serial > 100000) return null
  const dt = new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86_400_000)
  return isoDe(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())
}

/** Datas: serial do Excel, dd/mm/aaaa ou mm/dd/aaaa (conforme o formato), aaaa-mm-dd. */
export function converterData(v: Celula, formato: FormatoData): string | null {
  if (vazio(v)) return null
  if (typeof v === 'number') return serialParaIso(v)
  const t = String(v).trim()
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t)
  if (m) return isoDe(+m[1], +m[2], +m[3])
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})(?:\s.*)?$/.exec(t) // aceita hora no fim ("05/11/2026 00:00:00")
  if (!m) return null
  const ano = m[3].length === 2 ? 2000 + +m[3] : +m[3]
  return formato === 'dmy' ? isoDe(ano, +m[2], +m[1]) : isoDe(ano, +m[1], +m[2])
}

/**
 * Descobre se as datas em texto estão em dd/mm ou mm/dd olhando valores > 12.
 * Devolve null quando não dá para saber (todas ambíguas ou sem datas em texto).
 */
export function detectarFormatoData(valores: Celula[]): FormatoData | null {
  let dmy = 0
  let mdy = 0
  for (const v of valores) {
    if (typeof v !== 'string') continue
    const m = /^(\d{1,2})[/.-](\d{1,2})[/.-]\d{2,4}(?:\s.*)?$/.exec(v.trim())
    if (!m) continue
    if (+m[1] > 12) dmy++
    if (+m[2] > 12) mdy++
  }
  if (dmy && !mdy) return 'dmy'
  if (mdy && !dmy) return 'mdy'
  return null
}

/** "R$ 1.234,56", "1234.56", 1234.56. Zero e "R$ -" contam como vazio (sem informação). */
export function converterNumero(v: Celula): number | undefined {
  if (vazio(v)) return undefined
  if (typeof v === 'number') return v === 0 ? undefined : v
  const t = String(v).replace(/[R$\s%]/g, '').trim()
  if (!t || t === '-' || t === '—') return undefined
  let normal = t
  if (t.includes(',')) normal = t.replace(/\./g, '').replace(',', '.')
  else if ((t.match(/\./g) ?? []).length > 1) normal = t.replace(/\./g, '')
  const n = Number(normal)
  return Number.isFinite(n) && n !== 0 ? n : undefined
}

/** Comissão: 15, "15%", ou 0,15 (célula formatada como %) -> 15. */
export function converterPercentual(v: Celula): number | undefined {
  const n = converterNumero(v)
  if (n == null) return undefined
  return n > 0 && n < 1 ? Math.round(n * 10000) / 100 : n
}

export function converterInteiro(v: Celula): number | undefined {
  const n = converterNumero(v)
  return n != null && Number.isFinite(n) && n > 0 ? Math.round(n) : undefined
}

const SIM = new Set(['true', 'verdadeiro', 'sim', 's', 'x', '✅', '✔', '✔️', '☑', '☑️', 'ok', '1', 'renovada', 'renovado', 'yes'])
const NAO = new Set(['❌', '✖', '✖️', '✗', 'nao', 'n', 'nao renovada', 'nao renovado', 'perdida', 'perdido', 'no'])

/** true = sim, false = não (explícito), null = vazio/indefinido. */
export function converterSimNao(v: Celula): boolean | null {
  if (typeof v === 'boolean') return v
  if (vazio(v)) return null
  const t = normalizarNome(String(v))
  if (SIM.has(t)) return true
  if (NAO.has(t)) return false
  if (t === 'false' || t === 'falso' || t === '0') return null // caixa de seleção desmarcada: ainda não decidido
  return null
}

/**
 * Andamento: ✅/TRUE = renovada, ❌ = não renovada; sem decisão -> cotando (se cotada) ou pendente.
 * Caixa de seleção desmarcada (FALSE) NÃO conta como "não renovada".
 */
export function converterStatus(renovada: Celula, cotada: Celula): StatusRenovacao {
  if (typeof renovada === 'boolean') {
    if (renovada) return 'renovada'
  } else {
    const r = converterSimNao(renovada)
    if (r === true) return 'renovada'
    if (r === false) return 'nao_renovada'
  }
  return converterSimNao(cotada) === true ? 'cotando' : 'pendente'
}

/** Códigos de ramo SUSEP vistos nos relatórios (docs/importacao/). Código desconhecido usa o ramo padrão. */
const RAMO_POR_CODIGO: Record<string, Ramo> = { '531': 'auto', '0531': 'auto' }

/**
 * Ramo pela descrição ou pelo código. Pacote "AUTO+RESID" conta como residencial
 * (decisão da equipe: o pacote é um seguro só). Código numérico desconhecido -> null (usa o padrão).
 */
export function converterRamo(v: Celula): Ramo | null {
  const t = normalizarNome(String(v ?? ''))
  if (!t) return null
  if (/^\d+$/.test(t)) return RAMO_POR_CODIGO[t] ?? null
  if (/resid|casa|condominio|habitacional/.test(t)) return 'residencial'
  if (/\bauto|veiculo|\bmoto|carro/.test(t)) return 'auto'
  if (/\bvida\b|acidentes pessoais|^ap$/.test(t)) return 'vida'
  return 'outro'
}

export function acharSeguradora(v: Celula, seguradoras: (Seguradora & { apelidos?: string[] })[]): Seguradora | undefined {
  const t = normalizarNome(String(v ?? ''))
  if (!t) return undefined
  const nomes = (s: Seguradora & { apelidos?: string[] }) => [s.nome, ...(s.apelidos ?? [])].map(normalizarNome)
  return (
    seguradoras.find((s) => nomes(s).includes(t)) ??
    seguradoras.find((s) => nomes(s).some((n) => t.startsWith(n) || n.startsWith(t)))
  )
}

export function acharCorretor(v: Celula, corretores: Corretor[]): Corretor | undefined {
  const t = normalizarNome(String(v ?? ''))
  if (!t) return undefined
  return corretores.find((c) => normalizarNome(c.sigla) === t) ?? corretores.find((c) => normalizarNome(c.nome) === t || normalizarNome(c.nome).startsWith(t))
}

export function converterDocumento(v: Celula): string | undefined {
  if (vazio(v)) return undefined
  // número sem zeros à esquerda (CPF digitado como número no Excel)
  let d = typeof v === 'number' ? String(Math.round(v)) : somenteDigitos(String(v))
  if (d.length === 9 || d.length === 10) d = d.padStart(11, '0')
  else if (d.length === 12 || d.length === 13) d = d.padStart(14, '0')
  return d.length === 11 || d.length === 14 ? d : undefined
}
