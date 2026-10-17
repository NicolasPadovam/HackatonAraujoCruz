export function somenteDigitos(v: string): string {
  return v.replace(/\D/g, '')
}

function digitoVerificador(base: string, pesos: number[]): number {
  const soma = base.split('').reduce((t, d, i) => t + Number(d) * pesos[i], 0)
  const resto = soma % 11
  return resto < 2 ? 0 : 11 - resto
}

export function cpfValido(v: string): boolean {
  const d = somenteDigitos(v)
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false
  const d1 = digitoVerificador(d.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2])
  const d2 = digitoVerificador(d.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2])
  return d1 === Number(d[9]) && d2 === Number(d[10])
}

export function cnpjValido(v: string): boolean {
  const d = somenteDigitos(v)
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false
  const d1 = digitoVerificador(d.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  const d2 = digitoVerificador(d.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  return d1 === Number(d[12]) && d2 === Number(d[13])
}

export function fmtCpfCnpj(v?: string): string {
  if (!v) return ''
  const d = somenteDigitos(v)
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  return v
}

export function fmtTelefone(v: string): string {
  const d = somenteDigitos(v)
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  return v.trim()
}

export function emailValido(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
}

/** Aceita "1.234,56", "1234,56" e "1234.56". Vazio = undefined. */
export function parseNumeroBR(v: string): number | undefined {
  const t = v.trim().replace(/[R$\s%]/g, '')
  if (!t) return undefined
  const normal = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t
  const n = Number(normal)
  return Number.isFinite(n) ? n : NaN
}

export function numeroParaCampo(v?: number): string {
  return v == null ? '' : v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}
