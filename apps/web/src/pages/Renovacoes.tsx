import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { KanbanRenovacoes } from '../components/KanbanRenovacoes'
import { RenovacaoSheet } from '../components/RenovacaoSheet'
import { PageHeader, RamoBadge, STATUS, Segmentos, Select, StatusBadge, TD, TH, Vazio, type Opcao } from '../components/ui'
import type { Ramo, StatusRenovacao } from '../domain/types'
import { useIndices, useStore } from '../data/store'
import { diasAte, fmtData, hojeIso, mesesRecentes, mesKey, mesLabel, normalizarNome, prazoLabel } from '../lib/format'

type FiltroRamo = Ramo | 'todos'
type FiltroStatus = StatusRenovacao | 'todos'

export default function Renovacoes() {
  const { db } = useStore()
  const ix = useIndices()
  const [mes, setMes] = useState(mesKey(hojeIso()))
  const [ramo, setRamo] = useState<FiltroRamo>('residencial')
  const [status, setStatus] = useState<FiltroStatus>('todos')
  const [corretor, setCorretor] = useState('todos')
  const [busca, setBusca] = useState('')
  const [modo, setModo] = useState<'lista' | 'kanban'>('lista')
  const [aberta, setAberta] = useState<string | null>(null)

  const meses = useMemo(() => mesesRecentes(db.renovacoes.map((r) => r.vencimento)), [db.renovacoes])

  const doMes = useMemo(() => {
    const termo = normalizarNome(busca)
    return db.renovacoes
      .filter((r) => mesKey(r.vencimento) === mes)
      .map((r) => {
        const seguro = ix.seguro.get(r.seguroId)!
        return { r, seguro, cliente: ix.cliente.get(seguro.clienteId)! }
      })
      .filter(({ seguro }) => ramo === 'todos' || seguro.ramo === ramo)
      .filter(({ r }) => corretor === 'todos' || r.corretorId === corretor)
      .filter(({ cliente }) => !termo || normalizarNome(cliente.nome).includes(termo))
  }, [db.renovacoes, ix, mes, ramo, corretor, busca])

  const contagem = (s: StatusRenovacao) => doMes.filter(({ r }) => r.status === s).length
  const lista = doMes
    .filter(({ r }) => status === 'todos' || r.status === status)
    .sort((a, b) => a.r.vencimento.localeCompare(b.r.vencimento))

  const opcoesRamo: Opcao<FiltroRamo>[] = [
    { valor: 'residencial', label: 'Residencial' },
    { valor: 'auto', label: 'Auto' },
    { valor: 'vida', label: 'Vida' },
    { valor: 'todos', label: 'Todos os ramos' },
  ]

  return (
    <>
      <PageHeader
        titulo="Renovações"
        subtitulo={`${mesLabel(mes)} · planilha do mês importada`}
        direita={<Segmentos valor={mes} onChange={setMes} opcoes={meses.map((m) => ({ valor: m, label: mesLabel(m, true) }))} />}
      />

      <div className="space-y-6 px-8 py-6">
        {modo === 'lista' && <div className="grid grid-cols-4 gap-4">
          {(Object.keys(STATUS) as StatusRenovacao[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(status === s ? 'todos' : s)}
              className={`rounded-xl bg-white p-4 text-left shadow-sm ring-1 transition hover:ring-slate-300 ${
                status === s ? 'ring-2 ring-marca-500 hover:ring-marca-500' : 'ring-slate-200/70'
              }`}
            >
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className={`size-2 rounded-full ${STATUS[s].ponto}`} />
                {STATUS[s].label}
              </div>
              <p className="mt-1 text-3xl font-semibold">{contagem(s)}</p>
            </button>
          ))}
        </div>}

        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200/70">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3">
            <Segmentos opcoes={opcoesRamo} valor={ramo} onChange={setRamo} />
            <Select value={corretor} onChange={setCorretor}>
              <option value="todos">Todos os corretores</option>
              {db.corretores.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </Select>
            {modo === 'lista' && status !== 'todos' && (
              <button onClick={() => setStatus('todos')} className="text-sm text-marca-600 hover:underline">
                Limpar filtro “{STATUS[status].label}”
              </button>
            )}
            <div className="ml-auto">
              <Segmentos
                valor={modo}
                onChange={setModo}
                opcoes={[{ valor: 'lista', label: 'Lista' }, { valor: 'kanban', label: 'Kanban' }]}
              />
            </div>
            <label className="flex w-64 items-center gap-2 rounded-lg px-3 py-2 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-marca-500">
              <Search className="size-4 text-slate-400" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar segurado"
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </label>
          </div>

          {modo === 'kanban' ? (
            <div className="bg-white p-4">
              <KanbanRenovacoes itens={doMes} onAbrir={setAberta} />
            </div>
          ) : lista.length === 0 ? (
            <div className="p-6"><Vazio>Nenhuma renovação com esses filtros.</Vazio></div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className={TH}>Vencimento</th>
                  <th className={TH}>Segurado</th>
                  <th className={TH}>Ramo</th>
                  <th className={TH}>Seguradora</th>
                  <th className={TH}>Corretor</th>
                  <th className={TH}>Status</th>
                  <th className={TH}>Prazo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lista.map(({ r, seguro, cliente }) => {
                  const aberto = r.status === 'pendente' || r.status === 'cotando'
                  const urgente = aberto && diasAte(r.vencimento) <= 7
                  return (
                    <tr key={r.id} onClick={() => setAberta(r.id)} className="cursor-pointer hover:bg-marca-50/50">
                      <td className={`${TD} whitespace-nowrap font-medium tabular-nums`}>{fmtData(r.vencimento)}</td>
                      <td className={`${TD} font-medium`}>{cliente.nome}</td>
                      <td className={TD}><RamoBadge ramo={seguro.ramo} /></td>
                      <td className={`${TD} text-slate-600`}>{ix.seguradora.get(seguro.seguradoraId)?.nome}</td>
                      <td className={`${TD} text-slate-600`}>{ix.corretor.get(r.corretorId)?.nome}</td>
                      <td className={TD}><StatusBadge status={r.status} /></td>
                      <td className={`${TD} whitespace-nowrap ${urgente ? 'font-medium text-rose-600' : 'text-slate-400'}`}>
                        {aberto ? prazoLabel(r.vencimento) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          <div className="border-t border-slate-200 px-4 py-2.5 text-xs text-slate-500">
            {modo === 'kanban'
              ? `${doMes.length} renovações · arraste os blocos entre as colunas para mudar o andamento`
              : `${lista.length} de ${doMes.length} renovações · clique numa linha para atualizar o andamento`}
          </div>
        </div>
      </div>

      <RenovacaoSheet id={aberta} onFechar={() => setAberta(null)} />
    </>
  )
}
