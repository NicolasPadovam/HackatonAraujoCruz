import { ChevronRight, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, Card, Chips, PageHeader, RamoBadge, Vazio } from '../components/ui'
import type { Ramo } from '../domain/types'
import { useIndices, useStore } from '../data/store'
import { fmtDataCurta, iniciais, normalizarNome } from '../lib/format'

type FiltroRamo = Ramo | 'todos'

export default function Clientes() {
  const { db } = useStore()
  const ix = useIndices()
  const [busca, setBusca] = useState('')
  const [ramo, setRamo] = useState<FiltroRamo>('todos')

  const linhas = useMemo(() => {
    const termo = normalizarNome(busca)
    return db.clientes
      .map((c) => {
        const ativos = (ix.segurosDoCliente.get(c.id) ?? []).filter((s) => s.situacao === 'ativo')
        const proximo = ativos.map((s) => s.fimVigencia).sort()[0]
        return { c, ativos, proximo }
      })
      .filter(({ c }) => !termo || normalizarNome(c.nome).includes(termo) || c.cpfCnpj?.includes(termo))
      .filter(({ ativos }) => ramo === 'todos' || ativos.some((s) => s.ramo === ramo))
      .sort((a, b) => a.c.nome.localeCompare(b.c.nome, 'pt-BR'))
  }, [db.clientes, ix, busca, ramo])

  const totalSeguros = db.seguros.filter((s) => s.situacao === 'ativo').length

  return (
    <>
      <PageHeader titulo="Clientes" subtitulo={`${db.clientes.length} clientes · ${totalSeguros} seguros ativos`} />
      <div className="bg-marca-700 px-4 pb-4">
        <label className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5">
          <Search className="size-4 text-slate-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou CPF/CNPJ"
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </label>
      </div>

      <div className="space-y-4 p-4">
        <Chips
          valor={ramo}
          onChange={setRamo}
          opcoes={[
            { valor: 'todos', label: 'Todos' },
            { valor: 'residencial', label: 'Residencial' },
            { valor: 'auto', label: 'Auto' },
            { valor: 'vida', label: 'Vida' },
          ]}
        />

        {linhas.length === 0 ? (
          <Vazio>Nenhum cliente encontrado.</Vazio>
        ) : (
          <ul className="space-y-2">
            {linhas.map(({ c, ativos, proximo }) => (
              <li key={c.id}>
                <Link to={`/clientes/${c.id}`}>
                  <Card className="flex items-center gap-3 !p-3 active:bg-slate-50">
                    <Avatar texto={iniciais(c.nome)} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{c.nome}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {ativos.map((s) => (
                          <RamoBadge key={s.id} ramo={s.ramo} />
                        ))}
                        {proximo && <span className="ml-1 text-xs text-slate-400">vence {fmtDataCurta(proximo)}</span>}
                      </div>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-slate-300" />
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
