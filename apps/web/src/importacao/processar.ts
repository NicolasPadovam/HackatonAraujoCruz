// Transforma as linhas lidas da planilha em clientes, seguros e renovações,
// sem duplicar: CPF/CNPJ primeiro, depois nome (mesmo nome = mesmo cliente).
// Nada é gravado aqui: devolve a prévia (por linha) e o plano de gravação.
// Nenhuma linha com dados some: ou ela entra, ou fica pendente (pedindo o que falta),
// ou a pessoa a descarta explicitamente na prévia.

import type { Cliente, Db, Ramo, Renovacao, Seguro, StatusRenovacao } from '../domain/types'
import { normalizarNome, parseIso, toIso } from '../lib/format'
import { cnpjValido, cpfValido, emailValido, fmtTelefone, somenteDigitos } from '../lib/validacao'
import { OBRIGATORIO, type CampoDestino } from './campos'
import { acharCorretor, acharSeguradora, converterData, converterDocumento, converterRamo, texto } from './conversao'
import type { Celula } from './leitura'
import type { AbaReconhecida } from './modelo'

export type Resultado = 'novo_cliente' | 'vinculado' | 'atualiza' | 'pendente' | 'revisao' | 'descartada'

/** O que a pessoa digitou na prévia para uma linha (chave: chaveLinha). */
export interface Correcao {
  nome?: string
  cpfCnpj?: string
  numeroApolice?: string
  vencimento?: string // yyyy-mm-dd
  seguradoraId?: string
  ramo?: Ramo
  telefone?: string
  email?: string
  corretorId?: string
}

export const chaveLinha = (aba: string, linha: number) => `${aba}|${linha}`

/** Nome mascarado pela seguradora ("JOAO XXX SILVA"): precisa ser corrigido à mão. */
export const nomeMascarado = (nome: string) => /x{3}/i.test(nome)

export interface LinhaResultado {
  aba: string
  linha: number // número da linha no Excel (1-based)
  /** Nome como veio na planilha (antes da correção). */
  nomePlanilha?: string
  /** Informações que faltam (obrigatórias e opcionais), para a pessoa preencher na prévia. */
  faltando: CampoDestino[]
  segurado?: string
  cpfCnpj?: string
  numeroApolice?: string
  seguradora?: string
  ramo?: Ramo
  vencimento?: string
  telefone?: string
  email?: string
  corretor?: string
  status?: StatusRenovacao
  resultado: Resultado
  mensagens: string[]
  dadosBrutos: Record<string, Celula>
  renovacaoId?: string
}

/** Linha que impede a importação: falta informação obrigatória ou precisa de revisão. */
export const bloqueia = (l: LinhaResultado) => l.resultado === 'pendente' || l.resultado === 'revisao'

export interface Plano {
  clientes: Cliente[]
  seguros: Seguro[]
  renovacoes: Renovacao[]
}

export interface Entrada {
  db: Db
  abas: AbaReconhecida[]
  seguradoraFixaId: string | null
  correcoes?: Record<string, Correcao>
  /** Linhas que a pessoa decidiu não importar (chave: chaveLinha). */
  descartadas?: Set<string>
}

function documentoValido(d?: string): d is string {
  return !!d && (d.length === 11 ? cpfValido(d) : d.length === 14 && cnpjValido(d))
}

const TOLERANCIA_DIAS = 3

function diasEntre(a: string, b: string) {
  return Math.abs(parseIso(a).getTime() - parseIso(b).getTime()) / 86_400_000
}

function somarAnos(iso: string, anos: number) {
  const d = parseIso(iso)
  return toIso(new Date(d.getFullYear() + anos, d.getMonth(), d.getDate()))
}

/** Pode vir mais de um ("(11) 4000-1234 / (11) 90001-2345"): prefere o celular (11 dígitos). */
function converterTelefone(v?: string): string | undefined {
  const fones = (v ?? '').split(/[/;|]/).map(somenteDigitos).filter((d) => d.length === 10 || d.length === 11)
  const d = fones.find((x) => x.length === 11) ?? fones[0]
  return d ? fmtTelefone(d) : undefined
}

export function processar(e: Entrada): { linhas: LinhaResultado[]; plano: Plano } {
  const { db } = e
  const correcoes = e.correcoes ?? {}

  // Estado de trabalho: cópias, para que linhas seguintes enxerguem o que as anteriores criaram.
  const clientes = new Map(db.clientes.map((c) => [c.id, { ...c }]))
  const seguros = new Map(db.seguros.map((s) => [s.id, { ...s }]))
  const renovacoes = new Map(db.renovacoes.map((r) => [r.id, { ...r }]))
  const porCpf = new Map<string, Cliente>()
  const porNome = new Map<string, Cliente[]>()
  const segurosDoCliente = new Map<string, Seguro[]>()
  const renovacaoPorChave = new Map<string, Renovacao>()

  const indexarCliente = (c: Cliente) => {
    if (c.cpfCnpj) porCpf.set(c.cpfCnpj, c)
    const k = normalizarNome(c.nome)
    porNome.set(k, [...(porNome.get(k) ?? []).filter((x) => x.id !== c.id), c])
  }
  const indexarSeguro = (s: Seguro) => segurosDoCliente.set(s.clienteId, [...(segurosDoCliente.get(s.clienteId) ?? []), s])
  const chaveRen = (seguroId: string, venc: string) => `${seguroId}|${venc}`
  clientes.forEach(indexarCliente)
  seguros.forEach(indexarSeguro)
  renovacoes.forEach((r) => renovacaoPorChave.set(chaveRen(r.seguroId, r.vencimento), r))

  const tocadosCli = new Set<string>()
  const tocadosSeg = new Set<string>()
  const tocadosRen = new Set<string>()

  // 1) Junta as linhas de todas as abas e ordena por vencimento (histórico primeiro).
  //    Só a linha totalmente vazia fica de fora; qualquer outra aparece na prévia.
  interface Bruta { aba: string; linha: number; celulas: Celula[]; cab: string[]; m: AbaReconhecida['mapeamento']; venc: string | null; vencBruto: Celula }
  const brutas: Bruta[] = []
  for (const { aba, linhaCabecalho, mapeamento, formatoData } of e.abas) {
    const cab = (aba.linhas[linhaCabecalho] ?? []).map((v, i) => (v == null || String(v).trim() === '' ? `Coluna ${i + 1}` : String(v).trim()))
    const iVenc = mapeamento.vencimento ? cab.indexOf(mapeamento.vencimento) : -1
    aba.linhas.slice(linhaCabecalho + 1).forEach((celulas, i) => {
      if (!celulas.some((v) => v != null && String(v).trim() !== '')) return
      const linha = linhaCabecalho + 2 + i
      const vencBruto = iVenc >= 0 ? celulas[iVenc] ?? null : null
      const venc = converterData(vencBruto, formatoData) ?? correcoes[chaveLinha(aba.nome, linha)]?.vencimento ?? null
      brutas.push({ aba: aba.nome, linha, celulas, cab, m: mapeamento, venc, vencBruto })
    })
  }
  brutas.sort((a, b) => (a.venc ?? '9999').localeCompare(b.venc ?? '9999'))

  const celula = (b: Bruta, campo: CampoDestino): Celula => {
    const nome = b.m[campo]
    if (!nome) return null
    const i = b.cab.indexOf(nome)
    return i >= 0 ? b.celulas[i] ?? null : null
  }
  const nomeDaLinha = (b: Bruta) => texto(correcoes[chaveLinha(b.aba, b.linha)]?.nome ?? null) ?? texto(celula(b, 'segurado'))

  // CPF digitado numa linha vale para as outras linhas do mesmo nome (digita uma vez por cliente).
  const cpfDigitadoPorNome = new Map<string, string>()
  for (const b of brutas) {
    const c = correcoes[chaveLinha(b.aba, b.linha)]
    const doc = c?.cpfCnpj ? somenteDigitos(c.cpfCnpj) : undefined
    const nome = nomeDaLinha(b)
    if (nome && !nomeMascarado(nome) && documentoValido(doc)) cpfDigitadoPorNome.set(normalizarNome(nome), doc)
  }

  const linhas: LinhaResultado[] = []

  for (const b of brutas) {
    const chave = chaveLinha(b.aba, b.linha)
    const valor = (campo: CampoDestino) => celula(b, campo)
    const dadosBrutos = Object.fromEntries(b.cab.map((h, i) => [h, b.celulas[i] ?? null]))
    const res: LinhaResultado = { aba: b.aba, linha: b.linha, resultado: 'pendente', faltando: [], mensagens: [], dadosBrutos }
    linhas.push(res)
    const msg = (m: string) => res.mensagens.push(m)
    const falta = (c: CampoDestino) => res.faltando.push(c)
    const correcao = correcoes[chave] ?? {}

    // --- Conversão: cada campo vem da planilha ou do que a pessoa digitou na prévia ---------
    const nomePlanilha = texto(valor('segurado'))
    res.nomePlanilha = nomePlanilha
    const nomeDigitado = texto(correcao.nome ?? null)
    const segurado = nomeDigitado ?? nomePlanilha
    res.segurado = segurado
    const nomeOk = !!segurado && !nomeMascarado(segurado)
    if (!nomeOk) falta('segurado')
    if (segurado && nomeMascarado(segurado)) msg(nomeDigitado ? 'O nome corrigido ainda tem "XXX".' : 'Nome mascarado pela seguradora ("XXX"): escreva o nome correto.')
    else if (nomeDigitado && nomePlanilha && nomeDigitado !== nomePlanilha) msg('Nome corrigido na importação.')

    const venc = b.venc
    res.vencimento = venc ?? undefined
    if (!venc) {
      falta('vencimento')
      if (texto(b.vencBruto)) msg(`Vencimento inválido na planilha: "${texto(b.vencBruto)}".`)
    }

    const base = e.seguradoraFixaId
      ? db.seguradoras.find((s) => s.id === e.seguradoraFixaId)
      : acharSeguradora(valor('seguradora'), db.seguradoras) ?? db.seguradoras.find((s) => s.id === correcao.seguradoraId)
    if (!base) {
      falta('seguradora')
      if (texto(valor('seguradora'))) msg(`Seguradora não reconhecida: "${texto(valor('seguradora'))}".`)
    }
    // Relatório de uma seguradora com produto de outra do grupo (ex.: "Azul Automóvel" no da Porto).
    const produto = normalizarNome(String(valor('ramo') ?? ''))
    const seguradora =
      (e.seguradoraFixaId && base &&
        db.seguradoras.find((s) => s.id !== base.id && [s.nome, ...(s.apelidos ?? [])].some((n) => produto.startsWith(normalizarNome(n) + ' ')))) ||
      base
    res.seguradora = seguradora?.nome

    const ramo = converterRamo(valor('ramo')) ?? correcao.ramo
    res.ramo = ramo
    if (!ramo) {
      falta('ramo')
      if (texto(valor('ramo'))) msg(`Ramo não reconhecido: "${texto(valor('ramo'))}".`)
    }

    let cpf = converterDocumento(valor('cpfCnpj'))
    if (texto(valor('cpfCnpj')) && !documentoValido(cpf)) {
      msg(`CPF/CNPJ inválido na planilha: "${texto(valor('cpfCnpj'))}".`)
      cpf = undefined
    }
    if (!cpf && correcao.cpfCnpj) {
      const d = somenteDigitos(correcao.cpfCnpj)
      if (documentoValido(d)) { cpf = d; msg('CPF/CNPJ informado na importação.') }
      else msg('O CPF/CNPJ digitado não é válido.')
    }
    if (!cpf && nomeOk) cpf = cpfDigitadoPorNome.get(normalizarNome(segurado!))
    res.cpfCnpj = cpf

    const telPlanilha = converterTelefone(texto(valor('telefone')))
    if (texto(valor('telefone')) && !telPlanilha) msg(`Telefone inválido na planilha: "${texto(valor('telefone'))}".`)
    const telDigitado = correcao.telefone ? converterTelefone(correcao.telefone) : undefined
    if (correcao.telefone && !telDigitado) msg('O telefone digitado não é válido.')
    const telefone = telPlanilha ?? telDigitado

    const emailBruto = texto(valor('email'))
    if (emailBruto && !emailValido(emailBruto)) msg(`E-mail inválido na planilha: "${emailBruto}".`)
    const emailDigitado = texto(correcao.email ?? null)
    if (emailDigitado && !emailValido(emailDigitado)) msg('O e-mail digitado não é válido.')
    const email = (emailBruto && emailValido(emailBruto) ? emailBruto : undefined) ?? (emailDigitado && emailValido(emailDigitado) ? emailDigitado : undefined)

    const corretorCel = valor('corretor')
    const corretor = acharCorretor(corretorCel, db.corretores) ?? db.corretores.find((c) => c.id === correcao.corretorId)
    if (texto(corretorCel) && !acharCorretor(corretorCel, db.corretores)) msg(`Corretor "${texto(corretorCel)}" não reconhecido.`)

    const numeroApolicePlanilha = texto(valor('numeroApolice')) ?? texto(correcao.numeroApolice ?? null)

    // --- Cliente (só procura; nada muda até a linha estar completa) ---------------------
    let cliente: Cliente | undefined = cpf ? porCpf.get(cpf) : undefined
    if (!cliente && nomeOk) {
      const candidatos = porNome.get(normalizarNome(segurado!)) ?? []
      if (candidatos.length > 1) {
        res.resultado = 'revisao'
        msg(`Há ${candidatos.length} clientes com este nome: confira no cadastro e importe de novo, ou descarte a linha.`)
      } else if (candidatos.length === 1) {
        cliente = candidatos[0]
        if (cpf && cliente.cpfCnpj && cliente.cpfCnpj !== cpf) {
          res.resultado = 'revisao'
          msg('Mesmo nome de um cliente cadastrado, mas com CPF/CNPJ diferente.')
        }
      }
    }
    // Sem CPF/CNPJ, vale o de um cliente já cadastrado com o mesmo nome.
    if (!cpf && !cliente?.cpfCnpj) falta('cpfCnpj')

    // Seguro que vence nesta data: mesmo ramo e seguradora; ou um gravado como "outro" numa importação
    // anterior (ramo não reconhecido, e talvez na seguradora do relatório em vez da do grupo): corrige.
    const venceJunto = (s: Seguro) => !!venc && diasEntre(s.fimVigencia, venc) <= TOLERANCIA_DIAS
    const doCliente = cliente ? segurosDoCliente.get(cliente.id) ?? [] : []
    let seguro =
      seguradora && ramo
        ? doCliente.find((s) => s.ramo === ramo && s.seguradoraId === seguradora.id && venceJunto(s)) ??
          doCliente.find((s) => s.ramo === 'outro' && (s.seguradoraId === seguradora.id || s.seguradoraId === base?.id) && venceJunto(s))
        : undefined
    const renExistente = seguro ? renovacaoPorChave.get(chaveRen(seguro.id, seguro.fimVigencia)) : undefined

    const numeroApolice = numeroApolicePlanilha ?? seguro?.numeroApolice
    if (!numeroApolice) falta('numeroApolice')
    if (!telefone && !cliente?.telefone) falta('telefone')
    if (!email && !cliente?.email) falta('email')
    if (!corretor && !renExistente?.corretorId) falta('corretor')
    res.numeroApolice = numeroApolice
    res.telefone = telefone ?? cliente?.telefone
    res.email = email ?? cliente?.email
    res.corretor = (corretor ?? db.corretores.find((c) => c.id === renExistente?.corretorId))?.nome
    res.status = renExistente?.status ?? 'pendente'

    if (e.descartadas?.has(chave)) {
      res.resultado = 'descartada'
      res.mensagens = ['Descartada na prévia por quem importou: não foi gravada.']
      continue
    }
    if (res.resultado === 'revisao') continue
    if (res.faltando.some((c) => OBRIGATORIO.has(c))) continue // pendente

    // A partir daqui todos os obrigatórios existem.
    const doc = (cpf ?? cliente?.cpfCnpj)!
    const nome = segurado!
    const vencimento = venc!

    // --- Cliente ---------------------------------------------------------------------
    let clienteNovo = false
    if (!cliente) {
      cliente = {
        id: crypto.randomUUID(),
        nome,
        tipo: doc.length === 14 || /\b(ltda|me|eireli|s\/?a|epp)\b/i.test(nome) ? 'juridica' : 'fisica',
        cpfCnpj: doc,
        telefone,
        email,
        origem: 'carteira',
      }
      clientes.set(cliente.id, cliente)
      indexarCliente(cliente)
      tocadosCli.add(cliente.id)
      clienteNovo = true
    } else {
      // Completa o cadastro com o que a planilha trouxer (nunca apaga nem sobrescreve).
      if (!cliente.cpfCnpj) { cliente.cpfCnpj = doc; indexarCliente(cliente); tocadosCli.add(cliente.id); msg('CPF/CNPJ adicionado ao cadastro.') }
      if (telefone && !cliente.telefone) { cliente.telefone = telefone; tocadosCli.add(cliente.id) }
      if (email && !cliente.email) { cliente.email = email; tocadosCli.add(cliente.id) }
    }

    // --- Seguro --------------------------------------------------------------------------
    if (seguro && seguro.ramo !== ramo) {
      msg(`Ramo corrigido: Outro → ${ramo === 'auto' ? 'Auto' : ramo === 'residencial' ? 'Residencial' : ramo === 'vida' ? 'Vida' : 'Outro'}.`)
      seguro.ramo = ramo!
    }
    if (seguro && seguro.seguradoraId !== seguradora!.id) {
      msg(`Seguradora corrigida: ${base!.nome} → ${seguradora!.nome}.`)
      seguro.seguradoraId = seguradora!.id
    }
    if (!seguro) {
      seguro = {
        id: crypto.randomUUID(),
        clienteId: cliente.id,
        seguradoraId: seguradora!.id,
        ramo: ramo!,
        numeroApolice,
        inicioVigencia: somarAnos(vencimento, -1),
        fimVigencia: vencimento,
        situacao: 'ativo',
      }
      seguros.set(seguro.id, seguro)
      indexarSeguro(seguro)
    } else if (!seguro.numeroApolice) {
      seguro.numeroApolice = numeroApolice
    }
    tocadosSeg.add(seguro.id)

    // --- Renovação (a importação não muda o andamento que a equipe já marcou) ------------
    let ren = renovacaoPorChave.get(chaveRen(seguro.id, seguro.fimVigencia))
    const jaExistia = !!ren
    if (!ren) {
      ren = { id: crypto.randomUUID(), seguroId: seguro.id, vencimento: seguro.fimVigencia, corretorId: corretor?.id, status: 'pendente', cotada: false }
      renovacoes.set(ren.id, ren)
      renovacaoPorChave.set(chaveRen(seguro.id, ren.vencimento), ren)
    } else if (corretor) {
      ren.corretorId = corretor.id
    }
    tocadosRen.add(ren.id)
    res.renovacaoId = ren.id
    res.status = ren.status

    res.resultado = clienteNovo ? 'novo_cliente' : jaExistia ? 'atualiza' : 'vinculado'
  }

  return {
    linhas,
    plano: {
      clientes: [...tocadosCli].map((id) => clientes.get(id)!),
      seguros: [...tocadosSeg].map((id) => seguros.get(id)!),
      renovacoes: [...tocadosRen].map((id) => renovacoes.get(id)!),
    },
  }
}
