// Campos que o importador entende e os nomes de coluna que costumam aparecer
// nas planilhas (da corretora e das seguradoras). Usados para reconhecer as colunas sozinho.

import { normalizarNome } from '../lib/format'

export type CampoDestino =
  | 'numeroApolice'
  | 'cpfCnpj'
  | 'segurado'
  | 'vencimento'
  | 'seguradora'
  | 'ramo'
  | 'telefone'
  | 'email'
  | 'corretor'

export interface DefinicaoCampo {
  campo: CampoDestino
  label: string
  obrigatorio?: boolean
  sinonimos: string[]
}

export const CAMPOS: DefinicaoCampo[] = [
  { campo: 'numeroApolice', label: 'Nº da apólice', obrigatorio: true, sinonimos: ['apolice anterior', 'apolice', 'numero apolice', 'numero da apolice', 'n apolice', 'no apolice', 'nº apolice', 'num apolice'] },
  { campo: 'cpfCnpj', label: 'CPF/CNPJ', obrigatorio: true, sinonimos: ['cpf/cnpj segurado', 'cpf/cnpj do proponente', 'cpf', 'cnpj', 'cpf cnpj', 'cpfcnpj', 'cpf/cnpj', 'documento', 'cpf do segurado', 'cnpj cpf', 'doc segurado', 'cpf segurado'] },
  { campo: 'segurado', label: 'Nome do segurado', obrigatorio: true, sinonimos: ['nome razao social', 'nome cliente', 'nome do proponente', 'nome do segurado', 'segurado', 'nome segurado', 'nome', 'cliente', 'nome do cliente', 'razao social', 'estipulante', 'proponente'] },
  { campo: 'vencimento', label: 'Vencimento', obrigatorio: true, sinonimos: ['data final vigencia', 'fim vigencia anterior', 'vigencia', 'vencimento', 'fim vigencia', 'fim de vigencia', 'fim da vigencia', 'final vigencia', 'final de vigencia', 'termino vigencia', 'termino de vigencia', 'data vencimento', 'data de vencimento', 'vigencia final', 'vigencia fim', 'data fim', 'dt fim vigencia', 'dt vencimento', 'vencimento apolice'] },
  { campo: 'seguradora', label: 'Seguradora', obrigatorio: true, sinonimos: ['seguradoras', 'seguradora', 'cia', 'companhia', 'cia seguradora'] },
  { campo: 'ramo', label: 'Ramo', obrigatorio: true, sinonimos: ['nome produto', 'ramo', 'produto', 'tipo de seguro', 'modalidade', 'ramo produto', 'descricao ramo'] },
  { campo: 'telefone', label: 'Telefone', sinonimos: ['celular do proponente', 'telefone do proponente', 'telefone de contato', 'telefone', 'celular', 'fone', 'whatsapp', 'telefone celular', 'tel'] },
  { campo: 'email', label: 'E-mail', sinonimos: ['e mail segurado', 'email do proponente', 'email', 'e mail', 'e-mail', 'email segurado'] },
  { campo: 'corretor', label: 'Corretor', sinonimos: ['corretor', 'responsavel', 'corretor responsavel'] },
]

export const LABEL_CAMPO = Object.fromEntries(CAMPOS.map((c) => [c.campo, c.label])) as Record<CampoDestino, string>
export const OBRIGATORIO = new Set(CAMPOS.filter((c) => c.obrigatorio).map((c) => c.campo))

/** Normaliza um cabeçalho para comparar: sem acento, minúsculo, só letras/números/espaço. */
export function normalizarCabecalho(v: unknown): string {
  return normalizarNome(String(v ?? '').replace(/([a-z])([A-Z])/g, '$1 $2'))
    .replace(/[º°]/g, 'o')
    .replace(/[^a-z0-9%/ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export type Mapeamento = Partial<Record<CampoDestino, string>> // campo -> texto do cabeçalho

/** Sugere o mapeamento: igualdade exata com um sinônimo; depois "começa com". */
export function sugerirMapeamento(cabecalhos: string[]): Mapeamento {
  const norm = cabecalhos.map(normalizarCabecalho)
  const usados = new Set<number>()
  const m: Mapeamento = {}
  for (const passo of ['exato', 'prefixo'] as const) {
    for (const def of CAMPOS) {
      if (m[def.campo]) continue
      const i = norm.findIndex((h, idx) =>
        !usados.has(idx) && h && def.sinonimos.some((s) => (passo === 'exato' ? h === s : h.startsWith(s + ' '))),
      )
      if (i >= 0) {
        m[def.campo] = cabecalhos[i]
        usados.add(i)
      }
    }
  }
  return m
}

/** Quantos cabeçalhos de uma linha batem com algum sinônimo (para achar a linha de cabeçalho). */
export function pontuarCabecalho(linha: unknown[]): number {
  const todos = new Set(CAMPOS.flatMap((c) => c.sinonimos))
  return linha.filter((v) => typeof v === 'string' && todos.has(normalizarCabecalho(v))).length
}
