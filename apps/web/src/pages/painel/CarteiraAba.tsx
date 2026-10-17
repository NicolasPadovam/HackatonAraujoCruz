import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { BarrasDivergentes, BarrasH, Legenda, Linhas, Rosca, cor } from '../../components/graficos'
import { Card, RAMO, Secao } from '../../components/ui'
import type { Ramo } from '../../domain/types'
import { useIndices, useStore } from '../../data/store'
import { mesLabel } from '../../lib/format'
import {
  type Periodo, clientesPorQtdSeguros, evolucaoDaCarteira, mixDaCarteira, trocasEntreSeguradoras, vendaCruzada,
} from '../../lib/metricas'

const MAX_NOMES = 8

function ListaClientes({ ids, vazio }: { ids: string[]; vazio: string }) {
  const ix = useIndices()
  if (ids.length === 0) return <p className="text-sm text-slate-500">{vazio}</p>
  const nomes = ids
    .map((id) => ix.cliente.get(id))
    .filter((c): c is NonNullable<typeof c> => !!c)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  return (
    <ul className="space-y-1 text-sm">
      {nomes.slice(0, MAX_NOMES).map((c) => (
        <li key={c.id}><Link to={`/clientes/${c.id}`} className="hover:text-marca-600 hover:underline">{c.nome}</Link></li>
      ))}
      {nomes.length > MAX_NOMES && <li className="text-xs text-slate-500">e mais {nomes.length - MAX_NOMES}…</li>}
    </ul>
  )
}

export default function CarteiraAba({ periodo }: { periodo: Periodo }) {
  const { db } = useStore()
  const ix = useIndices()

  const qtd = useMemo(() => clientesPorQtdSeguros(db), [db])
  const mixRamo = useMemo(() => mixDaCarteira(db, (s) => s.ramo), [db])
  const mixSeg = useMemo(() => mixDaCarteira(db, (s) => s.seguradoraId), [db])
  const cruzada = useMemo(() => vendaCruzada(db), [db])
  const evolucao = useMemo(() => evolucaoDaCarteira(db, periodo.meses), [db, periodo.meses])
  const trocas = useMemo(() => trocasEntreSeguradoras(db, periodo.meses), [db, periodo.meses])

  const nomeSeg = (id: string) => ix.seguradora.get(id)?.nome ?? id
  const totalClientes = qtd.um + qtd.dois + qtd.tresOuMais
  const maxFluxo = Math.max(1, ...trocas.fluxo.values())

  // A matriz só traz seguradoras que participaram de alguma troca.
  const envolvidas = [...new Set([...trocas.fluxo.keys()].flatMap((k) => k.split('|')))].sort((a, b) =>
    nomeSeg(a).localeCompare(nomeSeg(b), 'pt-BR'),
  )

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 items-start gap-6">
        <Secao titulo="Clientes por nº de seguros ativos">
          <Card className="space-y-4">
            <BarrasH
              max={Math.max(1, totalClientes)}
              linhas={[
                { label: '1 seguro', valor: qtd.um, detalhe: `${qtd.um} · ${totalClientes ? Math.round((qtd.um / totalClientes) * 100) : 0}%`, cor: '#94a3b8' },
                { label: '2 seguros', valor: qtd.dois, detalhe: `${qtd.dois}`, cor: '#3b63d9' },
                { label: '3 ou mais', valor: qtd.tresOuMais, detalhe: `${qtd.tresOuMais}`, cor: '#1e3a8a' },
              ]}
            />
            <p className="text-xs text-slate-500">Quem tem um só seguro é o público natural para oferecer outro ramo.</p>
          </Card>
        </Secao>
        <Secao titulo="Seguros ativos por ramo">
          <Card>
            <Rosca
              fatias={mixRamo.map((m, i) => ({ label: RAMO[m.chave as Ramo]?.label ?? m.chave, valor: m.valor, cor: cor(i) }))}
              centro={<div><p className="text-xl font-semibold">{mixRamo.reduce((t, m) => t + m.valor, 0)}</p><p className="text-[11px] text-slate-500">seguros</p></div>}
            />
          </Card>
        </Secao>
        <Secao titulo="Seguros ativos por seguradora">
          <Card>
            <Rosca
              fatias={mixSeg.map((m, i) => ({ label: nomeSeg(m.chave), valor: m.valor, cor: cor(i) }))}
              centro={<div><p className="text-xl font-semibold">{mixSeg.length}</p><p className="text-[11px] text-slate-500">seguradoras</p></div>}
            />
          </Card>
        </Secao>
      </div>

      <Secao titulo="Oportunidades de venda cruzada">
        <div className="grid grid-cols-2 gap-6">
          <Card className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h3 className="font-medium">Têm auto, sem residencial</h3>
              <span className="text-2xl font-semibold">{cruzada.semResidencial.length}</span>
            </div>
            <ListaClientes ids={cruzada.semResidencial} vazio="Nenhum cliente nessa situação." />
          </Card>
          <Card className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h3 className="font-medium">Têm residencial, sem auto</h3>
              <span className="text-2xl font-semibold">{cruzada.semAuto.length}</span>
            </div>
            <ListaClientes ids={cruzada.semAuto} vazio="Nenhum cliente nessa situação." />
          </Card>
        </div>
      </Secao>

      <Secao titulo={`Evolução da carteira · ${periodo.ano}`}>
        <Card className="space-y-3">
          <Legenda itens={[{ label: 'Clientes com seguro vigente', cor: '#3b63d9' }, { label: 'Seguros vigentes', cor: '#0d9488' }]} />
          <Linhas
            rotulos={evolucao.map((p) => mesLabel(p.mes, true).slice(0, 3))}
            series={[
              { nome: 'Clientes', cor: '#3b63d9', valores: evolucao.map((p) => p.clientes) },
              { nome: 'Seguros', cor: '#0d9488', valores: evolucao.map((p) => p.seguros) },
            ]}
          />
          <p className="text-xs text-slate-500">
            Calculado pelas vigências dos seguros no fim de cada mês; meses que ainda não chegaram ficam sem ponto. Só reflete o que já foi importado: meses antigos
            podem parecer menores por falta de histórico, não por perda de clientes.
          </p>
        </Card>
      </Secao>

      <Secao titulo={`Movimento entre seguradoras · ${periodo.ano}`}>
        {trocas.total === 0 ? (
          <Card><p className="text-sm text-slate-500">Nenhuma troca de seguradora registrada no período.</p></Card>
        ) : (
          <div className="grid grid-cols-2 items-start gap-6">
            <Card className="space-y-3">
              <h3 className="font-medium">Saldo de renovações por seguradora</h3>
              <BarrasDivergentes
                linhas={trocas.saldo.map((s) => ({
                  label: nomeSeg(s.seguradoraId),
                  valor: s.saldo,
                  detalhe: `+${s.ganhou} / −${s.perdeu}`,
                }))}
              />
              <p className="text-xs text-slate-500">Ganhou = clientes que chegaram; perdeu = clientes que saíram. {trocas.total} trocas no total.</p>
            </Card>
            <Card className="space-y-3 overflow-x-auto">
              <h3 className="font-medium">Fluxo: de onde saem e para onde vão</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="pb-2 text-left text-xs font-medium text-slate-500">de ↓ · para →</th>
                    {envolvidas.map((id) => (
                      <th key={id} className="px-1 pb-2 text-center text-xs font-medium text-slate-500">{nomeSeg(id)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {envolvidas.map((de) => (
                    <tr key={de}>
                      <th className="py-1 pr-2 text-left text-xs font-medium text-slate-600">{nomeSeg(de)}</th>
                      {envolvidas.map((para) => {
                        const n = trocas.fluxo.get(`${de}|${para}`) ?? 0
                        return (
                          <td key={para} className="p-0.5 text-center">
                            {de === para ? (
                              <span className="text-slate-300">·</span>
                            ) : (
                              <span
                                className="grid h-8 place-items-center rounded text-xs font-medium tabular-nums"
                                style={{
                                  background: n ? `rgba(59, 99, 217, ${0.12 + (n / maxFluxo) * 0.7})` : 'transparent',
                                  color: n && n / maxFluxo > 0.55 ? 'white' : '#334155',
                                }}
                                title={n ? `${nomeSeg(de)} → ${nomeSeg(para)}: ${n}` : undefined}
                              >
                                {n || ''}
                              </span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}
      </Secao>
    </div>
  )
}
