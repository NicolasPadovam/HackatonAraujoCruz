import { ChevronRight, Info } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { RenovacaoSheet } from '../components/RenovacaoSheet'
import { Card, Chips, PageHeader, RamoBadge, STATUS, StatusBadge, Vazio, type Opcao } from '../components/ui'
import type { Ramo, StatusRenovacao } from '../domain/types'
import { useIndices, useStore } from '../data/store'
import { diasAte, fmtDataCurta, hojeIso, mesesRecentes, mesKey, mesLabel, prazoLabel } from '../lib/format'

type FiltroRamo = Ramo | 'todos'
type FiltroStatus = StatusRenovacao | 'todos'

export default function Renovacoes() {
  const { db } = useStore()
  const ix = useIndices()
  const [mes, setMes] = useState(mesKey(hojeIso()))
  const [ramo, setRamo] = useState<FiltroRamo>('residencial')
  const [status, setStatus] = useState<FiltroStatus>('todos')
  const [corretor, setCorretor] = useState('todos')
  const [aberta, setAberta] = useState<string | null>(null)

  const meses = useMemo(
    () => mesesRecentes(db.renovacoes.map((r) => r.vencimento)),
    [db.renovacoes],
  )

  const doMes = useMemo(
    () =>
      db.renovacoes
        .filter((r) => mesKey(r.vencimento) === mes)
        .map((r) => ({ r, seguro: ix.seguro.get(r.seguroId)! }))
        .filter(({ seguro }) => ramo === 'todos' || seguro.ramo === ramo)
        .filter(({ r }) => corretor === 'todos' || r.corretorId === corretor),
    [db.renovacoes, ix, mes, ramo, corretor],
  )

  const contagem = (s: StatusRenovacao) => doMes.filter(({ r }) => r.status === s).length
  const lista = doMes
    .filter(({ r }) => status === 'todos' || r.status === status)
    .sort((a, b) => a.r.vencimento.localeCompare(b.r.vencimento))

  const opcoesRamo: Opcao<FiltroRamo>[] = [
    { valor: 'residencial', label: 'Residencial' },
    { valor: 'todos', label: 'Todos os ramos' },
    { valor: 'auto', label: 'Auto' },
    { valor: 'vida', label: 'Vida' },
  ]

  return (
    <>
      <PageHeader
        titulo="Renovações"
        subtitulo={mesLabel(mes)}
        direita={
          <Link to="/roadmap" className="rounded-full p-2 text-marca-100 hover:bg-marca-600" aria-label="Sobre o protótipo">
            <Info className="size-5" />
          </Link>
        }
      />
      <div className="bg-marca-700 px-4 pb-4">
        <Chips
          escuro
          valor={mes}
          onChange={setMes}
          opcoes={meses.map((m) => ({ valor: m, label: mesLabel(m, true) }))}
        />
      </div>

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-4 gap-2">
          {(Object.keys(STATUS) as StatusRenovacao[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(status === s ? 'todos' : s)}
              className={`rounded-2xl bg-white p-2.5 text-left shadow-sm ring-1 transition ${
                status === s ? 'ring-2 ring-marca-500' : 'ring-slate-200/70'
              }`}
            >
              <span className={`mb-1 block h-1 w-6 rounded-full ${STATUS[s].ponto}`} />
              <span className="block text-xl font-semibold leading-tight">{contagem(s)}</span>
              <span className="block truncate text-[11px] text-slate-500">{STATUS[s].label}</span>
            </button>
          ))}
        </div>

        <Chips opcoes={opcoesRamo} valor={ramo} onChange={setRamo} />
        <Chips
          valor={corretor}
          onChange={setCorretor}
          opcoes={[{ valor: 'todos', label: 'Todos corretores' }, ...db.corretores.map((c) => ({ valor: c.id, label: c.nome }))]}
        />

        {lista.length === 0 ? (
          <Vazio>Nenhuma renovação com esses filtros.</Vazio>
        ) : (
          <ul className="space-y-2">
            {lista.map(({ r, seguro }) => {
              const cliente = ix.cliente.get(seguro.clienteId)!
              const dias = diasAte(r.vencimento)
              const aberto = r.status === 'pendente' || r.status === 'cotando'
              const urgente = aberto && dias <= 7
              return (
                <li key={r.id}>
                  <button onClick={() => setAberta(r.id)} className="w-full text-left">
                    <Card className="flex items-center gap-3 !p-3 active:bg-slate-50">
                      <div className={`w-12 shrink-0 rounded-xl py-1.5 text-center ${urgente ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-700'}`}>
                        <div className="text-lg font-semibold leading-none">{fmtDataCurta(r.vencimento).split(' ')[0]}</div>
                        <div className="text-[11px] uppercase">{fmtDataCurta(r.vencimento).split(' ')[1]}</div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{cliente.nome}</p>
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                          <RamoBadge ramo={seguro.ramo} compacto />
                          <span className="truncate">{ix.seguradora.get(seguro.seguradoraId)?.nome}</span>
                          <span>·</span>
                          <span>{ix.corretor.get(r.corretorId)?.sigla}</span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <StatusBadge status={r.status} />
                          {aberto && (
                            <span className={`text-xs ${urgente ? 'font-medium text-rose-600' : 'text-slate-400'}`}>
                              {prazoLabel(r.vencimento)}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-slate-300" />
                    </Card>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <RenovacaoSheet id={aberta} onFechar={() => setAberta(null)} />
    </>
  )
}
