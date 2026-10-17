import { ArrowRight, MessageCircle, User } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Caminho, Renovacao, StatusRenovacao } from '../domain/types'
import { useIndices, useStore } from '../data/store'
import {
  FUNCAO_LABEL, atividadeDe, ehFinal, exigeCotacao, transicaoPermitida, validarAvanco, type DadosCotacao,
} from '../lib/atividades'
import { DIAS_ALERTA, diasAte, fmtData, fmtMoeda, fmtPct, prazoLabel } from '../lib/format'
import { numeroParaCampo, parseNumeroBR } from '../lib/validacao'
import { BotaoPrimario, BotaoSecundario, Campo, Drawer, INPUT, RamoBadge, STATUS, Select, StatusBadge } from './ui'

interface Acao {
  para: StatusRenovacao
  rotulo: string
  principal?: boolean
}

/** Botões de cada etapa (um clique); os que exigem cotação abrem o formulário. */
const ACOES: Record<StatusRenovacao, Acao[]> = {
  pendente: [{ para: 'cotando', rotulo: 'Iniciar cotação', principal: true }],
  cotando: [{ para: 'cotada', rotulo: 'Concluir cotação e enviar à Corretora', principal: true }],
  cotada: [{ para: 'enviada', rotulo: 'Enviei ao cliente', principal: true }],
  enviada: [
    { para: 'renovada', rotulo: 'Cliente aceitou', principal: true },
    { para: 'negociando', rotulo: 'Cliente não concordou' },
  ],
  negociando: [
    { para: 'enviada', rotulo: 'Registrar nova oferta', principal: true },
    { para: 'cancelada', rotulo: 'Encerrar negociação (cancelar)' },
  ],
  renovada: [{ para: 'pendente', rotulo: 'Reabrir' }],
  nao_renovada: [{ para: 'pendente', rotulo: 'Reabrir' }],
  cancelada: [{ para: 'negociando', rotulo: 'Reabrir negociação' }],
}

/** Etapa anterior, para corrigir um clique errado. */
const VOLTAR: Partial<Record<StatusRenovacao, StatusRenovacao>> = { cotando: 'pendente', cotada: 'cotando' }

const CAMINHOS: { valor: Caminho; rotulo: string }[] = [
  { valor: 'contato_seguradora', rotulo: 'Contato com a seguradora' },
  { valor: 'reducao_comissao', rotulo: 'Redução de comissão' },
]

function FormCotacao({ tipo, seguradoraInicial, onConfirmar, onCancelar, enviando }: {
  tipo: 'cotacao' | 'oferta'
  seguradoraInicial: string
  onConfirmar: (d: DadosCotacao) => void
  onCancelar: () => void
  enviando: boolean
}) {
  const { db } = useStore()
  const [seguradoraId, setSeguradoraId] = useState(seguradoraInicial)
  const [premio, setPremio] = useState('')
  const [comissao, setComissao] = useState('')
  const [caminho, setCaminho] = useState<Caminho | ''>('')
  const [erro, setErro] = useState<string | null>(null)

  const confirmar = () => {
    const p = parseNumeroBR(premio)
    const c = parseNumeroBR(comissao)
    if (p == null || Number.isNaN(p)) return setErro('Informe o prêmio da cotação.')
    if (c != null && (Number.isNaN(c) || c < 0 || c > 100)) return setErro('A comissão deve estar entre 0 e 100%.')
    const dados: DadosCotacao = { seguradoraId, premio: p, comissaoPct: c, caminho: caminho || undefined }
    const de: StatusRenovacao = tipo === 'cotacao' ? 'cotando' : 'negociando'
    const para: StatusRenovacao = tipo === 'cotacao' ? 'cotada' : 'enviada'
    const invalido = validarAvanco(de, para, dados)
    if (invalido) return setErro(invalido)
    setErro(null)
    onConfirmar(dados)
  }

  return (
    <div className="space-y-3 rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
      <p className="text-sm font-medium text-slate-800">
        {tipo === 'cotacao' ? 'Registrar a cotação' : 'Registrar a nova oferta'}
      </p>
      {tipo === 'oferta' && (
        <Campo label="Como a nova oferta foi obtida" obrigatorio>
          <div className="grid grid-cols-2 gap-2">
            {CAMINHOS.map((c) => (
              <button
                key={c.valor}
                type="button"
                onClick={() => setCaminho(c.valor)}
                className={`rounded-lg px-3 py-2 text-sm font-medium ring-1 transition ${
                  caminho === c.valor ? 'bg-marca-50 text-marca-700 ring-2 ring-marca-500' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-100'
                }`}
              >
                {c.rotulo}
              </button>
            ))}
          </div>
        </Campo>
      )}
      <Campo label="Seguradora" obrigatorio>
        <select className={INPUT} value={seguradoraId} onChange={(e) => setSeguradoraId(e.target.value)}>
          {db.seguradoras.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Prêmio (R$)" obrigatorio>
          <input className={INPUT} inputMode="decimal" value={premio} onChange={(e) => setPremio(e.target.value)} placeholder={numeroParaCampo(1234.5)} />
        </Campo>
        <Campo label="Comissão (%)" obrigatorio={tipo === 'oferta'}>
          <input className={INPUT} inputMode="decimal" value={comissao} onChange={(e) => setComissao(e.target.value)} placeholder={tipo === 'oferta' ? 'Ex.: 10' : 'Opcional'} />
        </Campo>
      </div>
      {erro && <p role="alert" className="text-sm text-rose-700">{erro}</p>}
      <div className="flex gap-2">
        <BotaoPrimario type="button" disabled={enviando} onClick={confirmar} className="flex-1">
          {tipo === 'cotacao' ? 'Salvar e enviar à Corretora' : 'Salvar nova oferta'}
        </BotaoPrimario>
        <BotaoSecundario type="button" onClick={onCancelar}>Cancelar</BotaoSecundario>
      </div>
    </div>
  )
}

export function RenovacaoSheet({ id, onFechar }: { id: string | null; onFechar: () => void }) {
  const { db, atualizarRenovacao, avancarRenovacao } = useStore()
  const ix = useIndices()
  const [formulario, setFormulario] = useState<'cotacao' | 'oferta' | null>(null)
  const [fechouCom, setFechouCom] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [idAnterior, setIdAnterior] = useState(id)

  // Ao abrir outra renovação, descarta o formulário e os avisos da anterior.
  if (id !== idAnterior) {
    setIdAnterior(id)
    setFormulario(null)
    setFechouCom(null)
    setErro(null)
  }

  const ren = id ? db.renovacoes.find((r) => r.id === id) : undefined
  const seguro = ren ? ix.seguro.get(ren.seguroId) : undefined
  const cliente = seguro ? ix.cliente.get(seguro.clienteId) : undefined

  if (!ren || !seguro || !cliente) return null

  const seguradora = ix.seguradora.get(seguro.seguradoraId)
  const cotacoes = db.cotacoes.filter((c) => c.renovacaoId === ren.id).sort((a, b) => a.data.localeCompare(b.data))
  const trocou = ren.seguradoraFechadaId && ren.seguradoraFechadaId !== seguro.seguradoraId
  const atividade = atividadeDe(ren)
  const seguradoraInicial = cotacoes[cotacoes.length - 1]?.seguradoraId ?? seguro.seguradoraId

  const ir = async (para: StatusRenovacao, dados: { cotacao?: DadosCotacao; seguradoraFechadaId?: string } = {}) => {
    setEnviando(true)
    setErro(null)
    try {
      await avancarRenovacao(ren.id, para, dados)
      setFormulario(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setEnviando(false)
    }
  }

  const clicar = (a: Acao) => {
    const exige = exigeCotacao(ren.status, a.para)
    if (exige) return setFormulario(exige)
    void ir(a.para, a.para === 'renovada' ? { seguradoraFechadaId: fechouCom ?? seguro.seguradoraId } : {})
  }

  const naoRenova = !ehFinal(ren.status) && transicaoPermitida(ren.status, 'nao_renovada')
  const voltar = VOLTAR[ren.status]
  const faltam = diasAte(ren.vencimento) - DIAS_ALERTA

  return (
    <Drawer aberto onFechar={onFechar} titulo={cliente.nome}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <RamoBadge ramo={seguro.ramo} />
          <span>{seguradora?.nome}</span>
          <span>·</span>
          <span>Vence {fmtData(ren.vencimento)}</span>
          <span className="text-slate-400">({prazoLabel(ren.vencimento)})</span>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">Andamento</p>
            <StatusBadge status={ren.status} />
          </div>

          {atividade ? (
            <div className="rounded-lg bg-marca-50 px-4 py-3 ring-1 ring-marca-100">
              <p className="text-xs font-medium uppercase tracking-wide text-marca-700">Próxima atividade · {FUNCAO_LABEL[atividade.funcao]}</p>
              <p className="mt-0.5 text-sm font-medium text-slate-900">{atividade.texto}</p>
            </div>
          ) : ren.status === 'pendente' ? (
            <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Ainda não é hora de cotar de novo: a atividade começa {DIAS_ALERTA} dias antes do vencimento (em {faltam} {faltam === 1 ? 'dia' : 'dias'}).
            </p>
          ) : (
            <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">Nenhuma atividade pendente: esta renovação está encerrada.</p>
          )}

          {ren.status === 'enviada' && (
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Se o cliente aceitar, fecha com</span>
              <Select className="w-full" value={fechouCom ?? seguro.seguradoraId} onChange={setFechouCom}>
                {db.seguradoras.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </Select>
            </label>
          )}

          {formulario ? (
            <FormCotacao
              tipo={formulario}
              seguradoraInicial={seguradoraInicial}
              enviando={enviando}
              onCancelar={() => setFormulario(null)}
              onConfirmar={(cotacao) => void ir(formulario === 'cotacao' ? 'cotada' : 'enviada', { cotacao })}
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {ACOES[ren.status].map((a) => (
                a.principal ? (
                  <BotaoPrimario key={a.para} disabled={enviando} onClick={() => clicar(a)}>{a.rotulo}</BotaoPrimario>
                ) : (
                  <BotaoSecundario key={a.para} disabled={enviando} onClick={() => clicar(a)}>{a.rotulo}</BotaoSecundario>
                )
              ))}
            </div>
          )}

          {!formulario && (naoRenova || voltar) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {voltar && (
                <button disabled={enviando} onClick={() => void ir(voltar)} className="text-slate-500 hover:text-slate-800 hover:underline">
                  Voltar para “{STATUS[voltar].label}”
                </button>
              )}
              {naoRenova && (
                <button disabled={enviando} onClick={() => void ir('nao_renovada')} className="text-rose-600 hover:underline">
                  Cliente não vai renovar
                </button>
              )}
              {ren.status === 'pendente' && (
                <button
                  disabled={enviando}
                  onClick={() => void ir('renovada', { seguradoraFechadaId: seguro.seguradoraId })}
                  className="text-slate-500 hover:text-slate-800 hover:underline"
                >
                  Cliente já renovou
                </button>
              )}
            </div>
          )}
          {erro && <p role="alert" className="text-sm text-rose-700">{erro}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Corretor</span>
            <Select
              className="w-full"
              value={ren.corretorId}
              onChange={(v) => atualizarRenovacao(ren.id, { corretorId: v } satisfies Partial<Renovacao>)}
            >
              {db.corretores.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </Select>
          </label>
          {ren.status === 'renovada' && (
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Fechou com</span>
              <Select
                className="w-full"
                value={ren.seguradoraFechadaId ?? seguro.seguradoraId}
                onChange={(v) => atualizarRenovacao(ren.id, { seguradoraFechadaId: v })}
              >
                {db.seguradoras.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </Select>
            </label>
          )}
        </div>
        {trocou && (
          <p className="-mt-3 flex items-center gap-1 text-xs text-violet-700">
            Trocou de seguradora: {seguradora?.nome} <ArrowRight className="size-3" />
            {ix.seguradora.get(ren.seguradoraFechadaId!)?.nome}
          </p>
        )}

        <dl className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-4 text-center text-xs">
          <div><dt className="text-slate-500">Prêmio</dt><dd className="mt-0.5 text-sm font-semibold">{fmtMoeda(seguro.premioLiquido)}</dd></div>
          <div><dt className="text-slate-500">Comissão</dt><dd className="mt-0.5 text-sm font-semibold">{fmtPct(seguro.comissaoPct)}</dd></div>
          <div><dt className="text-slate-500">Parcelas</dt><dd className="mt-0.5 text-sm font-semibold">{seguro.parcelas ? `${seguro.parcelas}x ${fmtMoeda(seguro.valorParcela)}` : '—'}</dd></div>
        </dl>

        {cotacoes.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Cotações desta renovação</p>
            <ul className="divide-y divide-slate-100 rounded-lg ring-1 ring-slate-200">
              {cotacoes.map((c, i) => (
                <li key={c.id} className="space-y-0.5 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>
                      <span className="text-slate-400">{i + 1}ª · </span>
                      {ix.seguradora.get(c.seguradoraId)?.nome}
                    </span>
                    <span className="font-medium">{fmtMoeda(c.premio)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {fmtData(c.data)}
                      {c.caminho && ` · ${CAMINHOS.find((x) => x.valor === c.caminho)?.rotulo}`}
                      {c.comissaoPct != null && ` · comissão ${fmtPct(c.comissaoPct)}`}
                    </span>
                    <span className={c.status === 'aceita' ? 'font-medium text-emerald-600' : c.status === 'recusada' ? 'text-slate-400' : 'text-sky-600'}>
                      {c.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-2">
          <Link
            to={`/clientes/${cliente.id}`}
            onClick={onFechar}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-100 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-200"
          >
            <User className="size-4" /> Abrir ficha do cliente
          </Link>
          <button
            disabled={!cliente.telefone}
            onClick={() => alert('Protótipo: aqui abriria o WhatsApp Web do cliente.')}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400"
          >
            <MessageCircle className="size-4" /> {cliente.telefone ? 'WhatsApp' : 'Sem telefone'}
          </button>
        </div>
      </div>
    </Drawer>
  )
}
