import { ArrowRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card, Chips, PageHeader, RAMO, STATUS, Secao } from '../components/ui'
import type { Ramo, StatusRenovacao } from '../domain/types'
import { useIndices, useStore } from '../data/store'
import { diasAte, fmtMoeda, hojeIso, mesesRecentes, mesKey, mesLabel } from '../lib/format'

function Barra({ partes, total }: { partes: { valor: number; classe: string }[]; total: number }) {
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
      {partes.map((p, i) => (
        <span key={i} className={p.classe} style={{ width: total ? `${(p.valor / total) * 100}%` : 0 }} />
      ))}
    </div>
  )
}

const ORDEM: StatusRenovacao[] = ['renovada', 'nao_renovada', 'cotando', 'pendente']

export default function Painel() {
  const { db } = useStore()
  const ix = useIndices()
  const [mes, setMes] = useState(mesKey(hojeIso()))

  const meses = useMemo(
    () => mesesRecentes(db.renovacoes.map((r) => r.vencimento)),
    [db.renovacoes],
  )

  const dados = useMemo(() => {
    const doMes = db.renovacoes
      .filter((r) => mesKey(r.vencimento) === mes)
      .map((r) => ({ r, s: ix.seguro.get(r.seguroId)! }))
    const conta = (f: (x: (typeof doMes)[number]) => boolean) => doMes.filter(f).length
    const renovadas = conta(({ r }) => r.status === 'renovada')
    const naoRenovadas = conta(({ r }) => r.status === 'nao_renovada')
    const urgentes = conta(({ r }) => (r.status === 'pendente' || r.status === 'cotando') && diasAte(r.vencimento) <= 7)
    const trocas = doMes.filter(({ r, s }) => r.seguradoraFechadaId && r.seguradoraFechadaId !== s.seguradoraId)
    const comissao = doMes
      .filter(({ r }) => r.status === 'renovada')
      .reduce((t, { s }) => t + ((s.premioLiquido ?? 0) * (s.comissaoPct ?? 0)) / 100, 0)
    const semFinanceiro = conta(({ s }) => s.premioLiquido == null)

    const agrupar = (chave: (x: (typeof doMes)[number]) => string) => {
      const m = new Map<string, Record<StatusRenovacao, number>>()
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
      renovadas,
      naoRenovadas,
      urgentes,
      taxa: renovadas + naoRenovadas ? Math.round((renovadas / (renovadas + naoRenovadas)) * 100) : null,
      trocas,
      comissao,
      semFinanceiro,
      porSeguradora: agrupar(({ s }) => s.seguradoraId),
      porRamo: agrupar(({ s }) => s.ramo),
      porCorretor: agrupar(({ r }) => r.corretorId),
    }
  }, [db.renovacoes, ix, mes])

  const clientesUnicos = db.clientes.length
  const segurosAtivos = db.seguros.filter((s) => s.situacao === 'ativo').length

  const Grupo = ({ titulo, linhas, nome }: { titulo: string; linhas: [string, Record<StatusRenovacao, number>][]; nome: (k: string) => string }) => (
    <Secao titulo={titulo}>
      <Card className="space-y-3">
        {linhas.map(([k, g]) => (
          <div key={k} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>{nome(k)}</span>
              <span className="text-slate-500">{g.renovada}/{total(g)} renovadas</span>
            </div>
            <Barra total={total(g)} partes={ORDEM.map((s) => ({ valor: g[s], classe: STATUS[s].ponto }))} />
          </div>
        ))}
      </Card>
    </Secao>
  )

  return (
    <>
      <PageHeader titulo="Painel" subtitulo={mesLabel(mes)} />
      <div className="bg-marca-700 px-4 pb-4">
        <Chips escuro valor={mes} onChange={setMes} opcoes={meses.map((m) => ({ valor: m, label: mesLabel(m, true) }))} />
      </div>

      <div className="space-y-6 p-4">
        <div className="grid grid-cols-2 gap-2">
          <Card><p className="text-3xl font-semibold">{dados.total}</p><p className="text-sm text-slate-500">renovações no mês</p></Card>
          <Card><p className="text-3xl font-semibold">{dados.taxa != null ? `${dados.taxa}%` : '—'}</p><p className="text-sm text-slate-500">taxa de renovação</p></Card>
          <Card className={dados.urgentes ? 'ring-rose-200' : ''}>
            <p className={`text-3xl font-semibold ${dados.urgentes ? 'text-rose-600' : ''}`}>{dados.urgentes}</p>
            <p className="text-sm text-slate-500">em aberto, vencendo em até 7 dias</p>
          </Card>
          <Card><p className="text-3xl font-semibold">{dados.trocas.length}</p><p className="text-sm text-slate-500">trocaram de seguradora</p></Card>
        </div>

        <Card className="space-y-1">
          <p className="text-sm text-slate-500">Comissão estimada das renovadas</p>
          <p className="text-2xl font-semibold">{fmtMoeda(dados.comissao)}</p>
          <p className="text-xs text-amber-700">
            {dados.semFinanceiro} de {dados.total} seguros sem prêmio/comissão na planilha. O valor real é maior.
          </p>
        </Card>

        <Card className="flex items-center justify-around text-center">
          <div><p className="text-2xl font-semibold">{clientesUnicos}</p><p className="text-xs text-slate-500">clientes únicos</p></div>
          <span className="h-10 w-px bg-slate-200" />
          <div><p className="text-2xl font-semibold">{segurosAtivos}</p><p className="text-xs text-slate-500">seguros ativos</p></div>
          <span className="h-10 w-px bg-slate-200" />
          <div><p className="text-2xl font-semibold">{(segurosAtivos / clientesUnicos).toFixed(1)}</p><p className="text-xs text-slate-500">seguros/cliente</p></div>
        </Card>

        <div className="flex flex-wrap gap-3 px-1 text-xs text-slate-600">
          {ORDEM.map((s) => (
            <span key={s} className="flex items-center gap-1.5"><span className={`size-2 rounded-full ${STATUS[s].ponto}`} />{STATUS[s].label}</span>
          ))}
        </div>

        <Grupo titulo="Por ramo" linhas={dados.porRamo} nome={(k) => RAMO[k as Ramo].label} />
        <Grupo titulo="Por seguradora" linhas={dados.porSeguradora} nome={(k) => ix.seguradora.get(k)?.nome ?? k} />
        <Grupo titulo="Por corretor" linhas={dados.porCorretor} nome={(k) => ix.corretor.get(k)?.nome ?? k} />

        {dados.trocas.length > 0 && (
          <Secao titulo="Trocas de seguradora">
            <Card className="!p-0">
              <ul className="divide-y divide-slate-100">
                {dados.trocas.map(({ r, s }) => (
                  <li key={r.id} className="px-4 py-3 text-sm">
                    <p className="font-medium">{ix.cliente.get(s.clienteId)?.nome}</p>
                    <p className="flex items-center gap-1 text-xs text-slate-500">
                      {ix.seguradora.get(s.seguradoraId)?.nome} <ArrowRight className="size-3" /> {ix.seguradora.get(r.seguradoraFechadaId!)?.nome}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          </Secao>
        )}
      </div>
    </>
  )
}

function total(g: Record<StatusRenovacao, number>) {
  return g.pendente + g.cotando + g.renovada + g.nao_renovada
}
