import { AlertTriangle, Ban, CheckCircle2, FileSpreadsheet, Link2, Loader2, PencilLine, RefreshCw, Search, ServerCrash, Undo2, Upload, UserPlus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSessao } from '../auth/AuthGate'
import {
  AvisoPrototipo, BotaoPrimario, BotaoSecundario, Card, INPUT, PageHeader, RAMO, Secao, StatusBadge, TD, TH,
} from '../components/ui'
import type { Ramo } from '../domain/types'
import { useStore } from '../data/store'
import { LABEL_CAMPO, OBRIGATORIO, type CampoDestino } from '../importacao/campos'
import { lerArquivo, type Aba } from '../importacao/leitura'
import { reconhecer, type AbaReconhecida } from '../importacao/modelo'
import { bloqueia, chaveLinha, processar, type Correcao, type LinhaResultado, type Plano, type Resultado } from '../importacao/processar'
import { fmtData, hojeIso, mesKey, normalizarNome } from '../lib/format'
import { cnpjValido, cpfValido, fmtCpfCnpj, somenteDigitos } from '../lib/validacao'

type Passo = 'arquivo' | 'configurar' | 'previa' | 'pronto'
const PASSOS: Passo[] = ['arquivo', 'configurar', 'previa', 'pronto']
const NOMES_PASSO = ['Arquivo', 'Seguradora', 'Conferir prévia', 'Concluído']
const CORRETORA = 'corretora' // modelo da planilha própria (seguradora vem de uma coluna)
const POR_PAGINA = 100

/** Ordem das colunas na tabela de preenchimento. */
const COLUNAS: CampoDestino[] = ['segurado', 'cpfCnpj', 'numeroApolice', 'vencimento', 'seguradora', 'ramo', 'telefone', 'email', 'corretor']

const RESULTADO: Record<Resultado, { label: string; icone: typeof Link2; classe: string }> = {
  novo_cliente: { label: 'Cliente novo', icone: UserPlus, classe: 'text-emerald-700 bg-emerald-50' },
  vinculado: { label: 'Cliente existente', icone: Link2, classe: 'text-marca-600 bg-marca-50' },
  atualiza: { label: 'Atualiza renovação', icone: RefreshCw, classe: 'text-slate-600 bg-slate-100' },
  pendente: { label: 'Falta informação', icone: PencilLine, classe: 'text-orange-700 bg-orange-50' },
  revisao: { label: 'Revisar', icone: Search, classe: 'text-amber-800 bg-amber-50' },
  descartada: { label: 'Descartada', icone: Ban, classe: 'text-slate-500 bg-slate-100' },
}

export default function Importar() {
  const { db, importar } = useStore()
  const { email } = useSessao()

  const [passo, setPasso] = useState<Passo>('arquivo')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [abas, setAbas] = useState<Aba[]>([])
  const [lendo, setLendo] = useState(false)
  const [erroLeitura, setErroLeitura] = useState<string | null>(null)

  const [modeloChave, setModeloChave] = useState<string>(CORRETORA)
  const [abasLidas, setAbasLidas] = useState<AbaReconhecida[]>([])
  const [naoReconhecido, setNaoReconhecido] = useState<{ aba: string; faltando: string[] }[] | null>(null)

  const [resultado, setResultado] = useState<{ linhas: LinhaResultado[]; plano: Plano } | null>(null)
  const [correcoes, setCorrecoes] = useState<Record<string, Correcao>>({})
  const [descartadas, setDescartadas] = useState<Set<string>>(new Set())
  const [filtro, setFiltro] = useState<Resultado | 'todos'>('todos')
  const [mostrar, setMostrar] = useState(POR_PAGINA)
  const [mostrarPend, setMostrarPend] = useState(POR_PAGINA)
  const [gravando, setGravando] = useState(false)
  const [erroGravacao, setErroGravacao] = useState<string | null>(null)

  const idx = PASSOS.indexOf(passo)
  const seguradoraFixa = modeloChave === CORRETORA ? null : db.seguradoras.find((s) => s.id === modeloChave) ?? null
  const nomeModelo = seguradoraFixa ? `Relatório ${seguradoraFixa.nome}` : 'Planilha da corretora'

  const escolherArquivo = async (f: File) => {
    setLendo(true)
    setErroLeitura(null)
    try {
      const lidas = await lerArquivo(f)
      if (!lidas.some((a) => a.linhas.length > 1)) throw new Error('O arquivo não tem linhas para importar.')
      setArquivo(f)
      setAbas(lidas)
      setCorrecoes({})
      setDescartadas(new Set())
      setNaoReconhecido(null)
      // Palpite do tipo: nome da seguradora no nome do arquivo; senão, a planilha da corretora.
      const palavras = new Set(normalizarNome(f.name).split(/[^a-z0-9]+/))
      const seg = db.seguradoras.find((s) =>
        [s.nome, ...(s.apelidos ?? [])].some((n) => {
          const nome = normalizarNome(n)
          return palavras.has(nome.replace(/\s+/g, '')) || palavras.has(nome.split(' ')[0]) // "porto", "tokio", "portoseguro"
        }),
      )
      setModeloChave(seg?.id ?? CORRETORA)
      setPasso('configurar')
    } catch (e) {
      setErroLeitura(`Não consegui ler o arquivo. ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setLendo(false)
    }
  }

  const rodar = (lidas: AbaReconhecida[], corr: Record<string, Correcao>, desc: Set<string>) =>
    setResultado(processar({ db, abas: lidas, seguradoraFixaId: seguradoraFixa?.id ?? null, correcoes: corr, descartadas: desc }))

  /** Reconhece o formato pela seguradora escolhida; se não reconhecer, para com erro 500. */
  const gerarPrevia = () => {
    const modelo = db.modelos.find((m) => (m.seguradoraId ?? CORRETORA) === modeloChave)
    const r = reconhecer(abas, modelo, !seguradoraFixa)
    if (!r.ok) {
      setNaoReconhecido(r.problemas)
      return
    }
    setNaoReconhecido(null)
    setAbasLidas(r.abas)
    rodar(r.abas, correcoes, descartadas)
    setFiltro('todos')
    setMostrar(POR_PAGINA)
    setMostrarPend(POR_PAGINA)
    setErroGravacao(null)
    setPasso('previa')
  }

  const atualizarPrevia = (desc = descartadas) => rodar(abasLidas, correcoes, desc)

  const alternarDescarte = (chave: string) => {
    const desc = new Set(descartadas)
    if (desc.has(chave)) desc.delete(chave)
    else desc.add(chave)
    setDescartadas(desc)
    atualizarPrevia(desc)
  }

  const conta = useMemo(() => {
    const c: Record<Resultado, number> = { novo_cliente: 0, vinculado: 0, atualiza: 0, pendente: 0, revisao: 0, descartada: 0 }
    resultado?.linhas.forEach((l) => c[l.resultado]++)
    return c
  }, [resultado])
  const validas = conta.novo_cliente + conta.vinculado + conta.atualiza
  const bloqueadas = conta.pendente + conta.revisao

  /** Linhas com algo para preencher ou decidir; as que impedem a importação vêm primeiro. */
  const paraPreencher = useMemo(
    () =>
      (resultado?.linhas ?? [])
        .filter((l) => l.faltando.length > 0 || bloqueia(l) || l.resultado === 'descartada')
        .sort((a, b) => Number(bloqueia(b)) - Number(bloqueia(a))),
    [resultado],
  )

  const corrigir = (chave: string, campo: keyof Correcao, valor: string) =>
    setCorrecoes((c) => ({ ...c, [chave]: { ...c[chave], [campo]: valor || undefined } }))

  const confirmar = async () => {
    if (!resultado || !arquivo || bloqueadas > 0) return
    const vencs = resultado.linhas.filter((l) => l.renovacaoId && l.vencimento).map((l) => l.vencimento!).sort()
    setGravando(true)
    setErroGravacao(null)
    try {
      await importar({
        importacao: {
          id: crypto.randomUUID(),
          modelo: nomeModelo,
          arquivoNome: arquivo.name,
          aba: abasLidas.map((a) => a.aba.nome).join(', '),
          mesReferencia: mesKey(vencs[0] ?? hojeIso()),
          seguradoraId: seguradoraFixa?.id ?? null,
          importadoPor: email ?? 'Você',
          importadoEm: new Date().toISOString(),
          linhasOk: validas,
          linhasErro: conta.descartada,
          linhasRevisao: 0,
        },
        ...resultado.plano,
        linhas: resultado.linhas.map((l) => ({
          dadosBrutos: l.dadosBrutos,
          status: l.resultado === 'descartada' ? 'erro' : 'ok',
          mensagem: l.mensagens.join(' ') || undefined,
          renovacaoId: l.renovacaoId,
        })),
      })
    } catch (e) {
      setErroGravacao(`Nada foi gravado. ${e instanceof Error ? e.message : String(e)}`)
      setGravando(false)
      return
    }
    setGravando(false)
    setPasso('pronto')
  }

  const reiniciar = () => {
    setPasso('arquivo')
    setArquivo(null)
    setAbas([])
    setResultado(null)
    setCorrecoes({})
    setDescartadas(new Set())
    setNaoReconhecido(null)
    setErroGravacao(null)
  }

  const visiveis = (resultado?.linhas ?? []).filter((l) => filtro === 'todos' || l.resultado === filtro)

  /** Célula da tabela de preenchimento: campo de digitação se faltar, senão o valor encontrado. */
  const celulaCampo = (l: LinhaResultado, campo: CampoDestino) => {
    const chave = chaveLinha(l.aba, l.linha)
    const c = correcoes[chave] ?? {}
    const obrig = OBRIGATORIO.has(campo)
    const desligado = l.resultado === 'descartada'
    if (!l.faltando.includes(campo)) {
      const v =
        campo === 'segurado' ? l.segurado
        : campo === 'cpfCnpj' ? (l.cpfCnpj ? fmtCpfCnpj(l.cpfCnpj) : 'Já cadastrado')
        : campo === 'numeroApolice' ? l.numeroApolice
        : campo === 'vencimento' ? (l.vencimento ? fmtData(l.vencimento) : undefined)
        : campo === 'seguradora' ? l.seguradora
        : campo === 'ramo' ? (l.ramo ? RAMO[l.ramo].label : undefined)
        : campo === 'telefone' ? l.telefone
        : campo === 'email' ? l.email
        : l.corretor
      return <span className="text-sm text-slate-600">{v ?? '—'}</span>
    }
    const anel = obrig ? 'ring-rose-300' : ''
    const rotulo = `${LABEL_CAMPO[campo]} da linha ${l.linha}`
    const ph = obrig ? 'Obrigatório' : 'Opcional'
    switch (campo) {
      case 'segurado':
        return <input className={`${INPUT} ${anel}`} disabled={desligado} placeholder="Nome correto" aria-label={rotulo} value={c.nome ?? l.nomePlanilha ?? ''} onChange={(e) => corrigir(chave, 'nome', e.target.value)} />
      case 'cpfCnpj': {
        const doc = somenteDigitos(c.cpfCnpj ?? '')
        const invalido = doc.length >= 11 && !(doc.length === 11 ? cpfValido(doc) : doc.length === 14 && cnpjValido(doc))
        return (
          <>
            <input className={`${INPUT} tabular-nums ${anel}`} disabled={desligado} placeholder="000.000.000-00" inputMode="numeric" maxLength={18} aria-label={rotulo} value={c.cpfCnpj ?? ''} onChange={(e) => corrigir(chave, 'cpfCnpj', fmtCpfCnpj(e.target.value))} />
            {invalido && <span className="mt-1 block text-xs text-rose-600">CPF/CNPJ inválido</span>}
          </>
        )
      }
      case 'numeroApolice':
        return <input className={`${INPUT} ${anel}`} disabled={desligado} placeholder={ph} aria-label={rotulo} value={c.numeroApolice ?? ''} onChange={(e) => corrigir(chave, 'numeroApolice', e.target.value)} />
      case 'vencimento':
        return <input type="date" className={`${INPUT} ${anel}`} disabled={desligado} aria-label={rotulo} value={c.vencimento ?? ''} onChange={(e) => corrigir(chave, 'vencimento', e.target.value)} />
      case 'seguradora':
        return (
          <select className={`${INPUT} ${anel}`} disabled={desligado} aria-label={rotulo} value={c.seguradoraId ?? ''} onChange={(e) => corrigir(chave, 'seguradoraId', e.target.value)}>
            <option value="">Escolha…</option>
            {db.seguradoras.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        )
      case 'ramo':
        return (
          <select className={`${INPUT} ${anel}`} disabled={desligado} aria-label={rotulo} value={c.ramo ?? ''} onChange={(e) => corrigir(chave, 'ramo', e.target.value as Ramo)}>
            <option value="">Escolha…</option>
            {(Object.keys(RAMO) as Ramo[]).map((r) => <option key={r} value={r}>{RAMO[r].label}</option>)}
          </select>
        )
      case 'telefone':
        return <input className={INPUT} disabled={desligado} placeholder={ph} inputMode="tel" aria-label={rotulo} value={c.telefone ?? ''} onChange={(e) => corrigir(chave, 'telefone', e.target.value)} />
      case 'email':
        return <input type="email" className={INPUT} disabled={desligado} placeholder={ph} aria-label={rotulo} value={c.email ?? ''} onChange={(e) => corrigir(chave, 'email', e.target.value)} />
      case 'corretor':
        return (
          <select className={INPUT} disabled={desligado} aria-label={rotulo} value={c.corretorId ?? ''} onChange={(e) => corrigir(chave, 'corretorId', e.target.value)}>
            <option value="">Opcional</option>
            {db.corretores.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
          </select>
        )
    }
  }

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
                  <li><strong>Planilha da corretora</strong>: a de renovações de vocês, uma aba por mês. Todas as abas com dados são importadas.</li>
                  <li><strong>Relatório da seguradora</strong>: o arquivo exportado com as renovações dos próximos 30 dias. Basta escolher a seguradora: o sistema reconhece as colunas.</li>
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
                            {imp.linhasErro > 0 && <span className="ml-2 text-rose-600">{imp.linhasErro} descartada(s)</span>}
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
          <div className="max-w-3xl space-y-5">
            <Card className="flex items-center gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-emerald-50">
                <FileSpreadsheet className="size-6 text-emerald-600" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium" title={arquivo.name}>{arquivo.name}</span>
                <span className="block text-sm text-slate-500">{abas.length} aba(s)</span>
              </span>
              <button onClick={reiniciar} className="ml-auto shrink-0 text-sm text-marca-600 hover:underline">Trocar arquivo</button>
            </Card>

            <Card className="space-y-4">
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">Que arquivo é este?</span>
                <select className={INPUT} value={modeloChave} onChange={(e) => { setModeloChave(e.target.value); setNaoReconhecido(null) }}>
                  <option value={CORRETORA}>Planilha da corretora (seguradora em uma coluna)</option>
                  <optgroup label="Relatório de renovações da seguradora">
                    {db.seguradoras.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                  </optgroup>
                </select>
              </label>

              {naoReconhecido && (
                <div role="alert" className="space-y-2 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-900 ring-1 ring-rose-200">
                  <p className="flex items-center gap-2 font-semibold"><ServerCrash className="size-4" /> Erro 500: formato de planilha não reconhecido</p>
                  <p>
                    O sistema não sabe ler este arquivo como <strong>{nomeModelo}</strong>. Nada foi importado.
                    <strong> Chame o administrador do sistema</strong> e envie o arquivo para ele configurar este formato.
                  </p>
                  <ul className="list-disc pl-5 text-xs text-rose-800">
                    {naoReconhecido.map((p) => <li key={p.aba}>Aba “{p.aba}”: não encontrei {p.faltando.join(' e ')}.</li>)}
                  </ul>
                </div>
              )}

              <div className="flex justify-end">
                <BotaoPrimario onClick={gerarPrevia}>Gerar prévia</BotaoPrimario>
              </div>
            </Card>
          </div>
        )}

        {passo === 'previa' && resultado && (
          <div className="space-y-4">
            <div className="grid grid-cols-6 gap-3">
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

            {bloqueadas > 0 && (
              <p role="alert" className="flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-900 ring-1 ring-rose-200">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  <strong>{bloqueadas} linha(s) ainda não podem ser importadas.</strong> Nenhuma linha fica de fora sem você decidir:
                  complete as informações obrigatórias abaixo ou clique em <strong>Descartar</strong> naquelas que de fato não são renovações.
                  A importação só é liberada quando todas estiverem resolvidas.
                </span>
              </p>
            )}

            {paraPreencher.length > 0 && (
              <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-orange-200">
                <div className="border-b border-orange-200 bg-orange-50 px-4 py-3">
                  <p className="font-medium text-orange-900">Complete os dados de {paraPreencher.length} linha(s)</p>
                  <p className="text-sm text-orange-800">
                    Campos com borda vermelha são obrigatórios; os demais são opcionais. O CPF/CNPJ digitado vale para as outras linhas do mesmo nome.
                    Nome com <strong>XXX</strong> veio mascarado pela seguradora. Depois clique em <strong>Atualizar prévia</strong>.
                  </p>
                </div>
                <div className="max-h-[32rem] overflow-auto">
                  <table className="w-full min-w-[90rem]">
                    <thead className="sticky top-0 z-10 bg-slate-50">
                      <tr>
                        <th className={TH}>Aba · linha</th>
                        {COLUNAS.map((c) => (
                          <th key={c} className={TH}>{LABEL_CAMPO[c]}{OBRIGATORIO.has(c) && <span className="text-rose-500"> *</span>}</th>
                        ))}
                        <th className={TH}></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paraPreencher.slice(0, mostrarPend).map((l) => {
                        const chave = chaveLinha(l.aba, l.linha)
                        const descartada = l.resultado === 'descartada'
                        return (
                          <tr key={chave} className={descartada ? 'opacity-50' : bloqueia(l) ? 'bg-orange-50/30' : ''}>
                            <td className={`${TD} whitespace-nowrap text-xs text-slate-400`}>
                              {l.aba} · {l.linha}
                              {l.mensagens.map((m) => <span key={m} className="mt-1 block max-w-48 whitespace-normal text-slate-500">{m}</span>)}
                            </td>
                            {COLUNAS.map((c) => <td key={c} className={`${TD} min-w-40 align-top`}>{celulaCampo(l, c)}</td>)}
                            <td className={`${TD} align-top`}>
                              <button
                                onClick={() => alternarDescarte(chave)}
                                className="flex items-center gap-1 whitespace-nowrap text-xs font-medium text-slate-500 hover:text-rose-700"
                              >
                                {descartada ? <><Undo2 className="size-3.5" /> Desfazer</> : <><Ban className="size-3.5" /> Descartar</>}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {paraPreencher.length > mostrarPend && (
                  <button onClick={() => setMostrarPend((n) => n + POR_PAGINA)} className="w-full border-t border-slate-200 py-2.5 text-sm text-marca-600 hover:bg-slate-50">
                    Mostrar mais ({paraPreencher.length - mostrarPend} restantes)
                  </button>
                )}
                <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-4 py-3">
                  <BotaoPrimario onClick={() => atualizarPrevia()}><RefreshCw className="size-4" /> Atualizar prévia</BotaoPrimario>
                </div>
              </div>
            )}

            <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200/70">
              <div className="border-b border-slate-200 px-4 py-3 text-sm text-slate-600">
                {resultado.linhas.length} linhas lidas de {abasLidas.length} aba(s). Clientes são reconhecidos pelo CPF/CNPJ e, sem ele, pelo nome (mesmo nome = mesmo cliente).
              </div>
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className={TH}>Aba · linha</th>
                    <th className={TH}>Segurado</th>
                    <th className={TH}>CPF/CNPJ</th>
                    <th className={TH}>Apólice</th>
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
                      <tr key={`${l.aba}-${l.linha}`} className={l.resultado === 'revisao' ? 'bg-amber-50/40' : l.resultado === 'pendente' ? 'bg-orange-50/40' : ''}>
                        <td className={`${TD} whitespace-nowrap text-xs text-slate-400`}>{l.aba} · {l.linha}</td>
                        <td className={`${TD} font-medium`}>{l.segurado ?? '—'}</td>
                        <td className={`${TD} whitespace-nowrap tabular-nums text-slate-600`}>{l.cpfCnpj ? fmtCpfCnpj(l.cpfCnpj) : '—'}</td>
                        <td className={`${TD} text-slate-600`}>{l.numeroApolice ?? '—'}</td>
                        <td className={`${TD} text-slate-600`}>{l.seguradora ?? '—'}</td>
                        <td className={`${TD} text-slate-600`}>{l.ramo ? RAMO[l.ramo].label : '—'}</td>
                        <td className={`${TD} whitespace-nowrap tabular-nums`}>{l.vencimento ? fmtData(l.vencimento) : '—'}</td>
                        <td className={TD}>{l.status ? <StatusBadge status={l.status} /> : '—'}</td>
                        <td className={TD}>
                          <span className={`whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium ${R.classe}`}>{R.label}</span>
                          {l.resultado === 'pendente' && (
                            <span className="mt-1 block text-xs text-orange-800">
                              Falta: {l.faltando.filter((c) => OBRIGATORIO.has(c)).map((c) => LABEL_CAMPO[c]).join(', ')}
                            </span>
                          )}
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
                {bloqueadas > 0 && (
                  <span className="mr-auto text-sm text-rose-800">Resolva ou descarte {bloqueadas} linha(s) para liberar a importação.</span>
                )}
                <BotaoSecundario onClick={() => setPasso('configurar')} disabled={gravando}>Voltar</BotaoSecundario>
                <BotaoPrimario onClick={() => void confirmar()} disabled={gravando || bloqueadas > 0 || validas === 0}>
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
                {conta.descartada > 0 && ` · ${conta.descartada} linha(s) descartada(s) por você`}
              </p>
            </div>
            <div className="flex justify-center gap-2">
              <button onClick={reiniciar} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium hover:bg-slate-200">Importar outro arquivo</button>
              <Link to="/renovacoes" className="rounded-lg bg-marca-700 px-4 py-2 text-sm font-semibold text-white hover:bg-marca-600">Ver renovações</Link>
            </div>
          </Card>
        )}
      </div>
    </>
  )
}
