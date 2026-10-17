import { GripVertical } from 'lucide-react'
import { useState } from 'react'
import type { Cliente, Renovacao, Seguro, StatusRenovacao } from '../domain/types'
import { useIndices, useStore } from '../data/store'
import { diasAte, fmtData, prazoLabel } from '../lib/format'
import { RamoBadge, STATUS } from './ui'

const COLUNAS: StatusRenovacao[] = ['pendente', 'cotando', 'renovada', 'nao_renovada']

export interface ItemKanban {
  r: Renovacao
  seguro: Seguro
  cliente: Cliente
}

export function KanbanRenovacoes({ itens, onAbrir }: { itens: ItemKanban[]; onAbrir: (id: string) => void }) {
  const { atualizarRenovacao } = useStore()
  const ix = useIndices()
  const [arrastando, setArrastando] = useState<string | null>(null)
  const [sobre, setSobre] = useState<StatusRenovacao | null>(null)

  const mover = (id: string, status: StatusRenovacao) => {
    const item = itens.find(({ r }) => r.id === id)
    if (!item || item.r.status === status) return
    const { r, seguro } = item
    atualizarRenovacao(id, {
      status,
      cotada: status !== 'pendente' ? true : r.cotada,
      seguradoraFechadaId: status === 'renovada' ? r.seguradoraFechadaId ?? seguro.seguradoraId : undefined,
    })
  }

  const soltar = (status: StatusRenovacao) => (e: React.DragEvent) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain') || arrastando
    if (id) mover(id, status)
    setArrastando(null)
    setSobre(null)
  }

  return (
    <div className="grid grid-cols-4 items-start gap-4">
      {COLUNAS.map((s) => {
        const cards = itens
          .filter(({ r }) => r.status === s)
          .sort((a, b) => a.r.vencimento.localeCompare(b.r.vencimento))
        const aberto = s === 'pendente' || s === 'cotando'
        return (
          <section
            key={s}
            onDragOver={(e) => { e.preventDefault(); setSobre(s) }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setSobre(null) }}
            onDrop={soltar(s)}
            className={`flex min-h-64 flex-col rounded-xl bg-slate-100/70 p-3 ring-2 transition ${
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
                const urgente = aberto && diasAte(r.vencimento) <= 7
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
                        <span className={urgente ? 'font-medium text-rose-600' : 'text-slate-400'}>{prazoLabel(r.vencimento)}</span>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs text-slate-400">{ix.corretor.get(r.corretorId)?.nome}</p>
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
  )
}
