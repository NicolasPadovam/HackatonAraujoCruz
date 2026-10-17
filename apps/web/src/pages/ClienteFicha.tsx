import { ArrowLeft, ArrowRight, Mail, MessageCircle, Pencil, Phone, IdCard, Plus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ClienteForm } from '../components/ClienteForm'
import { RenovacaoSheet } from '../components/RenovacaoSheet'
import { SeguroForm } from '../components/SeguroForm'
import { AvisoPrototipo, Avatar, BotaoPrimario, BotaoSecundario, Card, PageHeader, RamoBadge, Secao, StatusBadge, TD, TH, Vazio } from '../components/ui'
import type { Seguro } from '../domain/types'
import { useIndices, useStore } from '../data/store'
import { fmtData, fmtMoeda, fmtPct, iniciais } from '../lib/format'
import { fmtCpfCnpj } from '../lib/validacao'

function Tabela({ cabecalho, children }: { cabecalho: string[]; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200/70">
      <table className="w-full">
        <thead className="bg-slate-50">
          <tr>{cabecalho.map((c) => <th key={c} className={TH}>{c}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  )
}

function Contato({ icone: Icone, valor, vazio }: { icone: typeof Phone; valor?: string; vazio: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <Icone className="size-4 text-slate-400" />
      {valor ? <span>{valor}</span> : <span className="text-slate-400">{vazio}</span>}
    </div>
  )
}

export default function ClienteFicha() {
  const { id } = useParams()
  const { db } = useStore()
  const ix = useIndices()
  const [aberta, setAberta] = useState<string | null>(null)
  const [editandoCliente, setEditandoCliente] = useState(false)
  // undefined = fechado; null = novo seguro; Seguro = edição
  const [seguroEmEdicao, setSeguroEmEdicao] = useState<Seguro | null | undefined>(undefined)
  const cliente = id ? ix.cliente.get(id) : undefined

  if (!cliente) {
    return (
      <div className="p-8">
        <Vazio>Cliente não encontrado. <Link to="/clientes" className="text-marca-600 underline">Voltar</Link></Vazio>
      </div>
    )
  }

  const seguros = ix.segurosDoCliente.get(cliente.id) ?? []
  const ativos = seguros.filter((s) => s.situacao === 'ativo').sort((a, b) => a.fimVigencia.localeCompare(b.fimVigencia))
  const historico = seguros
    .flatMap((s) => (ix.renovacoesDoSeguro.get(s.id) ?? []).map((r) => ({ r, s })))
    .sort((a, b) => b.r.vencimento.localeCompare(a.r.vencimento))
  const cotacoes = db.cotacoes.filter((c) => c.clienteId === cliente.id).sort((a, b) => b.data.localeCompare(a.data))
  const premioTotal = ativos.reduce((t, s) => t + (s.premioLiquido ?? 0), 0)
  const comissaoTotal = ativos.reduce((t, s) => t + ((s.premioLiquido ?? 0) * (s.comissaoPct ?? 0)) / 100, 0)
  const origem = cliente.origem === 'carteira' ? 'Carteira' : cliente.origem === 'indicacao' ? 'Indicação' : 'Marketing'

  return (
    <>
      <PageHeader
        titulo={cliente.nome}
        subtitulo={`${origem} · ${ativos.length} seguro(s) ativo(s)`}
        voltar={
          <Link to="/clientes" className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-marca-600">
            <ArrowLeft className="size-4" /> Clientes
          </Link>
        }
        direita={<>
          <BotaoSecundario onClick={() => setEditandoCliente(true)}><Pencil className="size-4" /> Editar dados</BotaoSecundario>
          <BotaoPrimario onClick={() => setSeguroEmEdicao(null)}><Plus className="size-4" /> Adicionar seguro</BotaoPrimario>
          <button
            disabled={!cliente.telefone}
            onClick={() => alert('Protótipo: abriria o WhatsApp Web do cliente.')}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400"
          >
            <MessageCircle className="size-4" /> {cliente.telefone ? 'WhatsApp' : 'Sem telefone'}
          </button>
        </>}
      />
      <ClienteForm aberto={editandoCliente} onFechar={() => setEditandoCliente(false)} cliente={cliente} />
      <SeguroForm
        aberto={seguroEmEdicao !== undefined}
        onFechar={() => setSeguroEmEdicao(undefined)}
        clienteId={cliente.id}
        clienteNome={cliente.nome}
        seguro={seguroEmEdicao ?? undefined}
      />

      <div className="grid grid-cols-[320px_1fr] gap-6 px-8 py-6">
        <div className="space-y-4">
          <Card className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar texto={iniciais(cliente.nome)} tamanho="size-12" />
              <p className="font-semibold leading-tight">{cliente.nome}</p>
            </div>
            <div className="space-y-2.5 border-t border-slate-100 pt-4">
              <Contato icone={IdCard} valor={fmtCpfCnpj(cliente.cpfCnpj) || undefined} vazio="CPF/CNPJ não informado" />
              <Contato icone={Phone} valor={cliente.telefone} vazio="Sem telefone" />
              <Contato icone={Mail} valor={cliente.email} vazio="Sem e-mail" />
            </div>
          </Card>

          <Card className="grid grid-cols-2 gap-4">
            <div><p className="text-xs text-slate-500">Seguros ativos</p><p className="text-2xl font-semibold">{ativos.length}</p></div>
            <div><p className="text-xs text-slate-500">Renovações</p><p className="text-2xl font-semibold">{historico.length}</p></div>
            <div><p className="text-xs text-slate-500">Prêmio/ano</p><p className="font-semibold">{premioTotal ? fmtMoeda(premioTotal) : '—'}</p></div>
            <div><p className="text-xs text-slate-500">Comissão/ano</p><p className="font-semibold">{comissaoTotal ? fmtMoeda(comissaoTotal) : '—'}</p></div>
          </Card>

          {(!cliente.cpfCnpj || !cliente.telefone) && (
            <AvisoPrototipo>
              Cadastro incompleto. A planilha de renovações não traz CPF nem contato:{' '}
              <button onClick={() => setEditandoCliente(true)} className="font-semibold underline">complete em Editar dados</button>.
            </AvisoPrototipo>
          )}
        </div>

        <div className="min-w-0 space-y-6">
          <Secao titulo="Seguros ativos">
            {ativos.length === 0 ? (
              <Vazio>
                Nenhum seguro ativo.{' '}
                <button onClick={() => setSeguroEmEdicao(null)} className="font-medium text-marca-600 underline">Adicionar seguro</button>
              </Vazio>
            ) : (
              <Tabela cabecalho={['Ramo', 'Seguradora', 'Vigência', 'Prêmio líquido', 'Comissão', 'Parcelas', '']}>
                {ativos.map((s) => (
                  <tr key={s.id}>
                    <td className={TD}><RamoBadge ramo={s.ramo} /></td>
                    <td className={`${TD} font-medium`}>{ix.seguradora.get(s.seguradoraId)?.nome}</td>
                    <td className={`${TD} whitespace-nowrap tabular-nums`}>{fmtData(s.inicioVigencia)} → {fmtData(s.fimVigencia)}</td>
                    <td className={`${TD} tabular-nums`}>{fmtMoeda(s.premioLiquido)}</td>
                    <td className={`${TD} tabular-nums`}>{fmtPct(s.comissaoPct)}</td>
                    <td className={`${TD} whitespace-nowrap tabular-nums`}>{s.parcelas ? `${s.parcelas}x ${fmtMoeda(s.valorParcela)}` : '—'}</td>
                    <td className={`${TD} text-right`}>
                      <button onClick={() => setSeguroEmEdicao(s)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-marca-600" title="Editar seguro">
                        <Pencil className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </Tabela>
            )}
          </Secao>

          <Secao titulo="Histórico de renovações">
            {historico.length === 0 ? <Vazio>Sem renovações registradas.</Vazio> : (
              <Tabela cabecalho={['Vencimento', 'Ramo', 'Seguradora', 'Corretor', 'Status']}>
                {historico.map(({ r, s }) => {
                  const de = ix.seguradora.get(s.seguradoraId)?.nome
                  const para = r.seguradoraFechadaId ? ix.seguradora.get(r.seguradoraFechadaId)?.nome : undefined
                  return (
                    <tr key={r.id} onClick={() => setAberta(r.id)} className="cursor-pointer hover:bg-marca-50/50">
                      <td className={`${TD} tabular-nums font-medium`}>{fmtData(r.vencimento)}</td>
                      <td className={TD}><RamoBadge ramo={s.ramo} /></td>
                      <td className={TD}>
                        <span className="inline-flex items-center gap-1.5">
                          {de}
                          {para && para !== de && <><ArrowRight className="size-3.5 text-violet-500" /><span className="font-medium text-violet-700">{para}</span></>}
                        </span>
                      </td>
                      <td className={`${TD} text-slate-600`}>{ix.corretor.get(r.corretorId)?.nome}</td>
                      <td className={TD}><StatusBadge status={r.status} /></td>
                    </tr>
                  )
                })}
              </Tabela>
            )}
          </Secao>

          <Secao titulo="Cotações">
            {cotacoes.length === 0 ? <Vazio>Nenhuma cotação registrada.</Vazio> : (
              <Tabela cabecalho={['Data', 'Ramo', 'Seguradora', 'Prêmio', 'Origem', 'Situação']}>
                {cotacoes.map((c) => (
                  <tr key={c.id}>
                    <td className={`${TD} tabular-nums`}>{fmtData(c.data)}</td>
                    <td className={TD}><RamoBadge ramo={c.ramo} /></td>
                    <td className={`${TD} font-medium`}>{ix.seguradora.get(c.seguradoraId)?.nome}</td>
                    <td className={`${TD} tabular-nums`}>{fmtMoeda(c.premio)}</td>
                    <td className={`${TD} text-slate-600`}>{c.origem}</td>
                    <td className={`${TD} ${c.status === 'aceita' ? 'font-medium text-emerald-600' : c.status === 'recusada' ? 'text-slate-400' : 'text-sky-600'}`}>{c.status}</td>
                  </tr>
                ))}
              </Tabela>
            )}
          </Secao>
        </div>
      </div>

      <RenovacaoSheet id={aberta} onFechar={() => setAberta(null)} />
    </>
  )
}
