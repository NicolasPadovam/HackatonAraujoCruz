// Dados 100% FICTÍCIOS para o protótipo. Nunca coloque dados reais de clientes aqui.
// As datas são geradas em relação ao mês atual, para a demo sempre parecer "viva".

import type {
  Cliente, Corretor, Cotacao, Db, Importacao, Ramo, Renovacao, Seguradora, Seguro, StatusRenovacao,
} from '../domain/types'
import { addMeses, hojeIso, mesKey, mesLabel, toIso } from '../lib/format'

function prng(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SEGURADORAS: Seguradora[] = [
  { id: 'porto', nome: 'Porto Seguro' },
  { id: 'tokio', nome: 'Tokio Marine' },
  { id: 'mapfre', nome: 'Mapfre' },
  { id: 'allianz', nome: 'Allianz' },
  { id: 'zurich', nome: 'Zurich' },
  { id: 'azul', nome: 'Azul' },
  { id: 'suhai', nome: 'Suhai' },
]

// Seguradoras usadas por ramo (Azul e Suhai só aparecem em auto na planilha).
const POR_RAMO: Record<Ramo, string[]> = {
  residencial: ['porto', 'tokio', 'mapfre', 'allianz', 'zurich'],
  auto: ['porto', 'tokio', 'mapfre', 'allianz', 'zurich', 'azul', 'suhai'],
  vida: ['porto', 'mapfre', 'zurich'],
  outro: ['porto', 'tokio'],
}

const CORRETORES: Corretor[] = [
  { id: 'renata', nome: 'Renata', sigla: 'R' },
  { id: 'carlos', nome: 'Carlos', sigla: 'C' },
]

// Nomes inventados. [nome, ramos dos seguros que a pessoa tem]
const CLIENTES_BASE: [string, Ramo[]][] = [
  ['Ana Beatriz Moura', ['residencial', 'auto']],
  ['Bruno Teixeira', ['auto']],
  ['Padaria Trigo Dourado LTDA', ['residencial', 'auto']],
  ['Camila Fontes', ['residencial']],
  ['Diego Albuquerque', ['auto']],
  ['Eduarda Lins', ['residencial']],
  ['Fernando Quintela', ['auto', 'vida']],
  ['Gabriela Siqueira', ['residencial']],
  ['Henrique Paixão', ['auto']],
  ['Isabela Montenegro', ['residencial', 'auto']],
  ['João Pedro Arantes', ['auto']],
  ['Karina Valadares', ['residencial']],
  ['Leonardo Brandão', ['auto']],
  ['Mariana Tavares', ['residencial', 'vida']],
  ['Oficina Roda Viva ME', ['auto']],
  ['Paula Cristina Rocha', ['residencial']],
  ['Rafael Nogueira', ['auto', 'residencial']],
  ['Sabrina Coutinho', ['auto']],
  ['Thiago Bittencourt', ['residencial']],
  ['Vanessa Prado', ['auto']],
  ['Wagner Figueiredo', ['residencial', 'auto']],
  ['Yasmin Carvalhal', ['residencial']],
  ['Clínica Sorriso Leve LTDA', ['residencial']],
  ['Otávio Rezende', ['auto']],
  ['Letícia Amaral', ['residencial']],
  ['Marcos Vinícius Leal', ['auto']],
  ['Natália Brum', ['residencial', 'auto']],
  ['Pedro Henrique Sales', ['vida']],
  ['Renan Ventura', ['auto']],
  ['Simone Aguiar', ['residencial']],
  ['Tatiane Mesquita', ['auto']],
  ['Ulisses Barreto', ['residencial']],
]

const PREMIO_BASE: Record<Ramo, [number, number]> = {
  residencial: [380, 1400],
  auto: [1800, 5200],
  vida: [600, 2400],
  outro: [500, 2000],
}

export function gerarDbExemplo(): Db {
  const r = prng(20261017)
  const pick = <T,>(arr: T[]) => arr[Math.floor(r() * arr.length)]
  const chance = (p: number) => r() < p

  const hoje = hojeIso()
  const mesAtual = mesKey(hoje)
  const diaHoje = Number(hoje.slice(8, 10))
  const janelas = [-1, 0, 1, 2] // mês passado, atual e os dois próximos

  const clientes: Cliente[] = []
  const seguros: Seguro[] = []
  const renovacoes: Renovacao[] = []
  const cotacoes: Cotacao[] = []

  let nSeg = 0
  let nRen = 0
  let nCot = 0

  CLIENTES_BASE.forEach(([nome, ramos], i) => {
    const clienteId = `cli-${i + 1}`
    clientes.push({
      id: clienteId,
      nome,
      // A planilha de renovações não traz CPF/CNPJ nem contato: a maioria fica vazia,
      // como vai ser até a base de clientes ser carregada.
      telefone: chance(0.35) ? `(11) 90000-${String(1000 + i).padStart(4, '0')}` : undefined,
      email: chance(0.2) ? `cliente${i + 1}@exemplo.com` : undefined,
      origem: chance(0.8) ? 'carteira' : 'indicacao',
    })

    ramos.forEach((ramo) => {
      const offset = pick(janelas)
      const mes = addMeses(mesAtual, offset)
      const [a, m] = mes.split('-').map(Number)
      const ultimoDia = new Date(a, m, 0).getDate()
      const dia = 1 + Math.floor(r() * ultimoDia)
      const fim = toIso(new Date(a, m - 1, dia))
      const inicio = toIso(new Date(a - 1, m - 1, dia))
      const seguradoraId = pick(POR_RAMO[ramo])
      const [pMin, pMax] = PREMIO_BASE[ramo]
      // Financeiro inconsistente, como na planilha real: só parte vem preenchida.
      const temFinanceiro = chance(0.5)
      const premio = Math.round(pMin + r() * (pMax - pMin))
      const parcelas = pick([1, 4, 6, 10, 12])

      const seguroId = `seg-${++nSeg}`
      const seguro: Seguro = {
        id: seguroId,
        clienteId,
        seguradoraId,
        ramo,
        inicioVigencia: inicio,
        fimVigencia: fim,
        premioLiquido: temFinanceiro ? premio : undefined,
        comissaoPct: temFinanceiro ? pick([10, 12, 15, 20, 25]) : undefined,
        parcelas: temFinanceiro ? parcelas : undefined,
        valorParcela: temFinanceiro ? Math.round((premio / parcelas) * 100) / 100 : undefined,
        situacao: 'ativo',
      }
      seguros.push(seguro)

      // Histórico: renovação do ano anterior, às vezes vinda de outra seguradora.
      if (chance(0.55)) {
        const antigoId = `seg-${++nSeg}`
        const seguradoraAntiga = chance(0.3) ? pick(POR_RAMO[ramo]) : seguradoraId
        seguros.push({
          id: antigoId,
          clienteId,
          seguradoraId: seguradoraAntiga,
          ramo,
          inicioVigencia: toIso(new Date(a - 2, m - 1, dia)),
          fimVigencia: inicio,
          situacao: 'renovado',
        })
        renovacoes.push({
          id: `ren-${++nRen}`,
          seguroId: antigoId,
          vencimento: inicio,
          corretorId: pick(CORRETORES).id,
          status: 'renovada',
          cotada: true,
          seguradoraFechadaId: seguradoraId,
          seguroNovoId: seguroId,
        })
      }

      // Renovação da janela atual.
      let status: StatusRenovacao
      if (offset < 0) status = chance(0.8) ? 'renovada' : 'nao_renovada'
      else if (offset === 0 && dia < diaHoje)
        status = chance(0.7) ? 'renovada' : chance(0.5) ? 'nao_renovada' : 'cotando'
      else if (offset === 0) status = chance(0.5) ? 'pendente' : chance(0.75) ? 'cotando' : 'renovada'
      else if (offset === 1) status = chance(0.8) ? 'pendente' : 'cotando'
      else status = 'pendente'

      const renId = `ren-${++nRen}`
      const fechada =
        status === 'renovada' ? (chance(0.75) ? seguradoraId : pick(POR_RAMO[ramo])) : undefined
      // Renovação fechada gera a apólice nova; a atual passa a "renovado".
      let seguroNovoId: string | undefined
      if (status === 'renovada' || status === 'nao_renovada') {
        seguro.situacao = status === 'renovada' ? 'renovado' : 'nao_renovado'
      }
      if (status === 'renovada' && fechada) {
        seguroNovoId = `seg-${++nSeg}`
        seguros.push({
          ...seguro,
          id: seguroNovoId,
          seguradoraId: fechada,
          inicioVigencia: fim,
          fimVigencia: toIso(new Date(a + 1, m - 1, dia)),
          situacao: 'ativo',
        })
      }
      renovacoes.push({
        id: renId,
        seguroId,
        vencimento: fim,
        corretorId: chance(0.7) ? 'renata' : 'carlos',
        status,
        cotada: status !== 'pendente',
        seguradoraFechadaId: fechada,
        seguroNovoId,
        valorRecebido: status === 'renovada' && temFinanceiro ? Math.round(premio * 0.15) : undefined,
      })

      // Cotações manuais (até três orçamentos) para quem está em cotação.
      if (status === 'cotando' || (status === 'renovada' && chance(0.5))) {
        const opcoes = [...POR_RAMO[ramo]].sort(() => r() - 0.5).slice(0, 3)
        opcoes.forEach((sid) => {
          cotacoes.push({
            id: `cot-${++nCot}`,
            clienteId,
            renovacaoId: renId,
            ramo,
            seguradoraId: sid,
            premio: Math.round(premio * (0.85 + r() * 0.3)),
            origem: 'manual',
            status: status === 'renovada' ? (sid === fechada ? 'aceita' : 'recusada') : 'enviada',
            data: toIso(new Date(a, m - 1, Math.max(1, dia - 10))),
          })
        })
      }
    })
  })

  const importacoes: Importacao[] = [-1, 0].map((off, i) => {
    const mes = addMeses(mesAtual, off)
    const qtd = renovacoes.filter((x) => mesKey(x.vencimento) === mes).length
    return {
      id: `imp-${i + 1}`,
      arquivoNome: `Renovações ${mes.slice(0, 4)}.xlsx`,
      aba: mesLabel(mes, true),
      mesReferencia: mes,
      importadoPor: i === 0 ? 'Carlos' : 'Renata',
      importadoEm: `${addMeses(mes, 0)}-01T09:${10 + i * 7}:00`,
      linhasOk: qtd,
      linhasErro: i === 1 ? 1 : 0,
      linhasRevisao: 0,
    }
  })

  return {
    clientes,
    seguradoras: SEGURADORAS,
    corretores: CORRETORES,
    seguros,
    renovacoes,
    cotacoes,
    importacoes,
  }
}
