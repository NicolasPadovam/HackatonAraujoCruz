import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { BarrasH, ColunasEmpilhadas, Funil, Legenda } from '../../components/graficos'
import { Card, FAIXA, RAMO, RamoBadge, STATUS, Secao, StatusBadge, TD, TH, Vazio } from '../../components/ui'
import type { Ramo, StatusRenovacao } from '../../domain/types'
import { useIndices, useStore } from '../../data/store'
import { faixaVencimento, fmtData, fmtDataCurta, iniciais, prazoLabel } from '../../lib/format'
import { type Periodo, cargaPorCorretor, filaDeAcao, funilDoPeriodo, perdas, vencimentosPorSemana } from '../../lib/metricas'

const HEX: Record<StatusRenovacao, string> = {
  pendente: '#f59e0b',
  cotando: '#0ea5e9',
  renovada: '#10b981',
  nao_renovada: '#f43f5e',
}
const ORDEM_STATUS: StatusRenovacao[] = ['pendente', 'cotando', 'renovada', 'nao_renovada']
const LIMITE_FILA = 15

export default function RenovacoesAba({ periodo }: { periodo: Periodo }) {
  const { db } = useStore()
  const ix = useIndices()

  const funil = useMemo(() => funilDoPeriodo(db, periodo.meses), [db, periodo.meses])
  const semanas = useMemo(() => vencimentosPorSemana(db), [db])
  const fila = useMemo(() => filaDeAcao(db), [db])
  const carga = useMemo(() => cargaPorCorretor(db, 30), [db])
  const perdasRamo = useMemo(() => perdas(db, periodo.meses, (s) => s.ramo), [db, periodo.meses])
  const perdasSeg = useMemo(() => perdas(db, periodo.meses, (s) => s.seguradoraId), [db, periodo.meses])

  const colunas = semanas.map((s) => ({
    label: s.inicio ? fmtDataCurta(s.inicio) : 'Atrasadas',
    destaque: s.inicio === null && s.total > 0,
    partes: ORDEM_STATUS.map((st) => ({ label: STATUS[st].label, valor: s.contagem[st], cor: HEX[st] })),
  }))
  const legendaStatus = ORDEM_STATUS.map((st) => ({ label: STATUS[st].label, cor: HEX[st] }))
  const maiorCarga = Math.max(1, ...carga.map((c) => c.total))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 items-start gap-6">
        <Secao titulo={`Funil de renovação · ${periodo.rotulo}`}>
          <Card className="space-y-4">
            <Funil
              etapas={[
                { label: periodo.mes ? 'Vencem no mês' : 'Vencem no ano', valor: funil.total, cor: '#94a3b8' },
                { label: 'Cotadas', valor: funil.cotadas, cor: HEX.cotando },
                { label: 'Fechadas', valor: funil.fechadas, cor: '#6366f1' },
                { label: 'Renovadas', valor: funil.renovadas, cor: HEX.renovada },
              ]}
            />
            <p className="text-xs text-slate-500">
              A porcentagem é a conversão em relação à etapa anterior. Paradas no momento:{' '}
              <span className="font-medium text-amber-700">{funil.pendentes} pendentes</span> (sem cotação) e{' '}
              <span className="font-medium text-sky-700">{funil.cotando} cotando</span>. Perdidas:{' '}
              <span className="font-medium text-rose-700">{funil.naoRenovadas}</span>.
            </p>
          </Card>
        </Secao>

        <Secao titulo="Carga por corretor · em aberto até 30 dias (hoje)">
          <Card className="space-y-4">
            <BarrasH
              max={maiorCarga}
              linhas={carga.map((c) => ({
                label: ix.corretor.get(c.corretorId)?.nome ?? c.corretorId,
                valor: c.total,
                detalhe: `${c.total} (${c.pendente} pendentes · ${c.cotando} cotando)`,
              }))}
            />
            <p className="text-xs text-slate-500">Inclui as que já venceram e continuam em aberto.</p>
          </Card>
        </Secao>
      </div>

      <Secao titulo="Vencimentos nas próximas 13 semanas">
        <Card className="space-y-3">
          <Legenda itens={legendaStatus} />
          <ColunasEmpilhadas colunas={colunas} />
          <p className="text-xs text-slate-500">Cada coluna é uma semana a partir da data indicada. “Atrasadas” são as vencidas que seguem em aberto.</p>
        </Card>
      </Secao>

      <Secao titulo={`Fila de ação · ${fila.length} em aberto`}>
        {fila.length === 0 ? (
          <Vazio>Nada em aberto. Todas as renovações foram resolvidas.</Vazio>
        ) : (
          <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200/70">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className={TH}>Cliente</th><th className={TH}>Ramo</th><th className={TH}>Vencimento</th>
                  <th className={TH}>Prazo</th><th className={TH}>Corretor</th><th className={TH}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fila.slice(0, LIMITE_FILA).map((r) => {
                  const s = ix.seguro.get(r.seguroId)
                  const cliente = s ? ix.cliente.get(s.clienteId) : undefined
                  const faixa = faixaVencimento(r.vencimento)
                  return (
                    <tr key={r.id} className={faixa ? FAIXA[faixa].linha : 'hover:bg-slate-50'}>
                      <td className={`${TD} font-medium`}>
                        {cliente ? <Link to={`/clientes/${cliente.id}`} className="hover:text-marca-600 hover:underline">{cliente.nome}</Link> : '—'}
                      </td>
                      <td className={TD}>{s && <RamoBadge ramo={s.ramo} />}</td>
                      <td className={`${TD} tabular-nums`}>{fmtData(r.vencimento)}</td>
                      <td className={`${TD} ${faixa ? FAIXA[faixa].texto : 'text-slate-500'}`}>
                        {prazoLabel(r.vencimento)}
                      </td>
                      <td className={TD}>{iniciais(ix.corretor.get(r.corretorId)?.nome ?? '—')}</td>
                      <td className={TD}><StatusBadge status={r.status} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {fila.length > LIMITE_FILA && (
              <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
                Mostrando as {LIMITE_FILA} mais urgentes de {fila.length}. A lista completa está em Renovações.
              </p>
            )}
          </div>
        )}
      </Secao>

      <div className="grid grid-cols-2 items-start gap-6">
        <Secao titulo={`Perdidas por ramo · ${periodo.rotulo}`}>
          <Card>
            {perdasRamo.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma renovação perdida no período.</p>
            ) : (
              <BarrasH
                cor="#f43f5e"
                linhas={perdasRamo.map((p) => ({
                  label: RAMO[p.chave as Ramo]?.label ?? p.chave,
                  valor: p.perdidas,
                  detalhe: `${p.perdidas} de ${p.fechadas} · ${p.taxa}%`,
                }))}
              />
            )}
          </Card>
        </Secao>
        <Secao titulo={`Perdidas por seguradora · ${periodo.rotulo}`}>
          <Card>
            {perdasSeg.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma renovação perdida no período.</p>
            ) : (
              <BarrasH
                cor="#f43f5e"
                linhas={perdasSeg.map((p) => ({
                  label: ix.seguradora.get(p.chave)?.nome ?? p.chave,
                  valor: p.perdidas,
                  detalhe: `${p.perdidas} de ${p.fechadas} · ${p.taxa}%`,
                }))}
              />
            )}
            <p className="mt-3 text-xs text-slate-500">Seguradora do seguro que venceu. A % é de não renovadas entre as fechadas.</p>
          </Card>
        </Secao>
      </div>
    </div>
  )
}
