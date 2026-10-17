import { GripVertical } from 'lucide-react'
import { useState } from 'react'
import type { Cliente, Renovacao, Seguro, StatusRenovacao } from '../domain/types'
import { useIndices, useStore } from '../data/store'
import { STATUS_ORDEM, atividadeDe, exigeCotacao, statusEmAberto, transicaoPermitida } from '../lib/atividades'
import { faixaVencimento, fmtData, prazoLabel } from '../lib/format'
import { FAIXA, RamoBadge, STATUS } from './ui'

export interface ItemKanban {
  r: Renovacao
  seguro: Seguro
  cliente: Cliente
}

export function KanbanRenovacoes({ itens, onAbrir }: { itens: ItemKanban[]; onAbrir: (id: string) => void }) {
  const { avancarRenovacao } = useStore()
  const ix = useIndices()
  const [arrastando, setArrastando] = useState<string | null>(null)
  const [sobre, setSobre] = useState<StatusRenovacao | null>(null)

  const [aviso, setAviso] = useState<string | null>(null)

  const mover = (id: string, para: StatusRenovacao) => {
    const item = itens.find(({ r }) => r.id === id)
    if (!item || item.r.status === para) return
    const de = item.r.status
    setAviso(null)
    if (!transicaoPermitida(de, para)) {
      setAviso(`Não dá para ir de “${STATUS[de].label}” direto para “${STATUS[para].label}”. Abra o cartão para ver o próximo passo.`)
      return
    }
    if (exigeCotacao(de, para)) {
      setAviso('Esta etapa pede o registro da cotação: preencha no painel que abriu.')
      onAbrir(id)
      return
    }
    avancarRenovacao(id, para).catch((e) => setAviso(e instanceof Error ? e.message : String(e)))
  }

  const soltar = (status: StatusRenovacao) => (e: React.DragEvent) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain') || arrastando
    if (id) mover(id, status)
    setArrastando(null)
    setSobre(null)
  }

  return (
    <div className="space-y-3">
      {aviso && (
        <p role="alert" className="flex items-start justify-between gap-3 rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-900 ring-1 ring-amber-200">
          {aviso}
          <button onClick={() => setAviso(null)} className="shrink-0 text-xs font-medium hover:underline">Fechar</button>
        </p>
      )}
    <div className="flex items-start gap-3 overflow-x-auto pb-2">
      {STATUS_ORDEM.map((s) => {
        const cards = itens
          .filter(({ r }) => r.status === s)
          .sort((a, b) => a.r.vencimento.localeCompare(b.r.vencimento))
        const aberto = statusEmAberto(s)
        return (
          <section
            key={s}
            onDragOver={(e) => { e.preventDefault(); setSobre(s) }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setSobre(null) }}
            onDrop={soltar(s)}
            className={`flex min-h-64 w-64 shrink-0 flex-col rounded-xl bg-slate-100/70 p-3 ring-2 transition ${
              sobre === s && arrastando ? 'ring-marca-500 bg-marca-50/60' : 'ring-transparent'
            }`}
          >
            <header className="mb-3 flex items-center gap-2 px-1 text-sm font-medium text-slate-700">
              <span className={`size-2 rounded-full ${STATUS[s].ponto}`} />
              {STATUS[s].label}
              <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs text-slate-500 ring-1 ring-slate-200">{cards.length}</span>
            </header>
            <ul className="space-y-2">
              {cards.map(({ r, seguro, cliente }) => {
                const faixa = aberto ? faixaVencimento(r.vencimento) : null
                const atividade = atividadeDe(r)
                return (
                  <li
                    key={r.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', r.id)
                      e.dataTransfer.effectAllowed = 'move'
                      setArrastando(r.id)
                    }}
                    onDragEnd={() => { setArrastando(null); setSobre(null) }}
                    onClick={() => onAbrir(r.id)}
                    className={`cursor-grab rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-200/80 transition hover:ring-slate-300 active:cursor-grabbing ${
                      arrastando === r.id ? 'opacity-40' : ''
                    }`}
                  >
                    <div className="flex items-start gap-1">
                      <p className="flex-1 text-sm font-medium leading-snug">{cliente.nome}</p>
                      <GripVertical className="size-4 shrink-0 text-slate-300" />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                      <RamoBadge ramo={seguro.ramo} compacto />
                      <span>{ix.seguradora.get(seguro.seguradoraId)?.nome}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="tabular-nums text-slate-500">Vence {fmtData(r.vencimento)}</span>
                      {aberto && (
                        <span className={faixa ? FAIXA[faixa].texto : 'text-slate-400'}>{prazoLabel(r.vencimento)}</span>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs text-slate-400">
                      {ix.corretor.get(r.corretorId)?.nome}
                      {atividade && <span className="text-marca-600"> · {atividade.texto}</span>}
                    </p>
                  </li>
                )
              })}
            </ul>
            {cards.length === 0 && (
              <p className="px-2 py-6 text-center text-xs text-slate-400">Arraste um bloco para cá</p>
            )}
          </section>
        )
      })}
    </div>
    </div>
  )
}
