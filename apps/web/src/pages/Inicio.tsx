import { useMemo, useState } from 'react'
import { RenovacaoSheet } from '../components/RenovacaoSheet'
import { FAIXA, PageHeader, RamoBadge, StatusBadge, TD, TH, Vazio } from '../components/ui'
import type { FaixaVencimento } from '../lib/format'
import { useIndices, useStore } from '../data/store'
import { DIAS_ALERTA, faixaVencimento, fmtData, prazoLabel } from '../lib/format'

const FAIXAS: FaixaVencimento[] = ['urgente', 'atencao', 'proxima']

export default function Inicio() {
  const { db } = useStore()
  const ix = useIndices()
  const [aberta, setAberta] = useState<string | null>(null)

  const lista = useMemo(
    () =>
      db.renovacoes
        .filter((r) => r.status === 'pendente' || r.status === 'cotando')
        .map((r) => ({ r, faixa: faixaVencimento(r.vencimento) }))
        .filter((x): x is typeof x & { faixa: FaixaVencimento } => x.faixa != null)
        .map(({ r, faixa }) => {
          const seguro = ix.seguro.get(r.seguroId)!
          return { r, faixa, seguro, cliente: ix.cliente.get(seguro.clienteId)! }
        })
        .sort((a, b) => a.r.vencimento.localeCompare(b.r.vencimento)),
    [db.renovacoes, ix],
  )

  const contagem = (f: FaixaVencimento) => lista.filter((x) => x.faixa === f).length

  return (
    <>
      <PageHeader
        titulo="Início"
        subtitulo={`Renovações em aberto vencendo nos próximos ${DIAS_ALERTA} dias ou já vencidas`}
      />

      <div className="space-y-6 px-8 py-6">
        <div className="grid grid-cols-3 gap-4">
          {FAIXAS.map((f) => (
            <div key={f} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className={`size-2 rounded-full ${FAIXA[f].ponto}`} />
                {FAIXA[f].label}
              </div>
              <p className={`mt-1 text-3xl font-semibold ${contagem(f) > 0 && f !== 'proxima' ? FAIXA[f].texto : ''}`}>{contagem(f)}</p>
              <p className="text-xs text-slate-500">{FAIXA[f].descricao}</p>
            </div>
          ))}
        </div>

        {lista.length === 0 ? (
          <Vazio>Nenhuma renovação vencendo nos próximos {DIAS_ALERTA} dias.</Vazio>
        ) : (
          <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200/70">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className={TH}>Prazo</th>
                  <th className={TH}>Vencimento</th>
                  <th className={TH}>Segurado</th>
                  <th className={TH}>Ramo</th>
                  <th className={TH}>Seguradora</th>
                  <th className={TH}>Corretor</th>
                  <th className={TH}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lista.map(({ r, faixa, seguro, cliente }) => (
                  <tr key={r.id} onClick={() => setAberta(r.id)} className={`cursor-pointer ${FAIXA[faixa].linha}`}>
                    <td className={`${TD} whitespace-nowrap`}>
                      <span className={`inline-flex items-center gap-2 ${FAIXA[faixa].texto}`}>
                        <span className={`size-2 rounded-full ${FAIXA[faixa].ponto}`} />
                        {prazoLabel(r.vencimento)}
                      </span>
                    </td>
                    <td className={`${TD} whitespace-nowrap tabular-nums text-slate-600`}>{fmtData(r.vencimento)}</td>
                    <td className={`${TD} font-medium`}>{cliente.nome}</td>
                    <td className={TD}><RamoBadge ramo={seguro.ramo} /></td>
                    <td className={`${TD} text-slate-600`}>{ix.seguradora.get(seguro.seguradoraId)?.nome}</td>
                    <td className={`${TD} text-slate-600`}>{ix.corretor.get(r.corretorId ?? '')?.nome ?? '—'}</td>
                    <td className={TD}><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-slate-200 px-4 py-2.5 text-xs text-slate-500">
              {lista.length} renovações em aberto · clique numa linha para atualizar o andamento
            </div>
          </div>
        )}
      </div>

      <RenovacaoSheet id={aberta} onFechar={() => setAberta(null)} />
    </>
  )
}
