import { useMemo, useState } from 'react'
import { PageHeader, SeletorMes, Segmentos } from '../components/ui'
import { useStore } from '../data/store'
import { hojeIso, mesKey, mesLabel, mesesRecentes } from '../lib/format'
import CarteiraAba from './painel/CarteiraAba'
import RenovacoesAba from './painel/RenovacoesAba'
import VisaoGeral from './painel/VisaoGeral'

type Aba = 'geral' | 'renovacoes' | 'carteira'

const ABAS = [
  { valor: 'geral' as const, label: 'Visão geral' },
  { valor: 'renovacoes' as const, label: 'Renovações' },
  { valor: 'carteira' as const, label: 'Carteira' },
]

export default function Painel() {
  const { db } = useStore()
  const [aba, setAba] = useState<Aba>('geral')
  const [mes, setMes] = useState(mesKey(hojeIso()))

  const meses = useMemo(() => mesesRecentes(db.renovacoes.map((r) => r.vencimento)), [db.renovacoes])
  const usaMes = aba !== 'carteira'

  return (
    <>
      <PageHeader
        titulo="Painel"
        subtitulo={aba === 'carteira' ? 'Visão da carteira' : `Visão da carteira · ${mesLabel(mes)}`}
        direita={<Segmentos valor={aba} onChange={setAba} opcoes={ABAS} />}
      />

      <div className="space-y-6 px-8 py-6">
        {usaMes && (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              {aba === 'geral' ? 'Mês dos indicadores e distribuições' : 'Mês do funil de renovação'}
            </p>
            <SeletorMes valor={mes} meses={meses} onChange={setMes} rotulo={(m) => mesLabel(m)} />
          </div>
        )}
        {aba === 'geral' && <VisaoGeral mes={mes} />}
        {aba === 'renovacoes' && <RenovacoesAba mes={mes} />}
        {aba === 'carteira' && <CarteiraAba />}
      </div>
    </>
  )
}
