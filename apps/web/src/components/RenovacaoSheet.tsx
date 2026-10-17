import { ArrowRight, MessageCircle, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { StatusRenovacao } from '../domain/types'
import { useIndices, useStore } from '../data/store'
import { fmtData, fmtMoeda, fmtPct, prazoLabel } from '../lib/format'
import { Drawer, RamoBadge, STATUS, Select } from './ui'

const ORDEM: StatusRenovacao[] = ['pendente', 'cotando', 'renovada', 'nao_renovada']

export function RenovacaoSheet({ id, onFechar }: { id: string | null; onFechar: () => void }) {
  const { db, atualizarRenovacao } = useStore()
  const ix = useIndices()
  const ren = id ? db.renovacoes.find((r) => r.id === id) : undefined
  const seguro = ren ? ix.seguro.get(ren.seguroId) : undefined
  const cliente = seguro ? ix.cliente.get(seguro.clienteId) : undefined

  if (!ren || !seguro || !cliente) return null

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
    <Drawer aberto onFechar={onFechar} titulo={cliente.nome}>
      <div className="space-y-6">
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
                  className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium ring-1 transition ${
                    ativo ? `${STATUS[s].classe} ring-2` : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className={`size-2.5 rounded-full ${STATUS[s].ponto}`} />
                  {STATUS[s].label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Corretor</span>
            <Select className="w-full" value={ren.corretorId ?? ''} onChange={(v) => atualizarRenovacao(ren.id, { corretorId: v })}>
              {!ren.corretorId && <option value="" disabled>Sem corretor</option>}
              {db.corretores.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </Select>
          </label>
          {ren.status === 'renovada' && (
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Fechou com</span>
              <Select
                className="w-full"
                value={ren.seguradoraFechadaId ?? seguro.seguradoraId}
                onChange={(v) => atualizarRenovacao(ren.id, { seguradoraFechadaId: v })}
              >
                {db.seguradoras.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </Select>
            </label>
          )}
        </div>
        {trocou && (
          <p className="-mt-3 flex items-center gap-1 text-xs text-violet-700">
            Trocou de seguradora: {seguradora?.nome} <ArrowRight className="size-3" />
            {ix.seguradora.get(ren.seguradoraFechadaId!)?.nome}
          </p>
        )}

        <dl className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-4 text-center text-xs">
          <div><dt className="text-slate-500">Prêmio</dt><dd className="mt-0.5 text-sm font-semibold">{fmtMoeda(seguro.premioLiquido)}</dd></div>
          <div><dt className="text-slate-500">Comissão</dt><dd className="mt-0.5 text-sm font-semibold">{fmtPct(seguro.comissaoPct)}</dd></div>
          <div><dt className="text-slate-500">Parcelas</dt><dd className="mt-0.5 text-sm font-semibold">{seguro.parcelas ? `${seguro.parcelas}x ${fmtMoeda(seguro.valorParcela)}` : '—'}</dd></div>
        </dl>

        {cotacoes.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Cotações desta renovação</p>
            <ul className="divide-y divide-slate-100 rounded-lg ring-1 ring-slate-200">
              {cotacoes.map((c) => (
                <li key={c.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>{ix.seguradora.get(c.seguradoraId)?.nome}</span>
                  <span className="font-medium">{fmtMoeda(c.premio)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-2">
          <Link
            to={`/clientes/${cliente.id}`}
            onClick={onFechar}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-100 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-200"
          >
            <User className="size-4" /> Abrir ficha do cliente
          </Link>
          <button
            disabled={!cliente.telefone}
            onClick={() => alert('Protótipo: aqui abriria o WhatsApp Web do cliente.')}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400"
          >
            <MessageCircle className="size-4" /> {cliente.telefone ? 'WhatsApp' : 'Sem telefone'}
          </button>
        </div>
      </div>
    </Drawer>
  )
}
