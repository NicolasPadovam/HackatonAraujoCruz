// Simulação do importador da planilha de renovações (uma aba por mês).
// O parser real vai ler o .xlsx. Aqui geramos linhas no MESMO formato da planilha
// (data M/D/AAAA, ✅/❌, "R$ -") para mostrar a conversão e a deduplicação.

import type { Cliente, Db, Ramo, Renovacao, Seguro, StatusRenovacao } from '../domain/types'
import { addMeses, hojeIso, mesKey, mesLabel, normalizarNome, toIso } from '../lib/format'

export interface LinhaBruta {
  linha: number
  seguradora: string
  segurado: string
  ramo: string
  vigencia: string
  corretor: string
  renovada: string
  cotada: string
  comissao: string
  valorRecebido: string
}

export type Resultado = 'vinculado' | 'novo_cliente' | 'atualiza' | 'erro'

export interface LinhaPrevia {
  bruta: LinhaBruta
  resultado: Resultado
  mensagem: string
  clienteId?: string
  convertida?: {
    seguradoraId: string
    ramo: Ramo
    vencimento: string
    corretorId: string
    status: StatusRenovacao
    comissaoPct?: number
  }
}

export function abasDisponiveis(): string[] {
  const atual = mesKey(hojeIso())
  return [-1, 0, 1, 2, 3].map((n) => addMeses(atual, n))
}

export function nomeAba(mes: string) {
  return mesLabel(mes, true)
}

const NOVOS_NOMES = ['Rodrigo Esteves', 'Lívia Macedo', 'Mercadinho Bom Preço LTDA', 'Augusto Pimentel', 'Helena Duarte']

function paraPlanilha(iso: string) {
  const [a, m, d] = iso.split('-').map(Number)
  return `${m}/${d}/${a}` // a planilha real usa o formato americano
}

function converterData(texto: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(texto.trim())
  if (!m) return null
  const [mes, dia, ano] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const d = new Date(ano, mes - 1, dia)
  if (d.getMonth() !== mes - 1 || d.getDate() !== dia) return null
  return toIso(d)
}

function converterStatus(renovada: string, cotada: string): StatusRenovacao {
  if (renovada === '✅') return 'renovada'
  if (renovada === '❌') return 'nao_renovada'
  return cotada === 'TRUE' ? 'cotando' : 'pendente'
}

function converterRamo(texto: string): Ramo {
  const t = normalizarNome(texto)
  if (t.startsWith('resid')) return 'residencial'
  if (t === 'auto') return 'auto'
  if (t === 'vida') return 'vida'
  return 'outro'
}

export function gerarPrevia(db: Db, mes: string): LinhaPrevia[] {
  const porNome = new Map<string, Cliente[]>()
  for (const c of db.clientes) {
    const k = normalizarNome(c.nome)
    porNome.set(k, [...(porNome.get(k) ?? []), c])
  }
  const seguradoraPorNome = new Map(db.seguradoras.map((s) => [normalizarNome(s.nome), s]))
  const corretorPorSigla = new Map(db.corretores.map((c) => [c.sigla, c]))
  const seguros = new Map(db.seguros.map((s) => [s.id, s]))

  const existentes = db.renovacoes.filter((r) => mesKey(r.vencimento) === mes)

  let brutas: LinhaBruta[]
  if (existentes.length > 0) {
    // Mês já importado: reimportar atualiza, não duplica.
    brutas = existentes.map((r, i) => {
      const s = seguros.get(r.seguroId)!
      return {
        linha: i + 2,
        seguradora: db.seguradoras.find((x) => x.id === s.seguradoraId)!.nome,
        segurado: db.clientes.find((c) => c.id === s.clienteId)!.nome,
        ramo: s.ramo === 'residencial' ? 'Residencial' : s.ramo === 'auto' ? 'Auto' : 'Vida',
        vigencia: paraPlanilha(r.vencimento),
        corretor: db.corretores.find((c) => c.id === r.corretorId)!.sigla,
        renovada: r.status === 'renovada' ? '✅' : r.status === 'nao_renovada' ? '❌' : '',
        cotada: r.cotada ? 'TRUE' : 'FALSE',
        comissao: s.comissaoPct ? `${s.comissaoPct}%` : '',
        valorRecebido: 'R$ -',
      }
    })
  } else {
    const [a, m] = mes.split('-').map(Number)
    const conhecidos = db.clientes.slice(0, 3).map((c) => c.nome)
    const nomes = [...conhecidos, ...NOVOS_NOMES]
    const segs = ['Porto Seguro', 'Tokio Marine', 'Mapfre', 'Allianz', 'Zurich']
    brutas = nomes.map((nome, i) => ({
      linha: i + 2,
      seguradora: segs[i % segs.length],
      segurado: nome,
      ramo: i % 3 === 1 ? 'Auto' : 'Residencial',
      vigencia: paraPlanilha(toIso(new Date(a, m - 1, 2 + i * 3))),
      corretor: i % 3 === 2 ? 'C' : 'R',
      renovada: '',
      cotada: i < 2 ? 'TRUE' : 'FALSE',
      comissao: i % 2 === 0 ? '15%' : '',
      valorRecebido: 'R$ -',
    }))
    // Uma linha com erro proposital, para mostrar o relatório.
    brutas.push({
      linha: brutas.length + 2,
      seguradora: 'Porto',
      segurado: 'Cristiano Lobato',
      ramo: 'Residencial',
      vigencia: `2/30/${a}`,
      corretor: 'R',
      renovada: '',
      cotada: 'FALSE',
      comissao: '',
      valorRecebido: 'R$ -',
    })
  }

  return brutas.map((b): LinhaPrevia => {
    const vencimento = converterData(b.vigencia)
    if (!vencimento) return { bruta: b, resultado: 'erro', mensagem: `Vigência inválida: "${b.vigencia}"` }

    const seguradora =
      seguradoraPorNome.get(normalizarNome(b.seguradora)) ??
      db.seguradoras.find((s) => normalizarNome(s.nome).startsWith(normalizarNome(b.seguradora)))
    if (!seguradora) return { bruta: b, resultado: 'erro', mensagem: `Seguradora desconhecida: "${b.seguradora}"` }

    const corretor = corretorPorSigla.get(b.corretor.trim())
    if (!corretor) return { bruta: b, resultado: 'erro', mensagem: `Corretor desconhecido: "${b.corretor}"` }

    const convertida = {
      seguradoraId: seguradora.id,
      ramo: converterRamo(b.ramo),
      vencimento,
      corretorId: corretor.id,
      status: converterStatus(b.renovada, b.cotada),
      comissaoPct: b.comissao ? Number(b.comissao.replace('%', '').replace(',', '.')) : undefined,
    }

    const candidatos = porNome.get(normalizarNome(b.segurado)) ?? []
    if (existentes.length > 0) {
      return { bruta: b, resultado: 'atualiza', mensagem: 'Já existe: atualiza o registro', clienteId: candidatos[0]?.id, convertida }
    }
    if (candidatos.length === 1) {
      return { bruta: b, resultado: 'vinculado', mensagem: 'Cliente já cadastrado (mesmo nome)', clienteId: candidatos[0].id, convertida }
    }
    return { bruta: b, resultado: 'novo_cliente', mensagem: 'Cliente novo', convertida }
  })
}

export function aplicarPrevia(previa: LinhaPrevia[], prefixo: string) {
  const clientes: Cliente[] = []
  const seguros: Seguro[] = []
  const renovacoes: Renovacao[] = []
  const criados = new Map<string, string>()

  previa.forEach((p, i) => {
    if (!p.convertida || p.resultado === 'erro' || p.resultado === 'atualiza') return
    const k = normalizarNome(p.bruta.segurado)
    let clienteId = p.clienteId ?? criados.get(k)
    if (!clienteId) {
      clienteId = `${prefixo}-cli-${i}`
      criados.set(k, clienteId)
      clientes.push({ id: clienteId, nome: p.bruta.segurado, origem: 'carteira' })
    }
    const v = p.convertida
    const [a, m, d] = v.vencimento.split('-').map(Number)
    const seguroId = `${prefixo}-seg-${i}`
    seguros.push({
      id: seguroId,
      clienteId,
      seguradoraId: v.seguradoraId,
      ramo: v.ramo,
      inicioVigencia: toIso(new Date(a - 1, m - 1, d)),
      fimVigencia: v.vencimento,
      comissaoPct: v.comissaoPct,
      situacao: 'ativo',
    })
    renovacoes.push({
      id: `${prefixo}-ren-${i}`,
      seguroId,
      vencimento: v.vencimento,
      corretorId: v.corretorId,
      status: v.status,
      cotada: v.status !== 'pendente',
    })
  })
  return { clientes, seguros, renovacoes }
}
