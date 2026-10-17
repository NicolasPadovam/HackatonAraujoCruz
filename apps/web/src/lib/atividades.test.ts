import { describe, expect, it } from 'vitest'
import type { Cotacao, Renovacao, Seguro, StatusRenovacao } from '../domain/types'
import {
  atividadeDe, avancar, faseDoCiclo, mesAlvoDoCiclo, statusEmAberto, transicaoPermitida, transicaoPermitidaNoBanco, validarAvanco,
} from './atividades'

const HOJE = '2030-03-10'

const seguro: Seguro = {
  id: 's1', clienteId: 'c1', seguradoraId: 'porto', ramo: 'auto',
  inicioVigencia: '2029-03-20', fimVigencia: '2030-03-20', situacao: 'ativo',
}

const ren = (status: StatusRenovacao, vencimento = '2030-03-20'): Renovacao => ({
  id: 'r1', seguroId: 's1', vencimento, corretorId: 'k1', status, cotada: status !== 'pendente',
})

const cot = (id: string, status: Cotacao['status']): Cotacao => ({
  id, clienteId: 'c1', renovacaoId: 'r1', ramo: 'auto', seguradoraId: 'porto', premio: 1000, origem: 'manual', status, data: HOJE,
})

describe('atividadeDe', () => {
  it('pendente a 10 dias do vencimento é do Administrativo; a 11 dias não tem atividade', () => {
    expect(atividadeDe(ren('pendente', '2030-03-20'), HOJE)).toEqual({ funcao: 'administrativo', texto: 'Cotar novamente' })
    expect(atividadeDe(ren('pendente', '2030-03-21'), HOJE)).toBeNull()
  })

  it('pendente vencida continua sendo atividade', () => {
    expect(atividadeDe(ren('pendente', '2030-03-01'), HOJE)?.funcao).toBe('administrativo')
  })

  it.each([
    ['cotando', 'administrativo'],
    ['cotada', 'corretora'],
    ['enviada', 'corretora'],
    ['negociando', 'corretora'],
  ] as const)('%s é atividade de %s, mesmo longe do vencimento', (status, funcao) => {
    expect(atividadeDe(ren(status, '2030-12-01'), HOJE)?.funcao).toBe(funcao)
  })

  it.each(['renovada', 'nao_renovada', 'cancelada'] as const)('%s não tem atividade', (status) => {
    expect(atividadeDe(ren(status), HOJE)).toBeNull()
  })
})

describe('transições', () => {
  it('segue o fluxo principal', () => {
    const caminho: StatusRenovacao[] = ['pendente', 'cotando', 'cotada', 'enviada', 'renovada']
    for (let i = 0; i < caminho.length - 1; i++) expect(transicaoPermitida(caminho[i], caminho[i + 1])).toBe(true)
  })

  it('negociação volta para enviada ou termina em cancelada', () => {
    expect(transicaoPermitida('enviada', 'negociando')).toBe(true)
    expect(transicaoPermitida('negociando', 'enviada')).toBe(true)
    expect(transicaoPermitida('negociando', 'cancelada')).toBe(true)
  })

  it('não permite saltos nem ficar parado', () => {
    expect(transicaoPermitida('pendente', 'enviada')).toBe(false)
    expect(transicaoPermitida('cotada', 'negociando')).toBe(false)
    expect(transicaoPermitida('cancelada', 'renovada')).toBe(false)
    expect(transicaoPermitida('cotada', 'cotada')).toBe(false)
  })

  it('não renovada vale de qualquer etapa em aberto', () => {
    for (const s of ['pendente', 'cotando', 'cotada', 'enviada', 'negociando'] as const) {
      expect(transicaoPermitida(s, 'nao_renovada')).toBe(true)
    }
  })

  it('o banco mantém livre o fluxo antigo (importação) e só vigia as etapas novas', () => {
    expect(transicaoPermitidaNoBanco('cotando', 'renovada')).toBe(true)
    expect(transicaoPermitidaNoBanco('renovada', 'cotando')).toBe(true)
    expect(transicaoPermitidaNoBanco('cotando', 'enviada')).toBe(false)
    expect(transicaoPermitidaNoBanco('enviada', 'cotando')).toBe(false)
  })

  it('só desfechos fecham a renovação', () => {
    expect(statusEmAberto('negociando')).toBe(true)
    expect(statusEmAberto('cancelada')).toBe(false)
  })
})

describe('validarAvanco', () => {
  it('concluir a cotação exige prêmio', () => {
    expect(validarAvanco('cotando', 'cotada')).toMatch(/Registre a cotação/)
    expect(validarAvanco('cotando', 'cotada', { seguradoraId: 'porto', premio: 0 })).toMatch(/prêmio/)
    expect(validarAvanco('cotando', 'cotada', { seguradoraId: 'porto', premio: 900 })).toBeNull()
  })

  it('nova oferta exige prêmio, comissão e caminho', () => {
    expect(validarAvanco('negociando', 'enviada', { seguradoraId: 'porto', premio: 900 })).toMatch(/comissão/)
    expect(validarAvanco('negociando', 'enviada', { seguradoraId: 'porto', premio: 900, comissaoPct: 10 })).toMatch(/como a nova oferta/)
    expect(
      validarAvanco('negociando', 'enviada', { seguradoraId: 'porto', premio: 900, comissaoPct: 10, caminho: 'reducao_comissao' }),
    ).toBeNull()
  })

  it('rejeita movimento fora do fluxo', () => {
    expect(validarAvanco('pendente', 'enviada')).toMatch(/fluxo/)
  })
})

describe('avancar', () => {
  it('concluir cotação grava a cotação e passa para cotada', () => {
    const r = avancar(ren('cotando'), seguro, 'cotada', [], { cotacao: { seguradoraId: 'tokio', premio: 1200 } }, HOJE)
    expect(r.patch.status).toBe('cotada')
    expect(r.novasCotacoes).toHaveLength(1)
    expect(r.novasCotacoes[0]).toMatchObject({ seguradoraId: 'tokio', premio: 1200, status: 'cotada', renovacaoId: 'r1', clienteId: 'c1' })
  })

  it('enviar ao cliente marca a cotação como enviada', () => {
    const r = avancar(ren('cotada'), seguro, 'enviada', [cot('a', 'cotada')], {}, HOJE)
    expect(r.atualizacoes).toEqual([{ id: 'a', status: 'enviada' }])
  })

  it('cliente não concordou recusa a oferta enviada', () => {
    const r = avancar(ren('enviada'), seguro, 'negociando', [cot('a', 'enviada')], {}, HOJE)
    expect(r.patch.status).toBe('negociando')
    expect(r.atualizacoes).toEqual([{ id: 'a', status: 'recusada' }])
  })

  it('nova oferta volta a renovação para enviada, com comissão e caminho', () => {
    const r = avancar(
      ren('negociando'), seguro, 'enviada', [cot('a', 'recusada')],
      { cotacao: { seguradoraId: 'porto', premio: 950, comissaoPct: 8, caminho: 'contato_seguradora' } }, HOJE,
    )
    expect(r.patch.status).toBe('enviada')
    expect(r.novasCotacoes[0]).toMatchObject({ premio: 950, comissaoPct: 8, caminho: 'contato_seguradora', status: 'enviada' })
  })

  it('aceite fecha a renovação, aceita a oferta e guarda a seguradora que fechou', () => {
    const r = avancar(ren('enviada'), seguro, 'renovada', [cot('a', 'enviada')], { seguradoraFechadaId: 'tokio' }, HOJE)
    expect(r.patch).toMatchObject({ status: 'renovada', seguradoraFechadaId: 'tokio' })
    expect(r.atualizacoes).toEqual([{ id: 'a', status: 'aceita' }])
  })

  it('sem escolher seguradora, fecha com a atual', () => {
    expect(avancar(ren('enviada'), seguro, 'renovada', [], {}, HOJE).patch.seguradoraFechadaId).toBe('porto')
  })

  it('encerrar a negociação cancela e limpa a seguradora fechada', () => {
    const r = avancar({ ...ren('negociando'), seguradoraFechadaId: 'tokio' }, seguro, 'cancelada', [], {}, HOJE)
    expect(r.patch.status).toBe('cancelada')
    expect(r.patch.seguradoraFechadaId).toBeUndefined()
  })

  it('lança erro em avanço inválido', () => {
    expect(() => avancar(ren('pendente'), seguro, 'enviada', [], {}, HOJE)).toThrow()
  })
})

describe('ciclo de importação', () => {
  it.each([
    ['2030-03-09', 'antes'],
    ['2030-03-10', 'aberto'],
    ['2030-03-20', 'aberto'],
    ['2030-03-21', 'atrasado'],
  ] as const)('%s → %s', (hoje, fase) => {
    expect(faseDoCiclo(hoje)).toBe(fase)
  })

  it('o mês alvo é o seguinte, inclusive na virada do ano', () => {
    expect(mesAlvoDoCiclo('2030-03-15')).toBe('2030-04')
    expect(mesAlvoDoCiclo('2030-12-15')).toBe('2031-01')
  })
})
