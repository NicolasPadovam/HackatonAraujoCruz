// Leitura de .xlsx/.xls/.csv no navegador (SheetJS). O arquivo NÃO sai da máquina:
// só as linhas convertidas vão para o banco quando a pessoa confirma.

import { pontuarCabecalho } from './campos'

export type Celula = string | number | boolean | null

export interface Aba {
  nome: string
  linhas: Celula[][]
}

/** Entidades HTML que sobram em relatórios exportados como tabela HTML ("T&#233;rmino" -> "Término"). */
function decodificarEntidades(t: string): string {
  if (!t.includes('&')) return t
  return t
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
}

/** .xlsx (zip, "PK") e .xls binário (OLE) têm assinatura própria; o resto é texto (CSV, TSV, HTML). */
function ehBinario(b: Uint8Array): boolean {
  return (b[0] === 0x50 && b[1] === 0x4b) || (b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0)
}

/**
 * Texto sem BOM: o SheetJS o leria como Latin-1 e "Apólice" viraria "ApÃ³lice".
 * Tenta UTF-8 (estrito); se não for UTF-8 válido, é Windows-1252 (o padrão do Excel em português).
 */
export function decodificarTexto(b: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(b).replace(/^﻿/, '')
  } catch {
    return new TextDecoder('windows-1252').decode(b)
  }
}

export async function lerArquivo(arquivo: File): Promise<Aba[]> {
  const XLSX = await import('xlsx') // carregado só quando alguém importa
  const bytes = new Uint8Array(await arquivo.arrayBuffer())
  // Vários relatórios ".xls" são, na verdade, HTML ou texto com TAB (ver docs/importacao/).
  // raw: true -> nesses formatos de texto o SheetJS não "adivinha" datas e números
  // (ele leria 05/11 como mês/dia e "1234,56" como milhar); a conversão fica com o importador.
  // cellDates: false -> datas de .xlsx/.xls chegam como número serial do Excel (sem problema de fuso).
  const opcoes = { cellDates: false, dense: true, raw: true } as const
  const wb = ehBinario(bytes)
    ? XLSX.read(bytes, { ...opcoes, type: 'array' })
    : XLSX.read(decodificarTexto(bytes), { ...opcoes, type: 'string' })
  return wb.SheetNames.map((nome) => ({
    nome,
    linhas: XLSX.utils
      .sheet_to_json<Celula[]>(wb.Sheets[nome], { header: 1, raw: true, defval: null, blankrows: true })
      .map((l) => l.map((v) => (typeof v === 'string' ? decodificarEntidades(v) : v))),
  }))
}

/** Índice (0-based) da linha de cabeçalho mais provável nas 20 primeiras linhas. */
export function detectarCabecalho(linhas: Celula[][]): number {
  let melhor = 0
  let pontos = -1
  linhas.slice(0, 20).forEach((l, i) => {
    const p = pontuarCabecalho(l)
    if (p > pontos) {
      pontos = p
      melhor = i
    }
  })
  if (pontos > 0) return melhor
  const primeira = linhas.findIndex((l) => l.filter((v) => typeof v === 'string' && v.trim()).length >= 3)
  return Math.max(0, primeira)
}

export function cabecalhos(linhas: Celula[][], linhaCabecalho: number): string[] {
  return (linhas[linhaCabecalho] ?? []).map((v, i) => (v == null || String(v).trim() === '' ? `Coluna ${i + 1}` : String(v).trim()))
}
