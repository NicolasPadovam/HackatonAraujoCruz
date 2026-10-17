import { AlertTriangle, CheckCircle2, FileSpreadsheet, Link2, Loader2, RefreshCw, Search, Upload, UserPlus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSessao } from '../auth/AuthGate'
import {
  AvisoPrototipo, BotaoPrimario, BotaoSecundario, Card, INPUT, PageHeader, RAMO, Secao, StatusBadge, TD, TH,
} from '../components/ui'
import type { ModeloImportacao, Ramo } from '../domain/types'
import { useStore } from '../data/store'
import { CAMPOS, sugerirMapeamento, type CampoDestino, type Mapeamento } from '../importacao/campos'
import { detectarFormatoData, type FormatoData } from '../importacao/conversao'
import { cabecalhos, detectarCabecalho, lerArquivo, type Aba } from '../importacao/leitura'
import { processar, type LinhaResultado, type Plano, type Resultado } from '../importacao/processar'
import { fmtData, hojeIso, mesKey, normalizarNome } from '../lib/format'
import { fmtCpfCnpj } from '../lib/validacao'

type Passo = 'arquivo' | 'configurar' | 'previa' | 'pronto'
const PASSOS: Passo[] = ['arquivo', 'configurar', 'previa', 'pronto']
const NOMES_PASSO = ['Arquivo', 'Tipo e colunas', 'Conferir prévia', 'Concluído']
const CORRETORA = 'corretora' // modelo da planilha própria (seguradora vem de uma coluna)
const POR_PAGINA = 100

const RESULTADO: Record<Resultado, { label: string; icone: typeof Link2; classe: string }> = {
  novo_cliente: { label: 'Cliente novo', icone: UserPlus, classe: 'text-emerald-700 bg-emerald-50' },
  vinculado: { label: 'Cliente existente', icone: Link2, classe: 'text-marca-600 bg-marca-50' },
  atualiza: { label: 'Atualiza renovação', icone: RefreshCw, classe: 'text-slate-600 bg-slate-100' },
  revisao: { label: 'Revisar', icone: Search, classe: 'text-amber-800 bg-amber-50' },
  erro: { label: 'Erro', icone: AlertTriangle, classe: 'text-rose-700 bg-rose-50' },
}

export default function Importar() {
  const { db, importar, salvarModelo } = useStore()
  const { email } = useSessao()

  const [passo, setPasso] = useState<Passo>('arquivo')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [abas, setAbas] = useState<Aba[]>([])
  const [lendo, setLendo] = useState(false)
  const [erroLeitura, setErroLeitura] = useState<string | null>(null)

  const [modeloChave, setModeloChave] = useState<string>(CORRETORA)
  const [abasSel, setAbasSel] = useState<string[]>([])
  const [cabManual, setCabManual] = useState<number | null>(null) // linha do cabeçalho (1-based) informada pela pessoa
  const [mapeamento, setMapeamento] = useState<Mapeamento>({})
  const [formatoData, setFormatoData] = useState<FormatoData>('dmy')
  const [ramoPadrao, setRamoPadrao] = useState<Ramo>('residencial')
  const [corretorPadraoId, setCorretorPadraoId] = useState('')

  const [resultado, setResultado] = useState<{ linhas: LinhaResultado[]; plano: Plano } | null>(null)
  const [filtro, setFiltro] = useState<Resultado | 'todos'>('todos')
  const [mostrar, setMostrar] = useState(POR_PAGINA)
  const [gravando, setGravando] = useState(false)
  const [erroGravacao, setErroGravacao] = useState<string | null>(null)
  const [avisoModelo, setAvisoModelo] = useState<string | null>(null)

  const idx = PASSOS.indexOf(passo)
  const seguradoraFixa = modeloChave === CORRETORA ? null : db.seguradoras.find((s) => s.id === modeloChave) ?? null
  const modeloSalvo = db.modelos.find((m) => (m.seguradoraId ?? CORRETORA) === modeloChave)

  const abasEscolhidas = abas.filter((a) => abasSel.includes(a.nome))
  const linhaCab = (a: Aba) => (cabManual != null ? cabManual - 1 : detectarCabecalho(a.linhas))
  const primeira = abasEscolhidas[0]
  const colunas = primeira ? cabecalhos(primeira.linhas, linhaCab(primeira)) : []

  /** Até 2 exemplos de valor de uma coluna (só na tela, nada é salvo). */
  const exemplos = (coluna?: string) => {
    if (!primeira || !coluna) return ''
    const i = colunas.indexOf(coluna)
    if (i < 0) return ''
    return primeira.linhas
      .slice(linhaCab(primeira) + 1)
      .map((l) => l[i])
      .filter((v) => v != null && String(v).trim() !== '')
      .slice(0, 2)
      .map((v) => (typeof v === 'number' && v > 20000 && v < 80000 ? `${v} (data)` : String(v)))
      .join(' · ')
  }

  /** Aplica o modelo escolhido: o mapeamento salvo ou uma sugestão pelos nomes das colunas. */
  const aplicarModelo = (chave: string, todasAbas: Aba[]) => {
    setModeloChave(chave)
    setCabManual(null)
    const salvo = db.modelos.find((m) => (m.seguradoraId ?? CORRETORA) === chave)
    const comDados = todasAbas.filter((a) => a.linhas.length > 1).map((a) => a.nome)
    const sel = chave === CORRETORA ? comDados : comDados.slice(0, 1)
    setAbasSel(sel)
    const a = todasAbas.find((x) => x.nome === sel[0])
    const cab = a ? cabecalhos(a.linhas, detectarCabecalho(a.linhas)) : []
    // Mapeamento salvo (só colunas que existem neste arquivo), completado pela sugestão automática.
    const doSalvo: Mapeamento = salvo ? Object.fromEntries(Object.entries(salvo.mapeamento).filter(([, col]) => cab.includes(col))) : {}
    const usadas = new Set(Object.values(doSalvo))
    const sugerido = Object.fromEntries(Object.entries(sugerirMapeamento(cab)).filter(([campo, col]) => !(campo in doSalvo) && !usadas.has(col!)))
    const m: Mapeamento = { ...sugerido, ...doSalvo }
    if (chave !== CORRETORA) delete m.seguradora
    setMapeamento(m)
    // Formato das datas: o salvo, ou detectado pelos valores, ou o costume (planilha da corretora = mm/dd).
    const iVenc = m.vencimento ? cab.indexOf(m.vencimento) : -1
    const valores = iVenc >= 0 && a ? a.linhas.slice(detectarCabecalho(a.linhas) + 1).map((l) => l[iVenc]) : []
    setFormatoData(salvo?.opcoes.formatoData ?? detectarFormatoData(valores) ?? (chave === CORRETORA ? 'mdy' : 'dmy'))
    setRamoPadrao(salvo?.opcoes.ramoPadrao ?? 'residencial')
    setCorretorPadraoId(salvo?.opcoes.corretorPadraoId ?? db.corretores[0]?.id ?? '')
  }

  const escolherArquivo = async (f: File) => {
    setLendo(true)
    setErroLeitura(null)
    try {
      const lidas = await lerArquivo(f)
      if (!lidas.some((a) => a.linhas.length > 1)) throw new Error('O arquivo não tem linhas para importar.')
      setArquivo(f)
      setAbas(lidas)
      // Palpite do tipo: nome da seguradora no nome do arquivo; senão, a planilha da corretora.
      const palavras = new Set(normalizarNome(f.name).split(/[^a-z0-9]+/))
      const seg = db.seguradoras.find((s) =>
        [s.nome, ...(s.apelidos ?? [])].some((n) => {
          const nome = normalizarNome(n)
          return palavras.has(nome.replace(/\s+/g, '')) || palavras.has(nome.split(' ')[0]) // "porto", "tokio", "portoseguro"
        }),
      )
      aplicarModelo(seg?.id ?? CORRETORA, lidas)
      setPasso('configurar')
    } catch (e) {
      setErroLeitura(`Não consegui ler o arquivo. ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setLendo(false)
    }
  }

  const faltando = [
    !mapeamento.segurado && 'Nome do segurado',
    !mapeamento.vencimento && 'Vencimento',
    !seguradoraFixa && !mapeamento.seguradora && 'Seguradora',
    abasEscolhidas.length === 0 && 'pelo menos uma aba',
  ].filter(Boolean) as string[]

  const gerarPrevia = () => {
    setResultado(
      processar({
        db,
        abas: abasEscolhidas.map((aba) => ({ aba, linhaCabecalho: linhaCab(aba) })),
        mapeamento,
        seguradoraFixaId: seguradoraFixa?.id ?? null,
        formatoData,
        ramoPadrao,
        corretorPadraoId,
      }),
    )
    setFiltro('todos')
    setMostrar(POR_PAGINA)
    setErroGravacao(null)
    setPasso('previa')
  }

  const conta = useMemo(() => {
    const c: Record<Resultado, number> = { novo_cliente: 0, vinculado: 0, atualiza: 0, revisao: 0, erro: 0 }
    resultado?.linhas.forEach((l) => c[l.resultado]++)
    return c
  }, [resultado])
  const validas = conta.novo_cliente + conta.vinculado + conta.atualiza

  const confirmar = async () => {
    if (!resultado || !arquivo) return
    const vencs = resultado.linhas.filter((l) => l.renovacaoId && l.vencimento).map((l) => l.vencimento!).sort()
    const nomeModelo = seguradoraFixa ? `Relatório ${seguradoraFixa.nome}` : 'Planilha da corretora'
    setGravando(true)
    setErroGravacao(null)
    try {
      await importar({
        importacao: {
          id: crypto.randomUUID(),
          modelo: nomeModelo,
          arquivoNome: arquivo.name,
          aba: abasSel.join(', '),
          mesReferencia: mesKey(vencs[0] ?? hojeIso()),
          importadoPor: email ?? 'Você',
          importadoEm: new Date().toISOString(),
          linhasOk: validas,
          linhasErro: conta.erro,
          linhasRevisao: conta.revisao,
        },
        ...resultado.plano,
        linhas: resultado.linhas.map((l) => ({
          dadosBrutos: l.dadosBrutos,
          status: l.resultado === 'erro' ? 'erro' : l.resultado === 'revisao' ? 'revisao' : 'ok',
          mensagem: l.mensagens.join(' ') || undefined,
          renovacaoId: l.renovacaoId,
        })),
      })
    } catch (e) {
      setErroGravacao(`Nada foi gravado. ${e instanceof Error ? e.message : String(e)}`)
      setGravando(false)
      return
    }
    // Lembra o mapeamento para o próximo mês (falhar aqui não desfaz a importação).
    const modelo: ModeloImportacao = {
      id: modeloSalvo?.id ?? crypto.randomUUID(),
      nome: nomeModelo,
      seguradoraId: seguradoraFixa?.id ?? null,
      mapeamento: mapeamento as Record<string, string>,
      opcoes: { formatoData, ramoPadrao, corretorPadraoId },
    }
    try {
      await salvarModelo(modelo, !modeloSalvo)
      setAvisoModelo(null)
    } catch (e) {
      setAvisoModelo(`A importação foi gravada, mas o mapeamento não foi lembrado: ${e instanceof Error ? e.message : String(e)}`)
    }
    setGravando(false)
    setPasso('pronto')
  }

  const reiniciar = () => {
    setPasso('arquivo')
    setArquivo(null)
    setAbas([])
    setResultado(null)
    setErroGravacao(null)
    setAvisoModelo(null)
  }

  const visiveis = (resultado?.linhas ?? []).filter((l) => filtro === 'todos' || l.resultado === filtro)

  return (
    <>
      <PageHeader titulo="Importar planilha" subtitulo="Planilha da corretora ou relatório de renovações de cada seguradora" />
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
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-marca-500/40 bg-white px-6 py-14 text-center transition hover:border-marca-500 hover:bg-marca-50/30">
                <span className="grid size-14 place-items-center rounded-xl bg-marca-50 text-marca-700">
                  {lendo ? <Loader2 className="size-7 animate-spin" /> : <Upload className="size-7" />}
                </span>
                <span className="font-medium">Clique para escolher o arquivo</span>
                <span className="text-sm text-slate-500">.xlsx, .xls ou .csv</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  disabled={lendo}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void escolherArquivo(f); e.target.value = '' }}
                />
              </label>
              {erroLeitura && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-rose-200">{erroLeitura}</p>}
              <AvisoPrototipo>
                O arquivo é lido <strong>aqui no navegador</strong> e não é enviado. Só os clientes, seguros e renovações que você confirmar na prévia vão para o banco.
              </AvisoPrototipo>
              <div className="rounded-lg bg-white p-4 text-sm text-slate-600 ring-1 ring-slate-200">
                <p className="mb-1 font-medium text-slate-800">Dois usos</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li><strong>Planilha da corretora</strong>: a de renovações de vocês, uma aba por mês. Dá para importar várias abas de uma vez (carga inicial).</li>
                  <li><strong>Relatório da seguradora</strong>: o arquivo exportado com as renovações dos próximos 30 dias. Na primeira vez você indica as colunas; nas próximas, o sistema lembra.</li>
                </ul>
              </div>
            </div>

            <Secao titulo="Importações anteriores">
              <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200/70">
                {db.importacoes.length === 0 ? (
                  <p className="p-6 text-center text-sm text-slate-500">Nenhuma importação ainda.</p>
                ) : (
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr><th className={TH}>Arquivo / abas</th><th className={TH}>Por</th><th className={TH}>Data</th><th className={TH}>Linhas</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {db.importacoes.map((imp) => (
                        <tr key={imp.id}>
                          <td className={TD}>
                            <span className="flex items-center gap-2">
                              <FileSpreadsheet className="size-4 shrink-0 text-emerald-600" />
                              <span className="truncate">{imp.arquivoNome}{imp.aba && <> · <strong>{imp.aba}</strong></>}</span>
                            </span>
                          </td>
                          <td className={`${TD} text-slate-600`}>{imp.importadoPor}</td>
                          <td className={`${TD} tabular-nums text-slate-600`}>{fmtData(imp.importadoEm.slice(0, 10))}</td>
                          <td className={`${TD} whitespace-nowrap`}>
                            <span className="text-emerald-700">{imp.linhasOk} ok</span>
                            {imp.linhasRevisao > 0 && <span className="ml-2 text-amber-700">{imp.linhasRevisao} revisar</span>}
                            {imp.linhasErro > 0 && <span className="ml-2 text-rose-600">{imp.linhasErro} erro</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </Secao>
          </div>
        )}

        {passo === 'configurar' && arquivo && (
          <div className="space-y-5">
            <Card className="flex items-center gap-3 !py-3">
              <FileSpreadsheet className="size-5 text-emerald-600" />
              <span className="text-sm font-medium">{arquivo.name}</span>
              <span className="text-sm text-slate-500">{abas.length} aba(s)</span>
              <button onClick={reiniciar} className="ml-auto text-sm text-marca-600 hover:underline">Trocar arquivo</button>
            </Card>

            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] items-start gap-6">
              <div className="space-y-5">
                <Card className="space-y-4">
                  <label className="block space-y-1">
                    <span className="text-sm font-medium text-slate-700">Que arquivo é este?</span>
                    <select className={INPUT} value={modeloChave} onChange={(e) => aplicarModelo(e.target.value, abas)}>
                      <option value={CORRETORA}>Planilha da corretora (seguradora em uma coluna)</option>
                      <optgroup label="Relatório de renovações da seguradora">
                        {db.seguradoras.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                      </optgroup>
                    </select>
                    <span className="block text-xs text-slate-500">
                      {modeloSalvo ? 'Usando o mapeamento salvo da última importação deste tipo.' : 'Primeira vez com este tipo: confira as colunas ao lado. O mapeamento fica salvo.'}
                    </span>
                  </label>

                  <div className="space-y-1">
                    <span className="text-sm font-medium text-slate-700">Abas a importar</span>
                    <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg p-2 ring-1 ring-slate-200">
                      {abas.map((a) => (
                        <label key={a.nome} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={abasSel.includes(a.nome)}
                            onChange={(e) => setAbasSel((sel) => (e.target.checked ? [...sel, a.nome] : sel.filter((x) => x !== a.nome)))}
                          />
                          {a.nome} <span className="text-slate-400">({Math.max(0, a.linhas.length - linhaCab(a) - 1)} linhas)</span>
                        </label>
                      ))}
                    </div>
                    {abas.length > 1 && (
                      <div className="flex gap-3 text-xs">
                        <button className="text-marca-600 hover:underline" onClick={() => setAbasSel(abas.map((a) => a.nome))}>Marcar todas</button>
                        <button className="text-marca-600 hover:underline" onClick={() => setAbasSel([])}>Desmarcar</button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block space-y-1">
                      <span className="text-sm font-medium text-slate-700">Linha do cabeçalho</span>
                      <input
                        type="number"
                        min={1}
                        className={INPUT}
                        value={primeira ? linhaCab(primeira) + 1 : ''}
                        onChange={(e) => setCabManual(Math.max(1, Number(e.target.value) || 1))}
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-sm font-medium text-slate-700">Datas em texto</span>
                      <select className={INPUT} value={formatoData} onChange={(e) => setFormatoData(e.target.value as FormatoData)}>
                        <option value="dmy">dia/mês/ano</option>
                        <option value="mdy">mês/dia/ano</option>
                      </select>
                    </label>
                    <label className="block space-y-1">
                      <span className="text-sm font-medium text-slate-700">Ramo, se não houver coluna</span>
                      <select className={INPUT} value={ramoPadrao} onChange={(e) => setRamoPadrao(e.target.value as Ramo)}>
                        {(Object.keys(RAMO) as Ramo[]).map((r) => <option key={r} value={r}>{RAMO[r].label}</option>)}
                      </select>
                    </label>
                    <label className="block space-y-1">
                      <span className="text-sm font-medium text-slate-700">Corretor, se não houver</span>
                      <select className={INPUT} value={corretorPadraoId} onChange={(e) => setCorretorPadraoId(e.target.value)}>
                        {db.corretores.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </select>
                    </label>
                  </div>
                </Card>
              </div>

              <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200/70">
                <div className="border-b border-slate-200 px-4 py-3">
                  <p className="font-medium">Colunas da planilha</p>
                  <p className="text-sm text-slate-500">Indique onde está cada informação. Só nome e vencimento são obrigatórios; o resto é aproveitado quando existir.</p>
                </div>
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr><th className={TH}>Informação no CRM</th><th className={TH}>Coluna na planilha</th><th className={TH}>Exemplo (1ª aba)</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {CAMPOS.map((def) => {
                      const fixo = def.campo === 'seguradora' && seguradoraFixa
                      const obrigatorio = def.obrigatorio || (def.campo === 'seguradora' && !seguradoraFixa)
                      return (
                        <tr key={def.campo}>
                          <td className={`${TD} w-64`}>
                            <span className="font-medium">{def.label}</span>
                            {obrigatorio && <span className="text-rose-500"> *</span>}
                            {def.dica && <span className="block text-xs text-slate-400">{def.dica}</span>}
                          </td>
                          <td className={`${TD} w-64`}>
                            {fixo ? (
                              <span className="text-sm text-slate-600">Fixo: {seguradoraFixa.nome}</span>
                            ) : (
                              <select
                                className={`${INPUT} ${obrigatorio && !mapeamento[def.campo] ? 'ring-rose-300' : ''}`}
                                value={mapeamento[def.campo] ?? ''}
                                onChange={(e) => setMapeamento((m) => ({ ...m, [def.campo as CampoDestino]: e.target.value || undefined }))}
                              >
                                <option value="">— não usar —</option>
                                {colunas.map((c) => <option key={c} value={c}>{c}</option>)}
                              </select>
                            )}
                          </td>
                          <td className={`${TD} max-w-56 truncate text-xs text-slate-500`}>{fixo ? '' : exemplos(mapeamento[def.campo])}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="text-sm text-rose-700">{faltando.length > 0 && `Falta: ${faltando.join(', ')}.`}</span>
                  <BotaoPrimario disabled={faltando.length > 0} onClick={gerarPrevia}>Gerar prévia</BotaoPrimario>
                </div>
              </div>
            </div>
          </div>
        )}

        {passo === 'previa' && resultado && (
          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-3">
              {(Object.keys(RESULTADO) as Resultado[]).map((r) => {
                const R = RESULTADO[r]
                const Icone = R.icone
                return (
                  <button
                    key={r}
                    onClick={() => { setFiltro(filtro === r ? 'todos' : r); setMostrar(POR_PAGINA) }}
                    className={`flex items-center gap-3 rounded-xl bg-white p-3 text-left shadow-sm ring-1 ${filtro === r ? 'ring-2 ring-marca-500' : 'ring-slate-200/70 hover:ring-slate-300'}`}
                  >
                    <span className={`grid size-9 place-items-center rounded-lg ${R.classe}`}><Icone className="size-4.5" /></span>
                    <span>
                      <span className="block text-xl font-semibold leading-tight">{conta[r]}</span>
                      <span className="block text-xs text-slate-500">{R.label}</span>
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200/70">
              <div className="border-b border-slate-200 px-4 py-3 text-sm text-slate-600">
                {resultado.linhas.length} linhas lidas. Clientes são reconhecidos pelo CPF/CNPJ e, sem ele, pelo nome (mesmo nome = mesmo cliente).
                Linhas com <strong>erro</strong> ou para <strong>revisar</strong> não são gravadas.
              </div>
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className={TH}>Aba · linha</th>
                    <th className={TH}>Segurado</th>
                    <th className={TH}>CPF/CNPJ</th>
                    <th className={TH}>Seguradora</th>
                    <th className={TH}>Ramo</th>
                    <th className={TH}>Vencimento</th>
                    <th className={TH}>Andamento</th>
                    <th className={TH}>Resultado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visiveis.slice(0, mostrar).map((l) => {
                    const R = RESULTADO[l.resultado]
                    return (
                      <tr key={`${l.aba}-${l.linha}`} className={l.resultado === 'erro' ? 'bg-rose-50/40' : l.resultado === 'revisao' ? 'bg-amber-50/40' : ''}>
                        <td className={`${TD} whitespace-nowrap text-xs text-slate-400`}>{l.aba} · {l.linha}</td>
                        <td className={`${TD} font-medium`}>{l.segurado ?? '—'}</td>
                        <td className={`${TD} whitespace-nowrap tabular-nums text-slate-600`}>{l.cpfCnpj ? fmtCpfCnpj(l.cpfCnpj) : '—'}</td>
                        <td className={`${TD} text-slate-600`}>{l.seguradora ?? '—'}</td>
                        <td className={`${TD} text-slate-600`}>{l.ramo ? RAMO[l.ramo].label : '—'}</td>
                        <td className={`${TD} whitespace-nowrap tabular-nums`}>{l.vencimento ? fmtData(l.vencimento) : '—'}</td>
                        <td className={TD}>{l.status ? <StatusBadge status={l.status} /> : '—'}</td>
                        <td className={TD}>
                          <span className={`whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium ${R.classe}`}>{R.label}</span>
                          {l.mensagens.map((m) => <span key={m} className="mt-1 block text-xs text-slate-500">{m}</span>)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {visiveis.length > mostrar && (
                <button onClick={() => setMostrar((n) => n + POR_PAGINA)} className="w-full border-t border-slate-200 py-2.5 text-sm text-marca-600 hover:bg-slate-50">
                  Mostrar mais ({visiveis.length - mostrar} restantes)
                </button>
              )}
              {erroGravacao && <p role="alert" className="border-t border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-800">{erroGravacao}</p>}
              <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
                <BotaoSecundario onClick={() => setPasso('configurar')} disabled={gravando}>Voltar e ajustar colunas</BotaoSecundario>
                <BotaoPrimario onClick={() => void confirmar()} disabled={gravando || validas === 0}>
                  {gravando && <Loader2 className="size-4 animate-spin" />} Importar {validas} linhas
                </BotaoPrimario>
              </div>
            </div>
          </div>
        )}

        {passo === 'pronto' && (
          <Card className="mx-auto max-w-lg space-y-4 py-10 text-center">
            <CheckCircle2 className="mx-auto size-14 text-emerald-500" />
            <div>
              <p className="text-lg font-semibold">Importação gravada</p>
              <p className="text-sm text-slate-500">
                {conta.novo_cliente} clientes novos · {conta.vinculado} em clientes existentes · {conta.atualiza} renovações atualizadas
                {(conta.erro > 0 || conta.revisao > 0) && ` · ${conta.erro + conta.revisao} linhas não gravadas`}
              </p>
            </div>
            {avisoModelo && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">{avisoModelo}</p>}
            <div className="flex justify-center gap-2">
              <BotaoSecundario onClick={reiniciar}>Importar outro arquivo</BotaoSecundario>
              <Link to="/" className="rounded-lg bg-marca-700 px-4 py-2 text-sm font-semibold text-white hover:bg-marca-600">Ver renovações</Link>
            </div>
          </Card>
        )}
      </div>
    </>
  )
}
