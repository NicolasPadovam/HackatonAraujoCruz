import { describe, expect, it } from 'vitest'
import { faixaVencimento } from './format'

const HOJE = '2030-03-10'

describe('faixaVencimento', () => {
  it.each([
    ['2030-03-21', 11, null],
    ['2030-03-20', 10, 'proxima'],
    ['2030-03-16', 6, 'proxima'],
    ['2030-03-15', 5, 'atencao'],
    ['2030-03-12', 2, 'atencao'],
    ['2030-03-11', 1, 'urgente'],
    ['2030-03-10', 0, 'urgente'],
    ['2030-03-09', -1, 'urgente'],
    ['2029-12-01', -99, 'urgente'],
  ])('vencimento %s (%i dias) → %s', (venc, _dias, esperado) => {
    expect(faixaVencimento(venc, HOJE)).toBe(esperado)
  })

  it('conta dias corridos na virada de mês', () => {
    expect(faixaVencimento('2030-03-02', '2030-02-28')).toBe('atencao')
  })
})
