const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export function hojeIso(): string {
  return toIso(new Date())
}

export function toIso(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${dia}`
}

export function parseIso(iso: string): Date {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d)
}

export function fmtData(iso: string): string {
  return parseIso(iso).toLocaleDateString('pt-BR')
}

export function fmtDataCurta(iso: string): string {
  const d = parseIso(iso)
  return `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3).toLowerCase()}`
}

export function fmtMoeda(v?: number): string {
  if (v == null) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function fmtPct(v?: number): string {
  if (v == null) return '—'
  return `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
}

/** Chave de mês no formato yyyy-mm. */
export function mesKey(iso: string): string {
  return iso.slice(0, 7)
}

export function addMeses(key: string, n: number): string {
  const [a, m] = key.split('-').map(Number)
  const d = new Date(a, m - 1 + n, 1)
  return toIso(d).slice(0, 7)
}

/** Meses com renovações, a partir de 2 meses atrás (histórico antigo fica na ficha do cliente). */
export function mesesRecentes(vencimentos: string[]): string[] {
  const inicio = addMeses(mesKey(hojeIso()), -2)
  return [...new Set(vencimentos.map(mesKey))].filter((m) => m >= inicio).sort()
}

export function mesLabel(key: string, curto = false): string {
  const [a, m] = key.split('-').map(Number)
  const nome = MESES[m - 1]
  return curto ? `${nome.slice(0, 3)}/${String(a).slice(2)}` : `${nome} ${a}`
}

export function diasAte(iso: string): number {
  const ms = parseIso(iso).getTime() - parseIso(hojeIso()).getTime()
  return Math.round(ms / 86_400_000)
}

export function prazoLabel(iso: string): string {
  const d = diasAte(iso)
  if (d === 0) return 'vence hoje'
  if (d === 1) return 'vence amanhã'
  if (d > 1) return `vence em ${d} dias`
  if (d === -1) return 'venceu ontem'
  return `venceu há ${-d} dias`
}

export function iniciais(nome: string): string {
  const partes = nome.replace(/ LTDA| ME| EIRELI/gi, '').trim().split(/\s+/)
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase()
}

export function normalizarNome(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}
