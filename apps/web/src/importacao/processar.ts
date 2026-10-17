// Transforma as linhas lidas da planilha em clientes, seguros e renovações,
// sem duplicar: CPF/CNPJ primeiro, depois nome (mesmo nome = mesmo cliente).
// Nada é gravado aqui: devolve a prévia (por linha) e o plano de gravação.

import type { Cliente, Db, Ramo, Renovacao, Seguro, StatusRenovacao } from '../domain/types'
import { normalizarNome, parseIso, toIso } from '../lib/format'
import { cnpjValido, cpfValido, emailValido, fmtTelefone, somenteDigitos } from '../lib/validacao'
import type { CampoDestino, Mapeamento } from './campos'
import {
  acharCorretor, acharSeguradora, converterData, converterDocumento, converterInteiro, converterNumero,
  converterPercentual, converterRamo, converterStatus, texto, type FormatoData,
} from './conversao'
import type { Aba, Celula } from './leitura'

export type Resultado = 'novo_cliente' | 'vinculado' | 'atualiza' | 'pendente' | 'revisao' | 'erro'

/** O que a pessoa digitou na prévia para uma linha (chave: chaveLinha). */
export interface Correcao {
  nome?: string
  cpfCnpj?: string
  telefone?: string
  email?: string
}

export const chaveLinha = (aba: string, linha: number) => `${aba}|${linha}`

/**
 * Nome mascarado pela seguradora ("JOAO XXX SILVA", "Maria Souza XXra"): precisa ser corrigido à mão.
 * A Porto mascara o último sobrenome com 2 ou mais X.
 */
export const nomeMascarado = (nome: string) => /x{2,}/i.test(nome)
/** Telefone com X no lugar de dígitos ("(11) 9XX12-XX34"). */
export const telefoneMascarado = (t: string) => /\dx|x\d/i.test(t.replace(/[\s()-]/g, ''))
/** E-mail com a parte local escondida por x ("axxxxa@exemplo.com"). */
export const emailMascarado = (e: string) => /x{3,}/i.test(e.split('@')[0] ?? '')

export interface LinhaResultado {
  aba: string
  linha: number // número da linha no Excel (1-based)
  /** Nome como veio na planilha (antes da correção). */
  nomePlanilha?: string
  /** O que falta a pessoa informar para a linha poder ser gravada. */
  pendencias?: { nome: boolean; cpf: boolean }
  /** Contato que veio mascarado na planilha (texto original). Opcional: não impede a gravação. */
  mascarados?: { telefone?: string; email?: string }
  segurado?: string
  cpfCnpj?: string
  seguradora?: string
  ramo?: Ramo
  vencimento?: string
  status?: StatusRenovacao
  resultado: Resultado
  mensagens: string[]
  dadosBrutos: Record<string, Celula>
  renovacaoId?: string
}

export interface Plano {
  clientes: Cliente[]
  seguros: Seguro[]
  renovacoes: Renovacao[]
}

export interface Entrada {
  db: Db
  abas: { aba: Aba; linhaCabecalho: number }[]
  mapeamento: Mapeamento
  seguradoraFixaId: string | null
  formatoData: FormatoData
  ramoPadrao: Ramo
  corretorPadraoId: string
  correcoes?: Record<string, Correcao>
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

export function processar(e: Entrada): { linhas: LinhaResultado[]; plano: Plano } {
  const { db } = e

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
  interface Bruta { aba: string; linha: number; celulas: Celula[]; cab: string[]; venc: string | null }
  const brutas: Bruta[] = []
  for (const { aba, linhaCabecalho } of e.abas) {
    const cab = (aba.linhas[linhaCabecalho] ?? []).map((v, i) => (v == null || String(v).trim() === '' ? `Coluna ${i + 1}` : String(v).trim()))
    const col = (campo: CampoDestino) => (e.mapeamento[campo] ? cab.indexOf(e.mapeamento[campo]!) : -1)
    const iSeg = col('segurado')
    const iVenc = col('vencimento')
    aba.linhas.slice(linhaCabecalho + 1).forEach((celulas, i) => {
      const temAlgo = celulas.some((v) => v != null && String(v).trim() !== '')
      const segurado = iSeg >= 0 ? texto(celulas[iSeg] ?? null) : undefined
      const vencBruto = iVenc >= 0 ? celulas[iVenc] ?? null : null
      if (!temAlgo || (!segurado && (vencBruto == null || String(vencBruto).trim() === ''))) return // linha vazia ou de total
      brutas.push({ aba: aba.nome, linha: linhaCabecalho + 2 + i, celulas, cab, venc: converterData(vencBruto, e.formatoData) })
    })
  }
  brutas.sort((a, b) => (a.venc ?? '9999').localeCompare(b.venc ?? '9999'))

  // CPF/telefone/e-mail digitados numa linha valem para as outras do mesmo nome (digita uma vez por cliente).
  const correcoes = e.correcoes ?? {}
  const digitadoPorNome = new Map<string, Correcao>()
  for (const b of brutas) {
    const c = correcoes[chaveLinha(b.aba, b.linha)]
    if (!c) continue
    const iSeg = e.mapeamento.segurado ? b.cab.indexOf(e.mapeamento.segurado) : -1
    const nome = c.nome?.trim() || (iSeg >= 0 ? texto(b.celulas[iSeg] ?? null) : undefined)
    if (!nome || nomeMascarado(nome)) continue
    const k = normalizarNome(nome)
    const atual = { ...digitadoPorNome.get(k) }
    const doc = somenteDigitos(c.cpfCnpj ?? '')
    const tel = somenteDigitos(c.telefone ?? '')
    if (documentoValido(doc)) atual.cpfCnpj = doc
    if (tel.length === 10 || tel.length === 11) atual.telefone = tel
    if (c.email && emailValido(c.email) && !emailMascarado(c.email)) atual.email = c.email.trim()
    digitadoPorNome.set(k, atual)
  }

  const linhas: LinhaResultado[] = []

  for (const b of brutas) {
    const valor = (campo: CampoDestino): Celula => {
      const nome = e.mapeamento[campo]
      if (!nome) return null
      const i = b.cab.indexOf(nome)
      return i >= 0 ? b.celulas[i] ?? null : null
    }
    const dadosBrutos = Object.fromEntries(b.cab.map((h, i) => [h, b.celulas[i] ?? null]))
    const res: LinhaResultado = { aba: b.aba, linha: b.linha, resultado: 'erro', mensagens: [], dadosBrutos }
    linhas.push(res)
    const msg = (m: string) => res.mensagens.push(m)

    // --- Conversão ---------------------------------------------------------
    const correcao = correcoes[chaveLinha(b.aba, b.linha)]
    const nomePlanilha = texto(valor('segurado'))
    res.nomePlanilha = nomePlanilha
    res.segurado = nomePlanilha
    if (!nomePlanilha) { msg('Sem nome do segurado.'); continue }
    // Nome com "XXX" (mascarado pela seguradora): só entra com o nome corrigido pela pessoa.
    const nomeDigitado = texto(correcao?.nome ?? null)
    const precisaNome = nomeMascarado(nomePlanilha) && (!nomeDigitado || nomeMascarado(nomeDigitado))
    const segurado = nomeMascarado(nomePlanilha) && !precisaNome ? nomeDigitado! : nomePlanilha
    res.segurado = segurado
    if (segurado !== nomePlanilha) msg('Nome corrigido na importação.')
    else if (nomeDigitado && precisaNome) msg('O nome corrigido ainda tem "XXX".')

    const venc = b.venc
    if (!venc) { msg(`Vencimento inválido: "${valor('vencimento') ?? ''}".`); continue }
    res.vencimento = venc

    const base = e.seguradoraFixaId
      ? db.seguradoras.find((s) => s.id === e.seguradoraFixaId)
      : acharSeguradora(valor('seguradora'), db.seguradoras)
    if (!base) { msg(`Seguradora não reconhecida: "${valor('seguradora') ?? ''}".`); continue }
    // Relatório de uma seguradora com produto de outra do grupo (ex.: "Azul Automóvel" no da Porto).
    const produto = normalizarNome(String(valor('ramo') ?? ''))
    const seguradora =
      (e.seguradoraFixaId &&
        db.seguradoras.find((s) => s.id !== base.id && [s.nome, ...(s.apelidos ?? [])].some((n) => produto.startsWith(normalizarNome(n) + ' ')))) ||
      base
    res.seguradora = seguradora.nome

    const ramo = converterRamo(valor('ramo')) ?? e.ramoPadrao
    res.ramo = ramo

    const corretorCel = valor('corretor')
    const corretor = acharCorretor(corretorCel, db.corretores)
    if (texto(corretorCel) && !corretor) msg(`Corretor "${texto(corretorCel)}" não reconhecido: usei o padrão.`)
    const corretorId = corretor?.id ?? e.corretorPadraoId

    const temStatus = !!(e.mapeamento.renovada || e.mapeamento.cotada)
    const status: StatusRenovacao = temStatus ? converterStatus(valor('renovada'), valor('cotada')) : 'pendente'
    res.status = status

    let cpf = converterDocumento(valor('cpfCnpj'))
    if (texto(valor('cpfCnpj')) && !documentoValido(cpf)) {
      msg(`CPF/CNPJ inválido na planilha: "${texto(valor('cpfCnpj'))}".`)
      cpf = undefined
    }
    if (!cpf && correcao?.cpfCnpj) {
      const d = somenteDigitos(correcao.cpfCnpj)
      if (documentoValido(d)) { cpf = d; msg('CPF/CNPJ informado na importação.') }
      else msg('O CPF/CNPJ digitado não é válido.')
    }
    const digitadoNome = precisaNome ? undefined : digitadoPorNome.get(normalizarNome(segurado))
    if (!cpf && digitadoNome?.cpfCnpj) cpf = digitadoNome.cpfCnpj
    res.cpfCnpj = cpf

    // Contato mascarado pela seguradora não é gravado; a pessoa pode digitar o certo (opcional).
    const telTexto = texto(valor('telefone'))
    const emailBruto = texto(valor('email'))
    const telMasc = !!telTexto && telefoneMascarado(telTexto)
    const emailMasc = !!emailBruto && emailMascarado(emailBruto)
    if (telMasc || emailMasc) res.mascarados = { telefone: telMasc ? telTexto : undefined, email: emailMasc ? emailBruto : undefined }

    // Pode vir mais de um ("(11) 4000-1234 / (11) 90001-2345"): prefere o celular (11 dígitos).
    const fones = telMasc ? [] : (telTexto ?? '').split(/[/;|]/).map(somenteDigitos).filter((d) => d.length === 10 || d.length === 11)
    const telBruto = fones.find((d) => d.length === 11) ?? fones[0]
    let telefone = telBruto ? fmtTelefone(telBruto) : undefined
    let email = emailBruto && !emailMasc && emailValido(emailBruto) ? emailBruto : undefined
    const telDigitado = somenteDigitos(correcao?.telefone ?? '')
    if (telDigitado.length === 10 || telDigitado.length === 11) { telefone = fmtTelefone(telDigitado); msg('Telefone informado na importação.') }
    else if (telDigitado) msg('O telefone digitado precisa ter DDD + número.')
    else if (digitadoNome?.telefone) telefone = fmtTelefone(digitadoNome.telefone)
    const emailDigitado = texto(correcao?.email ?? null)
    if (emailDigitado && emailValido(emailDigitado) && !emailMascarado(emailDigitado)) { email = emailDigitado; msg('E-mail informado na importação.') }
    else if (emailDigitado) msg('O e-mail digitado não é válido.')
    else if (digitadoNome?.email) email = digitadoNome.email

    // Sem CPF/CNPJ, a linha só entra se o nome já for de um cliente cadastrado com documento.
    const mesmoNome = precisaNome ? [] : porNome.get(normalizarNome(segurado)) ?? []
    const precisaCpf = !cpf && !(mesmoNome.length === 1 && mesmoNome[0].cpfCnpj)
    if (precisaNome || precisaCpf) {
      res.resultado = 'pendente'
      res.pendencias = { nome: precisaNome, cpf: precisaCpf }
      continue
    }

    const seguradoraAtual = acharSeguradora(valor('seguradoraAtual'), db.seguradoras)
    if (texto(valor('seguradoraAtual')) && !seguradoraAtual) msg(`Seguradora atual "${texto(valor('seguradoraAtual'))}" não reconhecida.`)

    // --- Cliente -------------------------------------------------------------
    let cliente: Cliente | undefined = cpf ? porCpf.get(cpf) : undefined
    let clienteNovo = false
    if (!cliente) {
      const candidatos = porNome.get(normalizarNome(segurado)) ?? []
      if (candidatos.length > 1) {
        res.resultado = 'revisao'
        msg(`Há ${candidatos.length} clientes com este nome: confira no cadastro e importe de novo, ou cadastre manualmente.`)
        continue
      }
      if (candidatos.length === 1) {
        cliente = candidatos[0]
        if (cpf && cliente.cpfCnpj && cliente.cpfCnpj !== cpf) {
          res.resultado = 'revisao'
          msg('Mesmo nome de um cliente cadastrado, mas com CPF/CNPJ diferente.')
          continue
        }
      }
    }
    if (!cliente) {
      cliente = {
        id: crypto.randomUUID(),
        nome: segurado,
        tipo: cpf?.length === 14 || /\b(ltda|me|eireli|s\/?a|epp)\b/i.test(segurado) ? 'juridica' : 'fisica',
        cpfCnpj: cpf,
        telefone,
        email,
        origem: 'carteira',
      }
      clientes.set(cliente.id, cliente)
      indexarCliente(cliente)
      tocadosCli.add(cliente.id)
      clienteNovo = true
    } else {
      // Contato mascarado que o cadastro já tem: não precisa pedir.
      if (res.mascarados) {
        const { telefone: t, email: m } = res.mascarados
        const resto = { telefone: cliente.telefone ? undefined : t, email: cliente.email ? undefined : m }
        res.mascarados = resto.telefone || resto.email ? resto : undefined
      }
      // Completa o cadastro com o que a planilha trouxer (nunca apaga nem sobrescreve).
      if (cpf && !cliente.cpfCnpj) { cliente.cpfCnpj = cpf; indexarCliente(cliente); tocadosCli.add(cliente.id); msg('CPF/CNPJ adicionado ao cadastro.') }
      if (telefone && !cliente.telefone) { cliente.telefone = telefone; tocadosCli.add(cliente.id) }
      if (email && !cliente.email) { cliente.email = email; tocadosCli.add(cliente.id) }
    }

    // --- Seguro que vence nesta data ----------------------------------------
    const doCliente = segurosDoCliente.get(cliente.id) ?? []
    const venceJunto = (s: Seguro) => diasEntre(s.fimVigencia, venc) <= TOLERANCIA_DIAS
    // Mesmo ramo e seguradora; ou um seguro gravado como "outro" numa importação anterior (ramo não
    // reconhecido, e talvez na seguradora do relatório em vez da do grupo, ex.: Porto em vez de Azul): corrige.
    let seguro =
      doCliente.find((s) => s.ramo === ramo && s.seguradoraId === seguradora.id && venceJunto(s)) ??
      doCliente.find((s) => s.ramo === 'outro' && (s.seguradoraId === seguradora.id || s.seguradoraId === base.id) && venceJunto(s))
    if (seguro && seguro.ramo !== ramo) {
      msg(`Ramo corrigido: Outro → ${ramo === 'auto' ? 'Auto' : ramo === 'residencial' ? 'Residencial' : ramo === 'vida' ? 'Vida' : 'Outro'}.`)
      seguro.ramo = ramo
    }
    if (seguro && seguro.seguradoraId !== seguradora.id) {
      msg(`Seguradora corrigida: ${base.nome} → ${seguradora.nome}.`)
      seguro.seguradoraId = seguradora.id
    }
    const financeiro = {
      premioLiquido: converterNumero(valor('premioLiquido')),
      comissaoPct: converterPercentual(valor('comissaoPct')),
      parcelas: converterInteiro(valor('parcelas')),
      valorParcela: converterNumero(valor('valorParcela')),
    }
    const numeroApolice = texto(valor('numeroApolice'))
    if (!seguro) {
      const inicio = converterData(valor('inicioVigencia'), e.formatoData)
      seguro = {
        id: crypto.randomUUID(),
        clienteId: cliente.id,
        seguradoraId: seguradora.id,
        ramo,
        numeroApolice,
        inicioVigencia: inicio && inicio <= venc ? inicio : somarAnos(venc, -1),
        fimVigencia: venc,
        ...financeiro,
        situacao: 'ativo',
      }
      seguros.set(seguro.id, seguro)
      indexarSeguro(seguro)
    } else {
      for (const [k, v] of Object.entries(financeiro)) if (v != null) (seguro as unknown as Record<string, unknown>)[k] = v
      if (numeroApolice && !seguro.numeroApolice) seguro.numeroApolice = numeroApolice
    }
    tocadosSeg.add(seguro.id)

    // --- Renovação ------------------------------------------------------------
    let ren = renovacaoPorChave.get(chaveRen(seguro.id, seguro.fimVigencia))
    const jaExistia = !!ren
    if (!ren) {
      ren = { id: crypto.randomUUID(), seguroId: seguro.id, vencimento: seguro.fimVigencia, corretorId, status, cotada: status !== 'pendente' }
      renovacoes.set(ren.id, ren)
      renovacaoPorChave.set(chaveRen(seguro.id, ren.vencimento), ren)
    } else {
      // Relatório sem andamento (das seguradoras) não desfaz o que a equipe já marcou.
      if (temStatus) { ren.status = status; ren.cotada = status !== 'pendente' || ren.cotada }
      if (corretor) ren.corretorId = corretor.id
    }
    const recebido = converterNumero(valor('valorRecebido'))
    if (recebido != null) ren.valorRecebido = recebido
    tocadosRen.add(ren.id)
    res.renovacaoId = ren.id

    // --- Desfecho: renovada gera a apólice nova; não renovada encerra a atual --
    if (ren.status === 'renovada') {
      const fechada = seguradoraAtual ?? db.seguradoras.find((s) => s.id === ren.seguradoraFechadaId) ?? seguradora
      ren.seguradoraFechadaId = fechada.id
      if (fechada.id !== seguradora.id) msg(`Trocou de seguradora: ${seguradora.nome} → ${fechada.nome}.`)
      const fimNovo = somarAnos(venc, 1)
      let novo = ren.seguroNovoId ? seguros.get(ren.seguroNovoId) : undefined
      novo ??= (segurosDoCliente.get(cliente.id) ?? []).find(
        (s) => s.id !== seguro.id && s.ramo === ramo && s.seguradoraId === fechada.id && diasEntre(s.fimVigencia, fimNovo) <= TOLERANCIA_DIAS,
      )
      if (!novo) {
        novo = { id: crypto.randomUUID(), clienteId: cliente.id, seguradoraId: fechada.id, ramo, inicioVigencia: venc, fimVigencia: fimNovo, situacao: 'ativo' }
        seguros.set(novo.id, novo)
        indexarSeguro(novo)
        tocadosSeg.add(novo.id)
      }
      ren.seguroNovoId = novo.id
      seguro.situacao = 'renovado'
    } else if (ren.status === 'nao_renovada') {
      seguro.situacao = 'nao_renovado'
    } else if (seguro.situacao !== 'ativo' && !ren.seguroNovoId) {
      seguro.situacao = 'ativo'
    }

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
