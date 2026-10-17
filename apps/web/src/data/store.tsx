// Camada de dados. Duas fontes, mesma interface para as páginas:
//  - Supabase (quando VITE_SUPABASE_URL/ANON_KEY existem): dados reais, protegidos por login e RLS.
//  - Demonstração (sem variáveis): dados fictícios em memória + localStorage.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Cliente, Corretor, Db, Importacao, Renovacao, Seguradora, Seguro } from '../domain/types'
import { supabase } from '../lib/supabase'
import { gerarDbExemplo } from './mock'
import { carregarDb, salvarImportacao, salvarRenovacao } from './remote'

const CHAVE = 'crm-araujo-cruz:prototipo:v1'

const VAZIO: Db = { clientes: [], seguradoras: [], corretores: [], seguros: [], renovacoes: [], cotacoes: [], importacoes: [] }

function carregar(): Db {
  if (supabase) return VAZIO // os dados vêm do Supabase depois do login
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
  /** 'supabase' = dados reais; 'demo' = fictícios, só neste navegador. */
  modo: 'supabase' | 'demo'
  carregando: boolean
  erro: string | null
  limparErro: () => void
  recarregar: () => Promise<void>
  atualizarRenovacao: (id: string, patch: Partial<Renovacao>) => void
  /** Rejeita se a gravação falhar (nada é gravado pela metade). */
  registrarImportacao: (imp: Importacao, novos: Novos) => Promise<void>
  resetar: () => void
}

const Ctx = createContext<Store | null>(null)

export function DbProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Db>(carregar)
  const [carregando, setCarregando] = useState(supabase !== null)
  const [erro, setErro] = useState<string | null>(null)
  const modo: Store['modo'] = supabase ? 'supabase' : 'demo'

  const recarregar = useCallback(async () => {
    if (!supabase) return
    setCarregando(true)
    try {
      setDb(await carregarDb(supabase))
      setErro(null)
    } catch (e) {
      setErro(`Não foi possível carregar os dados: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    // Carga inicial a partir do Supabase.
    void recarregar()
  }, [recarregar])

  useEffect(() => {
    if (supabase) return // dados reais não vão para o localStorage
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
    if (!supabase) return
    salvarRenovacao(supabase, id, patch).catch((e) => {
      setErro(`Não foi possível salvar a alteração: ${e instanceof Error ? e.message : String(e)}`)
      void recarregar() // desfaz a alteração otimista na tela
    })
  }, [recarregar])

  const registrarImportacao = useCallback(async (imp: Importacao, novos: Novos) => {
    if (supabase) await salvarImportacao(supabase, imp, novos) // só atualiza a tela se gravou
    setDb((atual) => ({
      ...atual,
      clientes: [...atual.clientes, ...novos.clientes],
      seguros: [...atual.seguros, ...novos.seguros],
      renovacoes: [...atual.renovacoes, ...novos.renovacoes],
      importacoes: [imp, ...atual.importacoes],
    }))
  }, [])

  const resetar = useCallback(() => {
    if (!supabase) setDb(gerarDbExemplo())
  }, [])

  const limparErro = useCallback(() => setErro(null), [])

  const value = useMemo(
    () => ({ db, modo, carregando, erro, limparErro, recarregar, atualizarRenovacao, registrarImportacao, resetar }),
    [db, modo, carregando, erro, limparErro, recarregar, atualizarRenovacao, registrarImportacao, resetar],
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
