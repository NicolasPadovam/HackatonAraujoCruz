import { ArrowRight, MessageCircle, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { StatusRenovacao } from '../domain/types'
import { useIndices, useStore } from '../data/store'
import { fmtData, fmtMoeda, fmtPct, prazoLabel } from '../lib/format'
import { RamoBadge, STATUS, Sheet } from './ui'

const ORDEM: StatusRenovacao[] = ['pendente', 'cotando', 'renovada', 'nao_renovada']

export function RenovacaoSheet({ id, onFechar }: { id: string | null; onFechar: () => void }) {
  const { db, atualizarRenovacao } = useStore()
  const ix = useIndices()
  const ren = id ? db.renovacoes.find((r) => r.id === id) : undefined
  const seguro = ren ? ix.seguro.get(ren.seguroId) : undefined
  const cliente = seguro ? ix.cliente.get(seguro.clienteId) : undefined

  if (!ren || !seguro || !cliente) return <Sheet aberto={false} onFechar={onFechar} titulo="">{null}</Sheet>

  const seguradora = ix.seguradora.get(seguro.seguradoraId)
  const cotacoes = db.cotacoes.filter((c) => c.renovacaoId === ren.id)
  const trocou = ren.seguradoraFechadaId && ren.seguradoraFechadaId !== seguro.seguradoraId

  const mudarStatus = (status: StatusRenovacao) =>
    atualizarRenovacao(ren.id, {
      status,
      cotada: status !== 'pendente' ? true : ren.cotada,
      seguradoraFechadaId: status === 'renovada' ? ren.seguradoraFechadaId ?? seguro.seguradoraId : undefined,
    })

  return (
    <Sheet aberto onFechar={onFechar} titulo={cliente.nome}>
      <div className="space-y-5 pb-2">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <RamoBadge ramo={seguro.ramo} />
          <span>{seguradora?.nome}</span>
          <span>·</span>
          <span>Vence {fmtData(ren.vencimento)}</span>
          <span className="text-slate-400">({prazoLabel(ren.vencimento)})</span>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Andamento</p>
          <div className="grid grid-cols-2 gap-2">
            {ORDEM.map((s) => {
              const ativo = ren.status === s
              return (
                <button
                  key={s}
                  onClick={() => mudarStatus(s)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-3 text-left text-sm font-medium ring-1 transition ${
                    ativo ? `${STATUS[s].classe} ring-2` : 'bg-white text-slate-700 ring-slate-200'
                  }`}
                >
                  <span className={`size-2.5 rounded-full ${STATUS[s].ponto}`} />
                  {STATUS[s].label}
                </button>
              )
            })}
          </div>
        </div>

        {ren.status === 'renovada' && (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Fechou com</span>
            <select
              value={ren.seguradoraFechadaId ?? seguro.seguradoraId}
              onChange={(e) => atualizarRenovacao(ren.id, { seguradoraFechadaId: e.target.value })}
              className="w-full rounded-xl border-0 bg-slate-50 px-3 py-3 text-sm ring-1 ring-slate-200"
            >
              {db.seguradoras.map((s) => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
            {trocou && (
              <span className="mt-1 flex items-center gap-1 text-xs text-violet-700">
                Trocou de seguradora: {seguradora?.nome} <ArrowRight className="size-3" />
                {ix.seguradora.get(ren.seguradoraFechadaId!)?.nome}
              </span>
            )}
          </label>
        )}

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Corretor responsável</span>
          <select
            value={ren.corretorId}
            onChange={(e) => atualizarRenovacao(ren.id, { corretorId: e.target.value })}
            className="w-full rounded-xl border-0 bg-slate-50 px-3 py-3 text-sm ring-1 ring-slate-200"
          >
            {db.corretores.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </label>

        <dl className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center text-xs">
          <div><dt className="text-slate-500">Prêmio</dt><dd className="font-semibold">{fmtMoeda(seguro.premioLiquido)}</dd></div>
          <div><dt className="text-slate-500">Comissão</dt><dd className="font-semibold">{fmtPct(seguro.comissaoPct)}</dd></div>
          <div><dt className="text-slate-500">Parcelas</dt><dd className="font-semibold">{seguro.parcelas ? `${seguro.parcelas}x ${fmtMoeda(seguro.valorParcela)}` : '—'}</dd></div>
        </dl>

        {cotacoes.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Cotações desta renovação</p>
            <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
              {cotacoes.map((c) => (
                <li key={c.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>{ix.seguradora.get(c.seguradoraId)?.nome}</span>
                  <span className="font-medium">{fmtMoeda(c.premio)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Link
            to={`/clientes/${cliente.id}`}
            onClick={onFechar}
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-100 py-3 text-sm font-medium text-slate-800"
          >
            <User className="size-4" /> Ver cliente
          </Link>
          <button
            disabled={!cliente.telefone}
            onClick={() => alert('Protótipo: aqui abriria o WhatsApp do cliente.')}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-medium text-white disabled:bg-slate-200 disabled:text-slate-400"
          >
            <MessageCircle className="size-4" /> {cliente.telefone ? 'WhatsApp' : 'Sem telefone'}
          </button>
        </div>
      </div>
    </Sheet>
  )
}
