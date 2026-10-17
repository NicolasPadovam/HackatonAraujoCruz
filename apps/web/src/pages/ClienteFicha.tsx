import { ArrowLeft, ArrowRight, Mail, MessageCircle, Phone } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { RenovacaoSheet } from '../components/RenovacaoSheet'
import { AvisoPrototipo, Card, RamoBadge, Secao, StatusBadge, Vazio } from '../components/ui'
import { useIndices, useStore } from '../data/store'
import { fmtData, fmtMoeda, fmtPct } from '../lib/format'

export default function ClienteFicha() {
  const { id } = useParams()
  const { db } = useStore()
  const ix = useIndices()
  const [aberta, setAberta] = useState<string | null>(null)
  const cliente = id ? ix.cliente.get(id) : undefined

  if (!cliente) {
    return (
      <div className="p-4">
        <Vazio>Cliente não encontrado. <Link to="/clientes" className="text-marca-600 underline">Voltar</Link></Vazio>
      </div>
    )
  }

  const seguros = ix.segurosDoCliente.get(cliente.id) ?? []
  const ativos = seguros.filter((s) => s.situacao === 'ativo').sort((a, b) => a.fimVigencia.localeCompare(b.fimVigencia))
  const historico = seguros
    .flatMap((s) => (ix.renovacoesDoSeguro.get(s.id) ?? []).map((r) => ({ r, s })))
    .sort((a, b) => b.r.vencimento.localeCompare(a.r.vencimento))
  const cotacoes = db.cotacoes.filter((c) => c.clienteId === cliente.id)
  const premioTotal = ativos.reduce((t, s) => t + (s.premioLiquido ?? 0), 0)
  const comissaoTotal = ativos.reduce((t, s) => t + ((s.premioLiquido ?? 0) * (s.comissaoPct ?? 0)) / 100, 0)

  return (
    <>
      <header className="sticky top-0 z-20 bg-marca-700 px-4 pb-5 pt-[max(1rem,env(safe-area-inset-top))] text-white">
        <Link to="/clientes" className="-ml-1 mb-3 inline-flex items-center gap-1 text-sm text-marca-100">
          <ArrowLeft className="size-4" /> Clientes
        </Link>
        <h1 className="text-xl font-semibold">{cliente.nome}</h1>
        <p className="text-sm text-marca-100">
          {cliente.cpfCnpj ?? 'CPF/CNPJ não informado'} · {cliente.origem === 'carteira' ? 'Carteira' : cliente.origem === 'indicacao' ? 'Indicação' : 'Marketing'}
        </p>
      </header>

      <div className="space-y-6 p-4">
        <div className="grid grid-cols-3 gap-2">
          <a
            onClick={(e) => { e.preventDefault(); if (cliente.telefone) alert('Protótipo: abriria o WhatsApp.') }}
            href="#"
            className={`flex flex-col items-center gap-1 rounded-2xl py-3 text-xs font-medium ${cliente.telefone ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}
          >
            <MessageCircle className="size-5" /> WhatsApp
          </a>
          <div className={`flex flex-col items-center gap-1 rounded-2xl py-3 text-xs font-medium ${cliente.telefone ? 'bg-white text-slate-700 ring-1 ring-slate-200' : 'bg-slate-100 text-slate-400'}`}>
            <Phone className="size-5" /> {cliente.telefone ?? 'Sem telefone'}
          </div>
          <div className={`flex flex-col items-center gap-1 truncate rounded-2xl px-1 py-3 text-xs font-medium ${cliente.email ? 'bg-white text-slate-700 ring-1 ring-slate-200' : 'bg-slate-100 text-slate-400'}`}>
            <Mail className="size-5" /> <span className="max-w-full truncate">{cliente.email ?? 'Sem e-mail'}</span>
          </div>
        </div>

        {!cliente.cpfCnpj && (
          <AvisoPrototipo>
            A planilha de renovações não traz CPF nem contato. Esses dados vão vir da base de clientes, que está sendo carregada no Supabase.
          </AvisoPrototipo>
        )}

        <div className="grid grid-cols-3 gap-2 text-center">
          <Card className="!p-3"><p className="text-xl font-semibold">{ativos.length}</p><p className="text-xs text-slate-500">seguros ativos</p></Card>
          <Card className="!p-3"><p className="text-sm font-semibold">{premioTotal ? fmtMoeda(premioTotal) : '—'}</p><p className="text-xs text-slate-500">prêmio/ano</p></Card>
          <Card className="!p-3"><p className="text-sm font-semibold">{comissaoTotal ? fmtMoeda(comissaoTotal) : '—'}</p><p className="text-xs text-slate-500">comissão</p></Card>
        </div>

        <Secao titulo="Seguros">
          {ativos.length === 0 ? <Vazio>Nenhum seguro ativo.</Vazio> : ativos.map((s) => (
            <Card key={s.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <RamoBadge ramo={s.ramo} />
                <span className="text-sm font-medium">{ix.seguradora.get(s.seguradoraId)?.nome}</span>
              </div>
              <dl className="grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-slate-500">Vigência</dt>
                <dd className="text-right">{fmtData(s.inicioVigencia)} → {fmtData(s.fimVigencia)}</dd>
                <dt className="text-slate-500">Prêmio líquido</dt>
                <dd className="text-right">{fmtMoeda(s.premioLiquido)}</dd>
                <dt className="text-slate-500">Comissão</dt>
                <dd className="text-right">{fmtPct(s.comissaoPct)}</dd>
                <dt className="text-slate-500">Parcelas</dt>
                <dd className="text-right">{s.parcelas ? `${s.parcelas}x ${fmtMoeda(s.valorParcela)}` : '—'}</dd>
              </dl>
            </Card>
          ))}
        </Secao>

        <Secao titulo="Histórico de renovações">
          {historico.length === 0 ? <Vazio>Sem renovações registradas.</Vazio> : (
            <Card className="!p-0">
              <ol className="divide-y divide-slate-100">
                {historico.map(({ r, s }) => {
                  const de = ix.seguradora.get(s.seguradoraId)?.nome
                  const para = r.seguradoraFechadaId ? ix.seguradora.get(r.seguradoraFechadaId)?.nome : undefined
                  return (
                    <li key={r.id}>
                      <button onClick={() => setAberta(r.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-slate-50">
                        <RamoBadge ramo={s.ramo} compacto />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{fmtData(r.vencimento)}</p>
                          <p className="flex items-center gap-1 truncate text-xs text-slate-500">
                            {de}
                            {para && para !== de && <><ArrowRight className="size-3" /> {para}</>}
                            {' · '}{ix.corretor.get(r.corretorId)?.nome}
                          </p>
                        </div>
                        <StatusBadge status={r.status} />
                      </button>
                    </li>
                  )
                })}
              </ol>
            </Card>
          )}
        </Secao>

        <Secao titulo="Cotações">
          {cotacoes.length === 0 ? <Vazio>Nenhuma cotação registrada.</Vazio> : (
            <Card className="!p-0">
              <ul className="divide-y divide-slate-100">
                {cotacoes.map((c) => (
                  <li key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
                    <div>
                      <p className="font-medium">{ix.seguradora.get(c.seguradoraId)?.nome}</p>
                      <p className="text-xs text-slate-500">{fmtData(c.data)} · {c.origem === 'manual' ? 'manual' : c.origem}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{fmtMoeda(c.premio)}</p>
                      <p className={`text-xs ${c.status === 'aceita' ? 'text-emerald-600' : c.status === 'recusada' ? 'text-slate-400' : 'text-sky-600'}`}>{c.status}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </Secao>
      </div>

      <RenovacaoSheet id={aberta} onFechar={() => setAberta(null)} />
    </>
  )
}
