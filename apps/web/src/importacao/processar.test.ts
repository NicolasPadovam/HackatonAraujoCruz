import { describe, expect, it } from 'vitest'
import type { Db } from '../domain/types'
import { chaveLinha, processar, type Correcao } from './processar'

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

const CAB = ['Nome', 'CPF', 'Vencimento']
const rodar = (db: Db, linhas: (string | null)[][], correcoes?: Record<string, Correcao>) =>
  processar({
    db,
    abas: [{ aba: { nome: 'A', linhas: [CAB, ...linhas] }, linhaCabecalho: 0 }],
    mapeamento: { segurado: 'Nome', cpfCnpj: 'CPF', vencimento: 'Vencimento' },
    seguradoraFixaId: 'seg-1',
    formatoData: 'dmy',
    ramoPadrao: 'residencial',
    corretorPadraoId: 'cor-1',
    correcoes,
  })

describe('pendências de CPF e nome', () => {
  it('linha sem CPF fica pendente e não grava nada', () => {
    const r = rodar(dbVazio(), [['CLIENTE FICTICIO UM', null, '10/11/2026']])
    expect(r.linhas[0].resultado).toBe('pendente')
    expect(r.linhas[0].pendencias).toEqual({ nome: false, cpf: true })
    expect(r.plano.clientes).toHaveLength(0)
  })

  it('CPF digitado libera a linha e vale para as outras do mesmo nome', () => {
    const linhas = [['CLIENTE FICTICIO UM', null, '10/11/2026'], ['Cliente Ficticio Um', null, '20/11/2026']]
    const r = rodar(dbVazio(), linhas, { [chaveLinha('A', 3)]: { cpfCnpj: '123.456.789-09' } })
    expect(r.linhas.map((l) => l.resultado)).toEqual(['novo_cliente', 'vinculado'])
    expect(r.plano.clientes).toHaveLength(1)
    expect(r.plano.clientes[0].cpfCnpj).toBe(CPF_A)
  })

  it('CPF digitado inválido continua pendente', () => {
    const r = rodar(dbVazio(), [['CLIENTE FICTICIO UM', null, '10/11/2026']], { [chaveLinha('A', 2)]: { cpfCnpj: '123.456.789-00' } })
    expect(r.linhas[0].resultado).toBe('pendente')
    expect(r.linhas[0].mensagens).toContain('O CPF/CNPJ digitado não é válido.')
  })

  it('sem CPF, mas com cliente já cadastrado com documento: não pede', () => {
    const db = dbVazio()
    db.clientes.push({ id: 'c1', nome: 'Cliente Ficticio Um', tipo: 'fisica', cpfCnpj: CPF_A, origem: 'carteira' })
    const r = rodar(db, [['CLIENTE FICTICIO UM', null, '10/11/2026']])
    expect(r.linhas[0].resultado).toBe('vinculado')
  })

  it('nome com XXX exige correção; o nome corrigido é o gravado', () => {
    const linhas = [['FULANO XXX TESTE', CPF_B, '10/11/2026']]
    expect(rodar(dbVazio(), linhas).linhas[0].pendencias).toEqual({ nome: true, cpf: false })
    expect(rodar(dbVazio(), linhas, { [chaveLinha('A', 2)]: { nome: 'Fulano xxX Teste' } }).linhas[0].resultado).toBe('pendente')
    const r = rodar(dbVazio(), linhas, { [chaveLinha('A', 2)]: { nome: 'Fulano De Tal Teste' } })
    expect(r.linhas[0].resultado).toBe('novo_cliente')
    expect(r.linhas[0].nomePlanilha).toBe('FULANO XXX TESTE')
    expect(r.plano.clientes[0].nome).toBe('Fulano De Tal Teste')
  })

  it('nome com xxx minúsculo e sem CPF pede os dois', () => {
    const r = rodar(dbVazio(), [['fulano xxx teste', null, '10/11/2026']])
    expect(r.linhas[0].pendencias).toEqual({ nome: true, cpf: true })
  })
})
