import { ArrowRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card, PageHeader, RAMO, STATUS, Secao, Segmentos, TD, TH } from '../components/ui'
import type { Ramo, StatusRenovacao } from '../domain/types'
import { useIndices, useStore } from '../data/store'
import { DIAS_ALERTA, faixaVencimento, fmtData, fmtMoeda, hojeIso, mesesRecentes, mesKey, mesLabel } from '../lib/format'

const ORDEM: StatusRenovacao[] = ['renovada', 'nao_renovada', 'cotando', 'pendente']
type Grupo = Record<StatusRenovacao, number>

function total(g: Grupo) {
  return g.pendente + g.cotando + g.renovada + g.nao_renovada
}

function Barra({ g }: { g: Grupo }) {
  const t = total(g)
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
      {ORDEM.map((s) => (
        <span key={s} className={STATUS[s].ponto} style={{ width: t ? `${(g[s] / t) * 100}%` : 0 }} />
      ))}
    </div>
  )
}

function Distribuicao({ titulo, linhas, nome }: { titulo: string; linhas: [string, Grupo][]; nome: (k: string) => string }) {
  return (
    <Secao titulo={titulo}>
      <Card className="space-y-4">
        {linhas.map(([k, g]) => (
          <div key={k} className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{nome(k)}</span>
              <span className="text-slate-500">{g.renovada}/{total(g)} renovadas</span>
            </div>
            <Barra g={g} />
          </div>
        ))}
      </Card>
    </Secao>
  )
}

function Kpi({ valor, label, destaque = false }: { valor: string | number; label: string; destaque?: boolean }) {
  return (
    <Card className={destaque ? 'ring-rose-200' : ''}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-semibold ${destaque ? 'text-rose-600' : ''}`}>{valor}</p>
    </Card>
  )
}

export default function Painel() {
  const { db } = useStore()
  const ix = useIndices()
  const [mes, setMes] = useState(mesKey(hojeIso()))

  const meses = useMemo(() => mesesRecentes(db.renovacoes.map((r) => r.vencimento)), [db.renovacoes])

  const dados = useMemo(() => {
    const doMes = db.renovacoes
      .filter((r) => mesKey(r.vencimento) === mes)
      .map((r) => ({ r, s: ix.seguro.get(r.seguroId)! }))
    type Item = (typeof doMes)[number]
    const conta = (f: (x: Item) => boolean) => doMes.filter(f).length
    const renovadas = conta(({ r }) => r.status === 'renovada')
    const naoRenovadas = conta(({ r }) => r.status === 'nao_renovada')

    const agrupar = (chave: (x: Item) => string) => {
      const m = new Map<string, Grupo>()
      for (const x of doMes) {
        const k = chave(x)
        const g = m.get(k) ?? { pendente: 0, cotando: 0, renovada: 0, nao_renovada: 0 }
        g[x.r.status]++
        m.set(k, g)
      }
      return [...m.entries()].sort((a, b) => total(b[1]) - total(a[1]))
    }

    return {
      total: doMes.length,
      taxa: renovadas + naoRenovadas ? Math.round((renovadas / (renovadas + naoRenovadas)) * 100) : null,
      vencendo: conta(({ r }) => (r.status === 'pendente' || r.status === 'cotando') && faixaVencimento(r.vencimento) != null),
      urgentes: conta(({ r }) => (r.status === 'pendente' || r.status === 'cotando') && faixaVencimento(r.vencimento) === 'urgente'),
      emAberto: conta(({ r }) => r.status === 'pendente' || r.status === 'cotando'),
      trocas: doMes.filter(({ r, s }) => r.seguradoraFechadaId && r.seguradoraFechadaId !== s.seguradoraId),
      comissao: doMes
        .filter(({ r }) => r.status === 'renovada')
        .reduce((t, { s }) => t + ((s.premioLiquido ?? 0) * (s.comissaoPct ?? 0)) / 100, 0),
      semFinanceiro: conta(({ s }) => s.premioLiquido == null),
      porSeguradora: agrupar(({ s }) => s.seguradoraId),
      porRamo: agrupar(({ s }) => s.ramo),
      porCorretor: agrupar(({ r }) => r.corretorId),
    }
  }, [db.renovacoes, ix, mes])

  const clientesUnicos = db.clientes.length
  const segurosAtivos = db.seguros.filter((s) => s.situacao === 'ativo').length

  return (
    <>
      <PageHeader
        titulo="Painel"
        subtitulo={`Visão da carteira · ${mesLabel(mes)}`}
        direita={<Segmentos valor={mes} onChange={setMes} opcoes={meses.map((m) => ({ valor: m, label: mesLabel(m, true) }))} />}
      />

      <div className="space-y-6 px-8 py-6">
        <div className="grid grid-cols-4 gap-4">
          <Kpi valor={dados.total} label="Renovações no mês" />
          <Kpi valor={dados.taxa != null ? `${dados.taxa}%` : '—'} label="Taxa de renovação (fechadas)" />
          <Kpi valor={dados.emAberto} label="Em aberto (pendente ou cotando)" />
          <Kpi valor={dados.vencendo} label={`Em aberto vencendo em até ${DIAS_ALERTA} dias ou vencidas`} destaque={dados.urgentes > 0} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <p className="text-sm text-slate-500">Comissão estimada das renovadas</p>
            <p className="mt-1 text-3xl font-semibold">{fmtMoeda(dados.comissao)}</p>
            <p className="mt-1 text-xs text-amber-700">
              {dados.semFinanceiro} de {dados.total} seguros sem prêmio/comissão na planilha. O valor real é maior.
            </p>
          </Card>
          <Card className="flex items-center justify-around text-center">
            <div><p className="text-3xl font-semibold">{clientesUnicos}</p><p className="text-sm text-slate-500">clientes únicos</p></div>
            <span className="h-12 w-px bg-slate-200" />
            <div><p className="text-3xl font-semibold">{segurosAtivos}</p><p className="text-sm text-slate-500">seguros ativos</p></div>
            <span className="h-12 w-px bg-slate-200" />
            <div><p className="text-3xl font-semibold">{(segurosAtivos / Math.max(1, clientesUnicos)).toFixed(1)}</p><p className="text-sm text-slate-500">seguros por cliente</p></div>
          </Card>
        </div>

        <div className="flex gap-4 text-xs text-slate-600">
          {ORDEM.map((s) => (
            <span key={s} className="flex items-center gap-1.5"><span className={`size-2 rounded-full ${STATUS[s].ponto}`} />{STATUS[s].label}</span>
          ))}
        </div>

        <div className="grid grid-cols-3 items-start gap-6">
          <Distribuicao titulo="Por ramo" linhas={dados.porRamo} nome={(k) => RAMO[k as Ramo].label} />
          <Distribuicao titulo="Por seguradora" linhas={dados.porSeguradora} nome={(k) => ix.seguradora.get(k)?.nome ?? k} />
          <Distribuicao titulo="Por corretor" linhas={dados.porCorretor} nome={(k) => ix.corretor.get(k)?.nome ?? k} />
        </div>

        {dados.trocas.length > 0 && (
          <Secao titulo="Trocas de seguradora no mês">
            <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200/70">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr><th className={TH}>Cliente</th><th className={TH}>Ramo</th><th className={TH}>Vencimento</th><th className={TH}>Troca</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dados.trocas.map(({ r, s }) => (
                    <tr key={r.id}>
                      <td className={`${TD} font-medium`}>{ix.cliente.get(s.clienteId)?.nome}</td>
                      <td className={TD}>{RAMO[s.ramo].label}</td>
                      <td className={`${TD} tabular-nums`}>{fmtData(r.vencimento)}</td>
                      <td className={TD}>
                        <span className="inline-flex items-center gap-1.5">
                          {ix.seguradora.get(s.seguradoraId)?.nome}
                          <ArrowRight className="size-3.5 text-violet-500" />
                          <span className="font-medium text-violet-700">{ix.seguradora.get(r.seguradoraFechadaId!)?.nome}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Secao>
        )}
      </div>
    </>
  )
}
