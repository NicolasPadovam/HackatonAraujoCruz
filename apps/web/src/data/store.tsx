// Camada de dados do protótipo: estado em memória + localStorage.
// Quando o Supabase estiver pronto, este arquivo é o ponto a trocar
// (as páginas só usam useDb/useIndices e as ações abaixo).

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Cliente, Corretor, Db, Importacao, Renovacao, Seguradora, Seguro } from '../domain/types'
import { gerarDbExemplo } from './mock'

const CHAVE = 'crm-araujo-cruz:prototipo:v1'

function carregar(): Db {
  try {
    const salvo = localStorage.getItem(CHAVE)
    if (salvo) return JSON.parse(salvo) as Db
  } catch {
    // storage indisponível ou corrompido: usa os dados de exemplo
  }
  return gerarDbExemplo()
}

interface Novos {
  clientes: Cliente[]
  seguros: Seguro[]
  renovacoes: Renovacao[]
}

interface Store {
  db: Db
  atualizarRenovacao: (id: string, patch: Partial<Renovacao>) => void
  registrarImportacao: (imp: Importacao, novos: Novos) => void
  resetar: () => void
}

const Ctx = createContext<Store | null>(null)

export function DbProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Db>(carregar)

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(db))
    } catch {
      // sem persistência, segue em memória
    }
  }, [db])

  const atualizarRenovacao = useCallback((id: string, patch: Partial<Renovacao>) => {
    setDb((atual) => ({
      ...atual,
      renovacoes: atual.renovacoes.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }))
  }, [])

  const registrarImportacao = useCallback((imp: Importacao, novos: Novos) => {
    setDb((atual) => ({
      ...atual,
      clientes: [...atual.clientes, ...novos.clientes],
      seguros: [...atual.seguros, ...novos.seguros],
      renovacoes: [...atual.renovacoes, ...novos.renovacoes],
      importacoes: [imp, ...atual.importacoes],
    }))
  }, [])

  const resetar = useCallback(() => setDb(gerarDbExemplo()), [])

  const value = useMemo(
    () => ({ db, atualizarRenovacao, registrarImportacao, resetar }),
    [db, atualizarRenovacao, registrarImportacao, resetar],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore fora do DbProvider')
  return s
}

export interface Indices {
  cliente: Map<string, Cliente>
  seguradora: Map<string, Seguradora>
  corretor: Map<string, Corretor>
  seguro: Map<string, Seguro>
  segurosDoCliente: Map<string, Seguro[]>
  renovacoesDoSeguro: Map<string, Renovacao[]>
}

export function useIndices(): Indices {
  const { db } = useStore()
  return useMemo(() => {
    const agrupar = <T,>(itens: T[], chave: (x: T) => string) => {
      const m = new Map<string, T[]>()
      for (const x of itens) {
        const k = chave(x)
        const lista = m.get(k)
        if (lista) lista.push(x)
        else m.set(k, [x])
      }
      return m
    }
    return {
      cliente: new Map(db.clientes.map((x) => [x.id, x])),
      seguradora: new Map(db.seguradoras.map((x) => [x.id, x])),
      corretor: new Map(db.corretores.map((x) => [x.id, x])),
      seguro: new Map(db.seguros.map((x) => [x.id, x])),
      segurosDoCliente: agrupar(db.seguros, (s) => s.clienteId),
      renovacoesDoSeguro: agrupar(db.renovacoes, (r) => r.seguroId),
    }
  }, [db])
}
