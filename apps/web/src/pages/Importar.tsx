import { AlertTriangle, ArrowRight, CheckCircle2, FileSpreadsheet, Link2, RefreshCw, Upload, UserPlus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSessao } from '../auth/AuthGate'
import { AvisoPrototipo, Card, PageHeader, Secao, StatusBadge, TD, TH } from '../components/ui'
import { abasDisponiveis, aplicarPrevia, gerarPrevia, nomeAba, type Resultado } from '../data/importacao'
import { useStore } from '../data/store'
import { fmtData, mesKey } from '../lib/format'

type Passo = 'arquivo' | 'aba' | 'previa' | 'pronto'
const PASSOS: Passo[] = ['arquivo', 'aba', 'previa', 'pronto']
const NOMES_PASSO = ['Escolher arquivo', 'Escolher mês (aba)', 'Conferir prévia', 'Concluído']

const RESULTADO: Record<Resultado, { label: string; icone: typeof Link2; classe: string }> = {
  vinculado: { label: 'Vinculado a cliente existente', icone: Link2, classe: 'text-marca-600 bg-marca-50' },
  novo_cliente: { label: 'Cliente novo', icone: UserPlus, classe: 'text-emerald-700 bg-emerald-50' },
  atualiza: { label: 'Atualiza registro', icone: RefreshCw, classe: 'text-slate-600 bg-slate-100' },
  erro: { label: 'Erro', icone: AlertTriangle, classe: 'text-rose-700 bg-rose-50' },
}

export default function Importar() {
  const { db, modo, registrarImportacao } = useStore()
  const { email } = useSessao()
  const [passo, setPasso] = useState<Passo>('arquivo')
  const [arquivo, setArquivo] = useState('')
  const [aba, setAba] = useState('')
  const [filtro, setFiltro] = useState<Resultado | 'todos'>('todos')
  const [resumo, setResumo] = useState<Record<Resultado, number> | null>(null)
  const [gravando, setGravando] = useState(false)
  const [erroGravacao, setErroGravacao] = useState<string | null>(null)

  const previa = useMemo(() => (aba ? gerarPrevia(db, aba) : []), [db, aba])
  const conta = (r: Resultado) => previa.filter((p) => p.resultado === r).length
  const mesesComDados = new Set(db.renovacoes.map((r) => mesKey(r.vencimento)))
  const idx = PASSOS.indexOf(passo)

  const confirmar = async () => {
    const novos = aplicarPrevia(previa)
    // A prévia é recalculada depois de gravar; guarda os números de agora.
    const numeros = { vinculado: conta('vinculado'), novo_cliente: conta('novo_cliente'), atualiza: conta('atualiza'), erro: conta('erro') }
    setGravando(true)
    setErroGravacao(null)
    try {
      await registrarImportacao(
        {
          id: crypto.randomUUID(),
          arquivoNome: arquivo,
          aba: nomeAba(aba),
          mesReferencia: aba,
          importadoPor: email ?? 'Você',
          importadoEm: new Date().toISOString(),
          linhasOk: previa.length - conta('erro'),
          linhasErro: conta('erro'),
          linhasRevisao: 0,
        },
        novos,
      )
      setResumo(numeros)
      setPasso('pronto')
    } catch (e) {
      setErroGravacao(`Nada foi gravado. ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setGravando(false)
    }
  }

  const reiniciar = () => {
    setPasso('arquivo')
    setArquivo('')
    setAba('')
    setFiltro('todos')
    setResumo(null)
  }

  if (modo === 'supabase') {
    // O leitor real do .xlsx ainda não existe: o fluxo abaixo gera linhas inventadas e não pode gravar no banco real.
    return (
      <>
        <PageHeader titulo="Importar planilha" subtitulo="Renovações do mês entram no sistema sem digitação" />
        <div className="px-8 py-6">
          <AvisoPrototipo>
            A importação ainda não está ligada ao banco: falta o leitor do arquivo .xlsx (próximo passo, depende da planilha real de renovações).
            O fluxo simulado fica disponível só no modo demonstração, para não gravar dados fictícios no banco.
          </AvisoPrototipo>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader titulo="Importar planilha" subtitulo="Renovações do mês entram no sistema sem digitação" />
      <div className="space-y-6 px-8 py-6">
        <ol className="flex items-center gap-3 text-sm font-medium">
          {PASSOS.map((p, i) => (
            <li key={p} className="flex items-center gap-3">
              <span className="flex items-center gap-2">
                <span className={`grid size-7 place-items-center rounded-full text-xs ${i <= idx ? 'bg-marca-700 text-white' : 'bg-slate-200 text-slate-500'}`}>{i + 1}</span>
                <span className={i <= idx ? 'text-slate-800' : 'text-slate-400'}>{NOMES_PASSO[i]}</span>
              </span>
              {i < PASSOS.length - 1 && <span className="h-px w-10 bg-slate-300" />}
            </li>
          ))}
        </ol>

        {passo === 'arquivo' && (
          <div className="grid grid-cols-[1fr_1fr] gap-6">
            <div className="space-y-3">
              <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-marca-500/40 bg-white px-6 py-14 text-center transition hover:border-marca-500 hover:bg-marca-50/30">
                <span className="grid size-14 place-items-center rounded-xl bg-marca-50 text-marca-700"><Upload className="size-7" /></span>
                <span className="font-medium">Arraste ou clique para escolher a planilha de renovações</span>
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
                className="w-full rounded-lg bg-white py-2.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              >
                Usar arquivo de exemplo
              </button>
              <AvisoPrototipo>
                Protótipo: o arquivo escolhido <strong>não é lido nem enviado</strong>. As linhas da prévia são fictícias, mas seguem o formato da planilha real (data M/D/AAAA, ✅/❌, “R$ -”).
              </AvisoPrototipo>
            </div>

            <Secao titulo="Importações anteriores">
              <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200/70">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr><th className={TH}>Arquivo / aba</th><th className={TH}>Por</th><th className={TH}>Data</th><th className={TH}>Linhas</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {db.importacoes.map((imp) => (
                      <tr key={imp.id}>
                        <td className={TD}>
                          <span className="flex items-center gap-2">
                            <FileSpreadsheet className="size-4 shrink-0 text-emerald-600" />
                            <span className="truncate">{imp.arquivoNome} · <strong>{imp.aba}</strong></span>
                          </span>
                        </td>
                        <td className={`${TD} text-slate-600`}>{imp.importadoPor}</td>
                        <td className={`${TD} tabular-nums text-slate-600`}>{fmtData(imp.importadoEm.slice(0, 10))}</td>
                        <td className={`${TD} whitespace-nowrap`}>
                          <span className="text-emerald-700">{imp.linhasOk} ok</span>
                          {imp.linhasErro > 0 && <span className="ml-2 text-rose-600">{imp.linhasErro} erro</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Secao>
          </div>
        )}

        {passo === 'aba' && (
          <div className="space-y-4">
            <Card className="flex items-center gap-3 !py-3">
              <FileSpreadsheet className="size-5 text-emerald-600" />
              <span className="text-sm font-medium">{arquivo}</span>
              <button onClick={reiniciar} className="ml-auto text-sm text-marca-600 hover:underline">Trocar arquivo</button>
            </Card>
            <Secao titulo="Qual aba (mês) importar?">
              <div className="grid grid-cols-5 gap-3">
                {abasDisponiveis().map((m) => (
                  <button
                    key={m}
                    onClick={() => { setAba(m); setPasso('previa') }}
                    className="rounded-xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-200 transition hover:ring-2 hover:ring-marca-500"
                  >
                    <p className="text-lg font-semibold">{nomeAba(m)}</p>
                    <p className="text-xs text-slate-500">{mesesComDados.has(m) ? 'Já importado: vai atualizar' : 'Ainda não importado'}</p>
                  </button>
                ))}
              </div>
            </Secao>
          </div>
        )}

        {passo === 'previa' && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              {(['vinculado', 'novo_cliente', 'atualiza', 'erro'] as Resultado[]).map((r) => {
                const R = RESULTADO[r]
                const Icone = R.icone
                return (
                  <button
                    key={r}
                    onClick={() => setFiltro(filtro === r ? 'todos' : r)}
                    className={`flex items-center gap-3 rounded-xl bg-white p-4 text-left shadow-sm ring-1 ${filtro === r ? 'ring-2 ring-marca-500' : 'ring-slate-200/70 hover:ring-slate-300'}`}
                  >
                    <span className={`grid size-10 place-items-center rounded-lg ${R.classe}`}><Icone className="size-5" /></span>
                    <span>
                      <span className="block text-2xl font-semibold leading-tight">{conta(r)}</span>
                      <span className="block text-xs text-slate-500">{R.label}</span>
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200/70">
              <div className="border-b border-slate-200 px-4 py-3 text-sm text-slate-600">
                Aba <strong>{nomeAba(aba)}</strong> de {arquivo}. Mesmo nome = mesmo cliente: nomes já cadastrados são vinculados, sem duplicar.
              </div>
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className={TH}>Linha</th>
                    <th className={TH}>Segurado</th>
                    <th className={TH}>Seguradora</th>
                    <th className={TH}>Ramo</th>
                    <th className={TH}>Vigência na planilha → convertida</th>
                    <th className={TH}>Corretor</th>
                    <th className={TH}>Status</th>
                    <th className={TH}>Resultado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previa.filter((p) => filtro === 'todos' || p.resultado === filtro).map((p) => {
                    const R = RESULTADO[p.resultado]
                    return (
                      <tr key={p.bruta.linha} className={p.resultado === 'erro' ? 'bg-rose-50/40' : ''}>
                        <td className={`${TD} tabular-nums text-slate-400`}>{p.bruta.linha}</td>
                        <td className={`${TD} font-medium`}>{p.bruta.segurado}</td>
                        <td className={`${TD} text-slate-600`}>{p.bruta.seguradora}</td>
                        <td className={`${TD} text-slate-600`}>{p.bruta.ramo}</td>
                        <td className={`${TD} whitespace-nowrap`}>
                          <span className="font-mono text-xs text-slate-400">{p.bruta.vigencia}</span>
                          {p.convertida && <><ArrowRight className="mx-1.5 inline size-3 text-slate-400" /><span className="tabular-nums">{fmtData(p.convertida.vencimento)}</span></>}
                        </td>
                        <td className={`${TD} text-slate-600`}>{p.bruta.corretor}</td>
                        <td className={TD}>{p.convertida ? <StatusBadge status={p.convertida.status} /> : '—'}</td>
                        <td className={TD}>
                          {p.resultado === 'erro'
                            ? <span className="text-xs font-medium text-rose-600">{p.mensagem}. Não será importada.</span>
                            : <span className={`whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium ${R.classe}`}>{R.label}</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {erroGravacao && <p role="alert" className="border-t border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-800">{erroGravacao}</p>}
              <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
                <button onClick={() => setPasso('aba')} className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">Voltar</button>
                <button onClick={confirmar} disabled={gravando} className="rounded-lg bg-marca-700 px-4 py-2 text-sm font-semibold text-white hover:bg-marca-600 disabled:opacity-60">
                  Importar {previa.length - conta('erro')} linhas
                </button>
              </div>
            </div>
          </div>
        )}

        {passo === 'pronto' && resumo && (
          <Card className="mx-auto max-w-lg space-y-4 py-10 text-center">
            <CheckCircle2 className="mx-auto size-14 text-emerald-500" />
            <div>
              <p className="text-lg font-semibold">Aba {nomeAba(aba)} importada</p>
              <p className="text-sm text-slate-500">
                {resumo.novo_cliente} clientes novos · {resumo.vinculado} vinculados · {resumo.atualiza} atualizados · {resumo.erro} com erro
              </p>
            </div>
            <div className="flex justify-center gap-2">
              <button onClick={reiniciar} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium hover:bg-slate-200">Importar outra aba</button>
              <Link to="/renovacoes" className="rounded-lg bg-marca-700 px-4 py-2 text-sm font-semibold text-white hover:bg-marca-600">Ver renovações</Link>
            </div>
          </Card>
        )}
      </div>
    </>
  )
}
