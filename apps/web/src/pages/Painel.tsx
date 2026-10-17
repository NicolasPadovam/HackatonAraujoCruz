import { useMemo, useState } from 'react'
import { PageHeader, Segmentos, Select } from '../components/ui'
import { useStore } from '../data/store'
import { hojeIso, mesLabel } from '../lib/format'
import { anosDisponiveis, mesesDoAno, periodoDe } from '../lib/metricas'
import CarteiraAba from './painel/CarteiraAba'
import RenovacoesAba from './painel/RenovacoesAba'
import VisaoGeral from './painel/VisaoGeral'

type Aba = 'geral' | 'renovacoes' | 'carteira'

const ABAS = [
  { valor: 'geral' as const, label: 'Visão geral' },
  { valor: 'renovacoes' as const, label: 'Renovações' },
  { valor: 'carteira' as const, label: 'Carteira' },
]

const TODOS = 'todos'

export default function Painel() {
  const { db } = useStore()
  const [aba, setAba] = useState<Aba>('geral')
  const [ano, setAno] = useState(hojeIso().slice(0, 4))
  const [mes, setMes] = useState<string>(TODOS)

  const anos = useMemo(() => anosDisponiveis(db), [db])
  const periodo = useMemo(() => periodoDe(ano, mes === TODOS ? null : mes), [ano, mes])
  // A aba Carteira trabalha sempre com o ano inteiro (composição atual, evolução e trocas).
  const filtraMes = aba !== 'carteira'

  return (
    <>
      <PageHeader
        titulo="Painel"
        subtitulo={`Visão da carteira · ${filtraMes ? periodo.rotulo : ano}`}
        direita={<Segmentos valor={aba} onChange={setAba} opcoes={ABAS} />}
      />

      <div className="space-y-6 px-8 py-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            {filtraMes ? 'Período dos indicadores: o ano todo, ou um mês dele' : 'Ano dos gráficos de evolução e de trocas'}
          </p>
          <div className="flex items-center gap-2">
            <Select value={ano} onChange={(v) => { setAno(v); setMes(TODOS) }}>
              {anos.map((a) => <option key={a} value={a}>{a}</option>)}
            </Select>
            {filtraMes && (
              <Select value={mes} onChange={setMes}>
                <option value={TODOS}>Ano inteiro</option>
                {mesesDoAno(ano).map((m) => <option key={m} value={m}>{mesLabel(m)}</option>)}
              </Select>
            )}
          </div>
        </div>
        {aba === 'geral' && <VisaoGeral periodo={periodo} />}
        {aba === 'renovacoes' && <RenovacoesAba periodo={periodo} />}
        {aba === 'carteira' && <CarteiraAba periodo={periodoDe(ano, null)} />}
      </div>
    </>
  )
}
