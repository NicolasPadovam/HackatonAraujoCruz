import type { Db, Ramo, Renovacao, Seguro, StatusRenovacao } from '../domain/types'
import { parseIso, toIso } from '../lib/format'
import { numeroParaCampo, parseNumeroBR } from '../lib/validacao'
import { Campo, INPUT, RAMO, STATUS } from './ui'

export interface SeguroValores {
  ramo: Ramo
  seguradoraId: string
  numeroApolice: string
  inicio: string
  fim: string
  premio: string
  comissao: string
  parcelas: string
  valorParcela: string
  corretorId: string
  status: StatusRenovacao
}

export type ErrosSeguro = Partial<Record<keyof SeguroValores, string>>

/** Some com o erro dos campos que a pessoa acabou de alterar. */
export function limparErros(erros: ErrosSeguro, antes: SeguroValores, depois: SeguroValores): ErrosSeguro {
  const e = { ...erros }
  for (const k of Object.keys(depois) as (keyof SeguroValores)[]) if (antes[k] !== depois[k]) delete e[k]
  return e
}

export function umAnoDepois(iso: string): string {
  const d = parseIso(iso)
  return toIso(new Date(d.getFullYear() + 1, d.getMonth(), d.getDate()))
}

export function valoresIniciais(db: Db, seguro?: Seguro): SeguroValores {
  return {
    ramo: seguro?.ramo ?? 'residencial',
    seguradoraId: seguro?.seguradoraId ?? '',
    numeroApolice: seguro?.numeroApolice ?? '',
    inicio: seguro?.inicioVigencia ?? '',
    fim: seguro?.fimVigencia ?? '',
    premio: numeroParaCampo(seguro?.premioLiquido),
    comissao: numeroParaCampo(seguro?.comissaoPct),
    parcelas: seguro?.parcelas != null ? String(seguro.parcelas) : '',
    valorParcela: numeroParaCampo(seguro?.valorParcela),
    corretorId: db.corretores[0]?.id ?? '',
    status: 'pendente',
  }
}

export function validarSeguro(v: SeguroValores): ErrosSeguro {
  const e: ErrosSeguro = {}
  if (!v.seguradoraId) e.seguradoraId = 'Escolha a seguradora.'
  if (!v.inicio) e.inicio = 'Informe o início da vigência.'
  if (!v.fim) e.fim = 'Informe o fim da vigência.'
  if (v.inicio && v.fim && v.fim < v.inicio) e.fim = 'O fim precisa ser depois do início.'
  const premio = parseNumeroBR(v.premio)
  if (premio != null && (Number.isNaN(premio) || premio < 0)) e.premio = 'Valor inválido.'
  const comissao = parseNumeroBR(v.comissao)
  if (comissao != null && (Number.isNaN(comissao) || comissao < 0 || comissao > 100)) e.comissao = 'Use um percentual entre 0 e 100.'
  if (v.parcelas && !(Number.isInteger(Number(v.parcelas)) && Number(v.parcelas) > 0)) e.parcelas = 'Número inteiro maior que zero.'
  const vp = parseNumeroBR(v.valorParcela)
  if (vp != null && (Number.isNaN(vp) || vp < 0)) e.valorParcela = 'Valor inválido.'
  if (!v.corretorId) e.corretorId = 'Escolha o corretor.'
  return e
}

function valorParcelaCalculado(v: SeguroValores): number | undefined {
  const premio = parseNumeroBR(v.premio)
  const parcelas = Number(v.parcelas)
  if (premio == null || Number.isNaN(premio) || !parcelas) return undefined
  return Math.round((premio / parcelas) * 100) / 100
}

/** Monta o seguro e, se for novo, a renovação no fim da vigência. */
export function montarSeguro(v: SeguroValores, clienteId: string, existente?: Seguro): { seguro: Seguro; renovacao: Renovacao | null } {
  const seguro: Seguro = {
    id: existente?.id ?? crypto.randomUUID(),
    clienteId,
    seguradoraId: v.seguradoraId,
    ramo: v.ramo,
    numeroApolice: v.numeroApolice.trim() || undefined,
    inicioVigencia: v.inicio,
    fimVigencia: v.fim,
    premioLiquido: parseNumeroBR(v.premio),
    comissaoPct: parseNumeroBR(v.comissao),
    parcelas: v.parcelas ? Number(v.parcelas) : undefined,
    valorParcela: parseNumeroBR(v.valorParcela) ?? valorParcelaCalculado(v),
    situacao: existente?.situacao ?? 'ativo',
  }
  if (existente) return { seguro, renovacao: null }
  return {
    seguro,
    renovacao: {
      id: crypto.randomUUID(),
      seguroId: seguro.id,
      vencimento: v.fim,
      corretorId: v.corretorId,
      status: v.status,
      cotada: v.status !== 'pendente',
    },
  }
}

export function SeguroCampos({ db, valores, onChange, erros, novo }: {
  db: Db; valores: SeguroValores; onChange: (v: SeguroValores) => void; erros: ErrosSeguro; novo: boolean
}) {
  const set = <K extends keyof SeguroValores>(k: K, valor: SeguroValores[K]) => onChange({ ...valores, [k]: valor })
  const calculado = valorParcelaCalculado(valores)

  const mudarInicio = (inicio: string) => {
    // Sugere fim = início + 1 ano enquanto o fim estiver vazio ou ainda for a sugestão anterior.
    const sugeridoAntes = valores.inicio ? umAnoDepois(valores.inicio) : ''
    const fim = inicio && (!valores.fim || valores.fim === sugeridoAntes) ? umAnoDepois(inicio) : valores.fim
    onChange({ ...valores, inicio, fim })
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <Campo label="Ramo" obrigatorio>
        <select className={INPUT} value={valores.ramo} onChange={(e) => set('ramo', e.target.value as Ramo)}>
          {(Object.keys(RAMO) as Ramo[]).map((r) => <option key={r} value={r}>{RAMO[r].label}</option>)}
        </select>
      </Campo>
      <Campo label="Seguradora" obrigatorio erro={erros.seguradoraId}>
        <select className={INPUT} aria-invalid={!!erros.seguradoraId} value={valores.seguradoraId} onChange={(e) => set('seguradoraId', e.target.value)}>
          <option value="">Escolha…</option>
          {db.seguradoras.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
      </Campo>
      <Campo label="Início da vigência" obrigatorio erro={erros.inicio}>
        <input type="date" className={INPUT} aria-invalid={!!erros.inicio} value={valores.inicio} onChange={(e) => mudarInicio(e.target.value)} />
      </Campo>
      <Campo label="Fim da vigência" obrigatorio erro={erros.fim} dica={novo ? 'A renovação é criada nesta data.' : 'Renovações em aberto acompanham esta data.'}>
        <input type="date" className={INPUT} aria-invalid={!!erros.fim} value={valores.fim} onChange={(e) => set('fim', e.target.value)} />
      </Campo>
      <Campo label="Nº da apólice" className="col-span-2">
        <input className={INPUT} value={valores.numeroApolice} onChange={(e) => set('numeroApolice', e.target.value)} placeholder="Opcional" />
      </Campo>
      <Campo label="Prêmio líquido (R$)" erro={erros.premio}>
        <input inputMode="decimal" className={INPUT} aria-invalid={!!erros.premio} value={valores.premio} onChange={(e) => set('premio', e.target.value)} placeholder="Ex.: 1.250,00" />
      </Campo>
      <Campo label="Comissão (%)" erro={erros.comissao}>
        <input inputMode="decimal" className={INPUT} aria-invalid={!!erros.comissao} value={valores.comissao} onChange={(e) => set('comissao', e.target.value)} placeholder="Ex.: 15" />
      </Campo>
      <Campo label="Parcelas" erro={erros.parcelas}>
        <input inputMode="numeric" className={INPUT} aria-invalid={!!erros.parcelas} value={valores.parcelas} onChange={(e) => set('parcelas', e.target.value.replace(/\D/g, ''))} placeholder="Ex.: 10" />
      </Campo>
      <Campo label="Valor da parcela (R$)" erro={erros.valorParcela} dica={calculado != null && !valores.valorParcela ? 'Vazio = prêmio ÷ parcelas.' : undefined}>
        <input
          inputMode="decimal"
          className={INPUT}
          aria-invalid={!!erros.valorParcela}
          value={valores.valorParcela}
          onChange={(e) => set('valorParcela', e.target.value)}
          placeholder={calculado != null ? numeroParaCampo(calculado) : 'Opcional'}
        />
      </Campo>
      {novo && (
        <>
          <Campo label="Corretor da renovação" obrigatorio erro={erros.corretorId}>
            <select className={INPUT} value={valores.corretorId} onChange={(e) => set('corretorId', e.target.value)}>
              {db.corretores.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </Campo>
          <Campo label="Andamento da renovação">
            <select className={INPUT} value={valores.status} onChange={(e) => set('status', e.target.value as StatusRenovacao)}>
              {(Object.keys(STATUS) as StatusRenovacao[]).map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
            </select>
          </Campo>
        </>
      )}
    </div>
  )
}
