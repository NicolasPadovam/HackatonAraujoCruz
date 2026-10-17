// Reconhece sozinho como ler o arquivo (linha do cabeçalho, colunas, formato das datas).
// A pessoa só escolhe a seguradora; se o formato não for reconhecido, a importação para
// e pede o administrador: nunca adivinhamos colunas às cegas.

import type { ModeloImportacao } from '../domain/types'
import { CAMPOS, sugerirMapeamento, type CampoDestino, type Mapeamento } from './campos'
import { detectarFormatoData, type FormatoData } from './conversao'
import { cabecalhos, detectarCabecalho, type Aba } from './leitura'

/** Sem estas colunas não dá nem para saber de quem é a linha e quando vence. */
const ESSENCIAIS: CampoDestino[] = ['segurado', 'vencimento']

export interface AbaReconhecida {
  aba: Aba
  linhaCabecalho: number
  mapeamento: Mapeamento
  formatoData: FormatoData
}

export type Reconhecimento =
  | { ok: true; abas: AbaReconhecida[] }
  | { ok: false; problemas: { aba: string; faltando: string[] }[] }

const temValor = (v: unknown) => v != null && String(v).trim() !== ''

/**
 * Toda aba com algum dado precisa ser reconhecida: uma aba ignorada seriam renovações perdidas.
 * O mapeamento salvo (de importações anteriores) vale primeiro; o resto vem pelos nomes das colunas.
 */
export function reconhecer(abas: Aba[], modelo: ModeloImportacao | undefined, planilhaCorretora: boolean): Reconhecimento {
  const ok: AbaReconhecida[] = []
  const problemas: { aba: string; faltando: string[] }[] = []
  for (const aba of abas) {
    if (!aba.linhas.some((l) => l.some(temValor))) continue // aba vazia
    const linhaCabecalho = detectarCabecalho(aba.linhas)
    const cab = cabecalhos(aba.linhas, linhaCabecalho)
    const doSalvo: Mapeamento = modelo ? Object.fromEntries(Object.entries(modelo.mapeamento).filter(([, col]) => cab.includes(col))) : {}
    const usadas = new Set(Object.values(doSalvo))
    const sugerido = Object.fromEntries(Object.entries(sugerirMapeamento(cab)).filter(([campo, col]) => !(campo in doSalvo) && !usadas.has(col!)))
    const mapeamento: Mapeamento = { ...sugerido, ...doSalvo }
    if (!planilhaCorretora) delete mapeamento.seguradora // vem da seguradora escolhida

    const faltando = ESSENCIAIS.filter((c) => !mapeamento[c]).map((c) => CAMPOS.find((d) => d.campo === c)!.label)
    if (faltando.length) {
      problemas.push({ aba: aba.nome, faltando })
      continue
    }
    const iVenc = cab.indexOf(mapeamento.vencimento!)
    const valores = aba.linhas.slice(linhaCabecalho + 1).map((l) => l[iVenc] ?? null)
    const formatoData = modelo?.opcoes.formatoData ?? detectarFormatoData(valores) ?? (planilhaCorretora ? 'mdy' : 'dmy')
    ok.push({ aba, linhaCabecalho, mapeamento, formatoData })
  }
  if (problemas.length) return { ok: false, problemas }
  if (!ok.length) return { ok: false, problemas: [{ aba: '(arquivo)', faltando: ['nenhuma aba com dados'] }] }
  return { ok: true, abas: ok }
}
