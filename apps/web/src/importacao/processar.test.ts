import { describe, expect, it } from 'vitest'
import type { Db } from '../domain/types'
import type { Aba } from './leitura'
import { reconhecer } from './modelo'
import { bloqueia, chaveLinha, processar, type Correcao } from './processar'

// Dados 100% fictícios. CPFs de exemplo de livro (válidos no dígito, sem dono real).
const CPF_A = '12345678909'
const CPF_B = '11144477735'

const dbVazio = (): Db => ({
  clientes: [],
  seguradoras: [{ id: 'seg-1', nome: 'Seguradora Teste' }],
  corretores: [{ id: 'cor-1', nome: 'Corretor Teste', sigla: 'T' }],
  seguros: [],
  renovacoes: [],
  cotacoes: [],
  importacoes: [],
  modelos: [],
})

const CAB = ['Nome', 'CPF', 'Apólice', 'Ramo', 'Vencimento']
const rodar = (db: Db, linhas: (string | null)[][], correcoes?: Record<string, Correcao>, descartadas?: Set<string>) =>
  processar({
    db,
    abas: [{
      aba: { nome: 'A', linhas: [CAB, ...linhas] },
      linhaCabecalho: 0,
      mapeamento: { segurado: 'Nome', cpfCnpj: 'CPF', numeroApolice: 'Apólice', ramo: 'Ramo', vencimento: 'Vencimento' },
      formatoData: 'dmy',
    }],
    seguradoraFixaId: 'seg-1',
    correcoes,
    descartadas,
  })

describe('pendências', () => {
  it('linha sem CPF fica pendente e não grava nada', () => {
    const r = rodar(dbVazio(), [['CLIENTE FICTICIO UM', null, 'AP-1', 'Residencial', '10/11/2026']])
    expect(r.linhas[0].resultado).toBe('pendente')
    expect(r.linhas[0].faltando).toContain('cpfCnpj')
    expect(r.plano.clientes).toHaveLength(0)
  })

  it('CPF digitado libera a linha e vale para as outras do mesmo nome', () => {
    const linhas = [['CLIENTE FICTICIO UM', null, 'AP-1', 'Residencial', '10/11/2026'], ['Cliente Ficticio Um', null, 'AP-2', 'Auto', '20/11/2026']]
    const r = rodar(dbVazio(), linhas, { [chaveLinha('A', 2)]: { cpfCnpj: '123.456.789-09' } })
    expect(r.linhas.map((l) => l.resultado)).toEqual(['novo_cliente', 'vinculado'])
    expect(r.plano.clientes).toHaveLength(1)
    expect(r.plano.clientes[0].cpfCnpj).toBe(CPF_A)
  })

  it('CPF digitado inválido continua pendente', () => {
    const r = rodar(dbVazio(), [['CLIENTE FICTICIO UM', null, 'AP-1', 'Residencial', '10/11/2026']], { [chaveLinha('A', 2)]: { cpfCnpj: '123.456.789-00' } })
    expect(r.linhas[0].resultado).toBe('pendente')
    expect(r.linhas[0].mensagens).toContain('O CPF/CNPJ digitado não é válido.')
  })

  it('sem CPF, mas com cliente já cadastrado com documento: não pede', () => {
    const db = dbVazio()
    db.clientes.push({ id: 'c1', nome: 'Cliente Ficticio Um', tipo: 'fisica', cpfCnpj: CPF_A, origem: 'carteira' })
    const r = rodar(db, [['CLIENTE FICTICIO UM', null, 'AP-1', 'Residencial', '10/11/2026']])
    expect(r.linhas[0].resultado).toBe('vinculado')
  })

  it('nome com XXX exige correção; o nome corrigido é o gravado', () => {
    const linhas = [['FULANO XXX TESTE', CPF_B, 'AP-1', 'Residencial', '10/11/2026']]
    expect(rodar(dbVazio(), linhas).linhas[0].faltando).toContain('segurado')
    expect(rodar(dbVazio(), linhas, { [chaveLinha('A', 2)]: { nome: 'Fulano xxX Teste' } }).linhas[0].resultado).toBe('pendente')
    const r = rodar(dbVazio(), linhas, { [chaveLinha('A', 2)]: { nome: 'Fulano De Tal Teste' } })
    expect(r.linhas[0].resultado).toBe('novo_cliente')
    expect(r.linhas[0].nomePlanilha).toBe('FULANO XXX TESTE')
    expect(r.plano.clientes[0].nome).toBe('Fulano De Tal Teste')
  })

  it('apólice, ramo e vencimento faltando podem ser preenchidos na prévia', () => {
    const linhas = [['CLIENTE FICTICIO UM', CPF_A, null, null, 'data ruim']]
    const p = rodar(dbVazio(), linhas)
    expect(p.linhas[0].faltando).toEqual(expect.arrayContaining(['numeroApolice', 'ramo', 'vencimento']))
    const r = rodar(dbVazio(), linhas, { [chaveLinha('A', 2)]: { numeroApolice: 'AP-9', ramo: 'vida', vencimento: '2026-12-01' } })
    expect(r.linhas[0].resultado).toBe('novo_cliente')
    expect(r.plano.seguros[0]).toMatchObject({ numeroApolice: 'AP-9', ramo: 'vida', fimVigencia: '2026-12-01' })
  })

  it('opcionais faltando aparecem para preencher, mas não bloqueiam', () => {
    const r = rodar(dbVazio(), [['CLIENTE FICTICIO UM', CPF_A, 'AP-1', 'Residencial', '10/11/2026']])
    expect(r.linhas[0].resultado).toBe('novo_cliente')
    expect(r.linhas[0].faltando).toEqual(['telefone', 'email', 'corretor'])
    expect(r.plano.renovacoes[0].corretorId).toBeUndefined()
  })
})

describe('nenhuma linha é ignorada', () => {
  it('linha sem nome e sem vencimento (ex.: total) aparece e bloqueia', () => {
    const r = rodar(dbVazio(), [['CLIENTE FICTICIO UM', CPF_A, 'AP-1', 'Residencial', '10/11/2026'], [null, null, null, 'TOTAL', null]])
    expect(r.linhas).toHaveLength(2)
    expect(r.linhas.filter(bloqueia)).toHaveLength(1)
  })

  it('só sai da prévia se a pessoa descartar, e fica registrada como descartada', () => {
    const r = rodar(dbVazio(), [[null, null, null, 'TOTAL', null]], undefined, new Set([chaveLinha('A', 2)]))
    expect(r.linhas[0].resultado).toBe('descartada')
    expect(r.linhas.filter(bloqueia)).toHaveLength(0)
  })

  it('linha totalmente vazia não conta', () => {
    expect(rodar(dbVazio(), [[null, null, null, null, null]]).linhas).toHaveLength(0)
  })
})

describe('reconhecimento do formato', () => {
  const aba = (nome: string, linhas: (string | null)[][]): Aba => ({ nome, linhas })

  it('reconhece as colunas sozinho', () => {
    const r = reconhecer([aba('Nov', [CAB, ['X', CPF_A, 'AP', 'Auto', '10/11/2026']])], undefined, false)
    expect(r.ok).toBe(true)
  })

  it('aba com dados sem nome/vencimento reconhecíveis falha (erro para o administrador)', () => {
    const r = reconhecer([aba('Nov', [CAB, ['X', CPF_A, 'AP', 'Auto', '10/11/2026']]), aba('Resumo', [['Coluna estranha', 'Outra'], ['1', '2']])], undefined, false)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.problemas.map((p) => p.aba)).toEqual(['Resumo'])
  })
})
