import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar, PageHeader, RamoBadge, Segmentos, TD, TH, Vazio } from '../components/ui'
import type { Ramo } from '../domain/types'
import { useIndices, useStore } from '../data/store'
import { fmtData, iniciais, normalizarNome } from '../lib/format'

type FiltroRamo = Ramo | 'todos'

const ORIGEM = { carteira: 'Carteira', indicacao: 'Indicação', marketing: 'Marketing' }

export default function Clientes() {
  const { db } = useStore()
  const ix = useIndices()
  const navegar = useNavigate()
  const [busca, setBusca] = useState('')
  const [ramo, setRamo] = useState<FiltroRamo>('todos')

  const linhas = useMemo(() => {
    const termo = normalizarNome(busca)
    return db.clientes
      .map((c) => {
        const ativos = (ix.segurosDoCliente.get(c.id) ?? []).filter((s) => s.situacao === 'ativo')
        const proximo = ativos.map((s) => s.fimVigencia).sort()[0]
        const seguradoras = [...new Set(ativos.map((s) => ix.seguradora.get(s.seguradoraId)?.nome))]
        return { c, ativos, proximo, seguradoras }
      })
      .filter(({ c }) => !termo || normalizarNome(c.nome).includes(termo) || c.cpfCnpj?.includes(termo))
      .filter(({ ativos }) => ramo === 'todos' || ativos.some((s) => s.ramo === ramo))
      .sort((a, b) => a.c.nome.localeCompare(b.c.nome, 'pt-BR'))
  }, [db.clientes, ix, busca, ramo])

  const totalSeguros = db.seguros.filter((s) => s.situacao === 'ativo').length

  return (
    <>
      <PageHeader titulo="Clientes" subtitulo={`${db.clientes.length} clientes únicos · ${totalSeguros} seguros ativos`} />

      <div className="px-8 py-6">
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200/70">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3">
            <Segmentos
              valor={ramo}
              onChange={setRamo}
              opcoes={[
                { valor: 'todos', label: 'Todos' },
                { valor: 'residencial', label: 'Residencial' },
                { valor: 'auto', label: 'Auto' },
                { valor: 'vida', label: 'Vida' },
              ]}
            />
            <label className="ml-auto flex w-80 items-center gap-2 rounded-lg px-3 py-2 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-marca-500">
              <Search className="size-4 text-slate-400" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome ou CPF/CNPJ"
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </label>
          </div>

          {linhas.length === 0 ? (
            <div className="p-6"><Vazio>Nenhum cliente encontrado.</Vazio></div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className={TH}>Cliente</th>
                  <th className={TH}>CPF/CNPJ</th>
                  <th className={TH}>Seguros ativos</th>
                  <th className={TH}>Seguradoras</th>
                  <th className={TH}>Próximo vencimento</th>
                  <th className={TH}>Telefone</th>
                  <th className={TH}>Origem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {linhas.map(({ c, ativos, proximo, seguradoras }) => (
                  <tr key={c.id} onClick={() => navegar(`/clientes/${c.id}`)} className="cursor-pointer hover:bg-marca-50/50">
                    <td className={TD}>
                      <div className="flex items-center gap-3">
                        <Avatar texto={iniciais(c.nome)} tamanho="size-8" />
                        <span className="font-medium">{c.nome}</span>
                      </div>
                    </td>
                    <td className={`${TD} text-slate-400`}>{c.cpfCnpj ?? '—'}</td>
                    <td className={TD}>
                      <div className="flex flex-wrap gap-1">
                        {ativos.length ? ativos.map((s) => <RamoBadge key={s.id} ramo={s.ramo} />) : <span className="text-slate-400">nenhum</span>}
                      </div>
                    </td>
                    <td className={`${TD} text-slate-600`}>{seguradoras.join(', ') || '—'}</td>
                    <td className={`${TD} tabular-nums text-slate-600`}>{proximo ? fmtData(proximo) : '—'}</td>
                    <td className={`${TD} text-slate-600`}>{c.telefone ?? <span className="text-slate-400">—</span>}</td>
                    <td className={`${TD} text-slate-600`}>{ORIGEM[c.origem]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="border-t border-slate-200 px-4 py-2.5 text-xs text-slate-500">
            {linhas.length} clientes · CPF e telefone virão da base de clientes (em carga no Supabase)
          </div>
        </div>
      </div>
    </>
  )
}
