import { CheckCircle2, Circle, Upload } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSessao } from '../auth/AuthGate'
import { RenovacaoSheet } from '../components/RenovacaoSheet'
import { FAIXA, PageHeader, RamoBadge, Segmentos, StatusBadge, TD, TH, Vazio } from '../components/ui'
import type { Funcao, Seguradora } from '../domain/types'
import type { FaixaVencimento } from '../lib/format'
import { useIndices, useStore } from '../data/store'
import { FUNCAO_LABEL, atividadeDe, faseDoCiclo, mesAlvoDoCiclo } from '../lib/atividades'
import { DIAS_ALERTA, faixaVencimento, fmtData, hojeIso, mesLabel, prazoLabel } from '../lib/format'
import { portalSeguradora } from '../lib/portais'

const FAIXAS: FaixaVencimento[] = ['urgente', 'atencao', 'proxima']

type Filtro = Funcao | 'todas'

/** Aviso do ciclo de importação (dias 10 a 20): uma linha por seguradora parceira. */
function AvisoImportacao() {
  const { db } = useStore()
  const hoje = hojeIso()
  const fase = faseDoCiclo(hoje)
  const mes = mesAlvoDoCiclo(hoje)

  const linhas = useMemo(() => {
    const feitas = new Set(db.importacoes.filter((i) => i.mesReferencia === mes && i.seguradoraId).map((i) => i.seguradoraId))
    return db.seguradoras
      .filter((s) => s.ativa !== false)
      .map((s) => ({ s, feita: feitas.has(s.id) }))
      .sort((a, b) => Number(a.feita) - Number(b.feita) || a.s.nome.localeCompare(b.s.nome, 'pt-BR'))
  }, [db.importacoes, db.seguradoras, mes])

  if (fase === 'antes') return null
  const faltam = linhas.filter((l) => !l.feita).length
  if (fase === 'atrasado' && faltam === 0) return null

  const atrasado = fase === 'atrasado'
  return (
    <section className={`rounded-xl p-5 shadow-sm ring-1 ${atrasado ? 'bg-rose-50/70 ring-rose-200' : 'bg-white ring-slate-200/70'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <Upload className="size-4 text-marca-600" />
            Importar as renovações de {mesLabel(mes)}
          </h2>
          <p className={`text-sm ${atrasado ? 'text-rose-700' : 'text-slate-500'}`}>
            {atrasado
              ? `O prazo (dia 20) passou: ${faltam} ${faltam === 1 ? 'seguradora ainda não foi importada' : 'seguradoras ainda não foram importadas'}.`
              : `Ciclo de importação (dias 10 a 20): ${linhas.length - faltam} de ${linhas.length} seguradoras importadas.`}
          </p>
        </div>
        <Link to="/importar" className="rounded-lg bg-marca-700 px-4 py-2 text-sm font-semibold text-white hover:bg-marca-600">
          Importar planilha
        </Link>
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm md:grid-cols-3 lg:grid-cols-4">
        {linhas.map(({ s, feita }) => (
          <li key={s.id} className="flex items-center gap-2">
            {feita ? <CheckCircle2 className="size-4 text-emerald-600" /> : <Circle className={`size-4 ${atrasado ? 'text-rose-400' : 'text-slate-300'}`} />}
            <span className={feita ? 'text-slate-500' : 'font-medium'}>{s.nome}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function Inicio() {
  const { db } = useStore()
  const ix = useIndices()
  const { funcao, acesso } = useSessao()
  const ehAdmin = acesso === 'administrador'
  const [filtroAdmin, setFiltroAdmin] = useState<Filtro>('todas')
  const [aberta, setAberta] = useState<string | null>(null)

  // Administrador vê as duas funções (com filtro); as demais só veem a própria.
  const filtro: Filtro = ehAdmin ? filtroAdmin : funcao
  const mostraAviso = filtro === 'todas' || filtro === 'administrativo'

  const lista = useMemo(
    () =>
      db.renovacoes
        .map((r) => ({ r, atividade: atividadeDe(r) }))
        .filter((x): x is typeof x & { atividade: NonNullable<typeof x.atividade> } => x.atividade != null)
        .filter((x) => filtro === 'todas' || x.atividade.funcao === filtro)
        .map(({ r, atividade }) => {
          const seguro = ix.seguro.get(r.seguroId)!
          return { r, atividade, faixa: faixaVencimento(r.vencimento), seguro, cliente: ix.cliente.get(seguro.clienteId)! }
        })
        .sort((a, b) => a.r.vencimento.localeCompare(b.r.vencimento)),
    [db.renovacoes, ix, filtro],
  )

  const contagem = (f: FaixaVencimento) => lista.filter((x) => x.faixa === f).length
  const demais = lista.filter((x) => x.faixa == null).length

  return (
    <>
      <PageHeader
        titulo="Minhas atividades"
        subtitulo={
          filtro === 'todas'
            ? 'Atividades pendentes do Administrativo e da Corretora'
            : `Atividades pendentes · ${FUNCAO_LABEL[filtro]}`
        }
        direita={
          ehAdmin ? (
            <Segmentos
              valor={filtroAdmin}
              onChange={setFiltroAdmin}
              opcoes={[
                { valor: 'todas', label: 'Todas' },
                { valor: 'administrativo', label: 'Administrativo' },
                { valor: 'corretora', label: 'Corretora' },
              ]}
            />
          ) : undefined
        }
      />

      <div className="space-y-6 px-8 py-6">
        {mostraAviso && <AvisoImportacao />}

        <div className="grid grid-cols-4 gap-4">
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
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="size-2 rounded-full bg-slate-200" />
              Mais adiante
            </div>
            <p className="mt-1 text-3xl font-semibold">{demais}</p>
            <p className="text-xs text-slate-500">em andamento, vencendo depois de {DIAS_ALERTA} dias</p>
          </div>
        </div>

        {lista.length === 0 ? (
          <Vazio>Nenhuma atividade pendente para você.</Vazio>
        ) : (
          <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200/70">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className={TH}>Prazo</th>
                  <th className={TH}>Segurado</th>
                  <th className={TH}>Ramo</th>
                  <th className={TH}>Seguradora</th>
                  <th className={TH}>Etapa</th>
                  <th className={TH}>Atividade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lista.map(({ r, atividade, faixa, seguro, cliente }) => (
                  <tr key={r.id} onClick={() => setAberta(r.id)} className={`cursor-pointer ${faixa ? FAIXA[faixa].linha : 'hover:bg-marca-50/50'}`}>
                    <td className={`${TD} whitespace-nowrap`}>
                      <span className={`inline-flex items-center gap-2 ${faixa ? FAIXA[faixa].texto : 'text-slate-500'}`}>
                        <span className={`size-2 rounded-full ${faixa ? FAIXA[faixa].ponto : 'bg-slate-200'}`} />
                        {prazoLabel(r.vencimento)}
                      </span>
                      <span className="block pl-4 text-xs tabular-nums text-slate-400">{fmtData(r.vencimento)}</span>
                    </td>
                    <td className={`${TD} font-medium`}>{cliente.nome}</td>
                    <td className={TD}><RamoBadge ramo={seguro.ramo} /></td>
                    <td className={`${TD} text-slate-600`}><SeguradoraLink seguradora={ix.seguradora.get(seguro.seguradoraId)} /></td>
                    <td className={TD}><StatusBadge status={r.status} /></td>
                    <td className={TD}>
                      <span className="font-medium text-slate-800">{atividade.texto}</span>
                      {filtro === 'todas' && <span className="block text-xs text-slate-500">{FUNCAO_LABEL[atividade.funcao]}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-slate-200 px-4 py-2.5 text-xs text-slate-500">
              {lista.length} {lista.length === 1 ? 'atividade' : 'atividades'} · clique numa linha para fazer o próximo passo
            </div>
          </div>
        )}
      </div>

      <RenovacaoSheet id={aberta} onFechar={() => setAberta(null)} />
    </>
  )
}

function SeguradoraLink({ seguradora }: { seguradora?: Seguradora }) {
  const url = portalSeguradora(seguradora)
  if (!url) return <>{seguradora?.nome}</>
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title={`Abrir o portal da ${seguradora!.nome}`}
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 -mx-2 font-medium text-blue-700 hover:bg-blue-50 hover:underline"
    >
      {seguradora!.nome}
      <span aria-hidden className="text-xs">↗</span>
    </a>
  )
}
