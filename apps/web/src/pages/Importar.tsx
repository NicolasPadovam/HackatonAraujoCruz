import { AlertTriangle, CheckCircle2, FileSpreadsheet, Link2, RefreshCw, Upload, UserPlus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AvisoPrototipo, Card, PageHeader, Secao, StatusBadge } from '../components/ui'
import { abasDisponiveis, aplicarPrevia, gerarPrevia, nomeAba, type Resultado } from '../data/importacao'
import { useStore } from '../data/store'
import { fmtData, mesKey } from '../lib/format'

type Passo = 'arquivo' | 'aba' | 'previa' | 'pronto'

const RESULTADO: Record<Resultado, { label: string; icone: typeof Link2; classe: string }> = {
  vinculado: { label: 'Vinculado', icone: Link2, classe: 'text-marca-600 bg-marca-50' },
  novo_cliente: { label: 'Cliente novo', icone: UserPlus, classe: 'text-emerald-700 bg-emerald-50' },
  atualiza: { label: 'Atualiza', icone: RefreshCw, classe: 'text-slate-600 bg-slate-100' },
  erro: { label: 'Erro', icone: AlertTriangle, classe: 'text-rose-700 bg-rose-50' },
}

export default function Importar() {
  const { db, registrarImportacao } = useStore()
  const [passo, setPasso] = useState<Passo>('arquivo')
  const [arquivo, setArquivo] = useState('')
  const [aba, setAba] = useState('')
  const [filtro, setFiltro] = useState<Resultado | 'todos'>('todos')
  const [resumo, setResumo] = useState<Record<Resultado, number> | null>(null)

  const previa = useMemo(() => (aba ? gerarPrevia(db, aba) : []), [db, aba])
  const conta = (r: Resultado) => previa.filter((p) => p.resultado === r).length
  const mesesComDados = new Set(db.renovacoes.map((r) => mesKey(r.vencimento)))

  const confirmar = () => {
    const prefixo = `imp${Date.now()}`
    const novos = aplicarPrevia(previa, prefixo)
    // A prévia é recalculada depois de gravar; guarda os números de agora.
    setResumo({ vinculado: conta('vinculado'), novo_cliente: conta('novo_cliente'), atualiza: conta('atualiza'), erro: conta('erro') })
    registrarImportacao(
      {
        id: prefixo,
        arquivoNome: arquivo,
        aba: nomeAba(aba),
        mesReferencia: aba,
        importadoPor: 'Você',
        importadoEm: new Date().toISOString(),
        linhasOk: previa.length - conta('erro'),
        linhasErro: conta('erro'),
        linhasRevisao: 0,
      },
      novos,
    )
    setPasso('pronto')
  }

  const reiniciar = () => {
    setPasso('arquivo')
    setArquivo('')
    setAba('')
    setFiltro('todos')
  }

  return (
    <>
      <PageHeader titulo="Importar planilha" subtitulo="Renovações do mês, sem digitar nada" />
      <div className="space-y-5 p-4">
        <ol className="flex items-center gap-2 text-xs font-medium">
          {(['arquivo', 'aba', 'previa', 'pronto'] as Passo[]).map((p, i) => {
            const idx = ['arquivo', 'aba', 'previa', 'pronto'].indexOf(passo)
            return (
              <li key={p} className="flex flex-1 items-center gap-2">
                <span className={`grid size-6 shrink-0 place-items-center rounded-full ${i <= idx ? 'bg-marca-700 text-white' : 'bg-slate-200 text-slate-500'}`}>{i + 1}</span>
                <span className={i <= idx ? 'text-slate-800' : 'text-slate-400'}>{['Arquivo', 'Mês', 'Prévia', 'Pronto'][i]}</span>
              </li>
            )
          })}
        </ol>

        {passo === 'arquivo' && (
          <>
            <label className="flex cursor-pointer flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-marca-500/40 bg-white px-6 py-10 text-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-marca-50 text-marca-700"><Upload className="size-7" /></span>
              <span className="font-medium">Escolher planilha de renovações</span>
              <span className="text-sm text-slate-500">.xlsx com uma aba por mês</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) { setArquivo(f.name); setPasso('aba') }
                }}
              />
            </label>
            <button
              onClick={() => { setArquivo('Renovações exemplo.xlsx'); setPasso('aba') }}
              className="w-full rounded-xl bg-slate-100 py-3 text-sm font-medium text-slate-700"
            >
              Usar arquivo de exemplo
            </button>
            <AvisoPrototipo>
              Protótipo: o arquivo escolhido <strong>não é lido nem enviado</strong>. As linhas da prévia são fictícias, mas seguem o formato da planilha real (data M/D/AAAA, ✅/❌, “R$ -”).
            </AvisoPrototipo>

            <Secao titulo="Importações anteriores">
              <Card className="!p-0">
                <ul className="divide-y divide-slate-100">
                  {db.importacoes.map((imp) => (
                    <li key={imp.id} className="flex items-center gap-3 px-4 py-3">
                      <FileSpreadsheet className="size-5 shrink-0 text-emerald-600" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{imp.arquivoNome} · aba {imp.aba}</p>
                        <p className="text-xs text-slate-500">{imp.importadoPor} · {fmtData(imp.importadoEm.slice(0, 10))}</p>
                      </div>
                      <div className="text-right text-xs">
                        <p className="text-emerald-700">{imp.linhasOk} ok</p>
                        {imp.linhasErro > 0 && <p className="text-rose-600">{imp.linhasErro} erro</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            </Secao>
          </>
        )}

        {passo === 'aba' && (
          <>
            <Card className="flex items-center gap-3">
              <FileSpreadsheet className="size-6 text-emerald-600" />
              <span className="truncate text-sm font-medium">{arquivo}</span>
            </Card>
            <Secao titulo="Qual aba (mês) importar?">
              <div className="grid grid-cols-2 gap-2">
                {abasDisponiveis().map((m) => (
                  <button
                    key={m}
                    onClick={() => { setAba(m); setPasso('previa') }}
                    className="rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-200 active:bg-slate-50"
                  >
                    <p className="font-semibold">{nomeAba(m)}</p>
                    <p className="text-xs text-slate-500">{mesesComDados.has(m) ? 'Já importado: vai atualizar' : 'Ainda não importado'}</p>
                  </button>
                ))}
              </div>
            </Secao>
            <button onClick={reiniciar} className="w-full py-2 text-sm text-slate-500">Trocar arquivo</button>
          </>
        )}

        {passo === 'previa' && (
          <>
            <div className="grid grid-cols-4 gap-2">
              {(['vinculado', 'novo_cliente', 'atualiza', 'erro'] as Resultado[]).map((r) => {
                const R = RESULTADO[r]
                const Icone = R.icone
                return (
                  <button
                    key={r}
                    onClick={() => setFiltro(filtro === r ? 'todos' : r)}
                    className={`rounded-2xl bg-white p-2.5 text-left shadow-sm ring-1 ${filtro === r ? 'ring-2 ring-marca-500' : 'ring-slate-200/70'}`}
                  >
                    <span className={`mb-1 inline-grid size-6 place-items-center rounded-lg ${R.classe}`}><Icone className="size-3.5" /></span>
                    <span className="block text-xl font-semibold leading-tight">{conta(r)}</span>
                    <span className="block truncate text-[11px] text-slate-500">{R.label}</span>
                  </button>
                )
              })}
            </div>

            <p className="px-1 text-xs text-slate-500">
              Mesmo nome = mesmo cliente: linhas com nome já cadastrado são vinculadas ao cliente existente, sem duplicar.
            </p>

            <ul className="space-y-2">
              {previa.filter((p) => filtro === 'todos' || p.resultado === filtro).map((p) => {
                const R = RESULTADO[p.resultado]
                return (
                  <li key={p.bruta.linha}>
                    <Card className={`space-y-2 !p-3 ${p.resultado === 'erro' ? 'ring-rose-200' : ''}`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-medium">{p.bruta.segurado}</p>
                        <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${R.classe}`}>{R.label}</span>
                      </div>
                      <p className="font-mono text-[11px] text-slate-400">
                        L{p.bruta.linha}: {p.bruta.seguradora} | {p.bruta.ramo} | {p.bruta.vigencia} | {p.bruta.corretor} | {p.bruta.renovada || '—'} | {p.bruta.cotada}
                      </p>
                      {p.convertida ? (
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                          <span>Vence {fmtData(p.convertida.vencimento)}</span>
                          <StatusBadge status={p.convertida.status} />
                          {p.convertida.comissaoPct != null && <span>comissão {p.convertida.comissaoPct}%</span>}
                        </div>
                      ) : (
                        <p className="text-xs font-medium text-rose-600">{p.mensagem}. A linha não será importada.</p>
                      )}
                    </Card>
                  </li>
                )
              })}
            </ul>

            <div className="sticky bottom-20 grid grid-cols-3 gap-2">
              <button onClick={() => setPasso('aba')} className="rounded-xl bg-white py-3 text-sm font-medium text-slate-700 shadow ring-1 ring-slate-200">Voltar</button>
              <button onClick={confirmar} className="col-span-2 rounded-xl bg-marca-700 py-3 text-sm font-semibold text-white shadow">
                Importar {previa.length - conta('erro')} linhas
              </button>
            </div>
          </>
        )}

        {passo === 'pronto' && resumo && (
          <Card className="space-y-4 text-center">
            <CheckCircle2 className="mx-auto size-14 text-emerald-500" />
            <div>
              <p className="text-lg font-semibold">Aba {nomeAba(aba)} importada</p>
              <p className="text-sm text-slate-500">
                {resumo.novo_cliente} clientes novos · {resumo.vinculado} vinculados · {resumo.atualiza} atualizados · {resumo.erro} com erro
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={reiniciar} className="rounded-xl bg-slate-100 py-3 text-sm font-medium">Importar outra</button>
              <Link to="/" className="rounded-xl bg-marca-700 py-3 text-sm font-semibold text-white">Ver renovações</Link>
            </div>
          </Card>
        )}
      </div>
    </>
  )
}
