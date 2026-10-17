// Camada de dados. Duas fontes, mesma interface para as páginas:
//  - Supabase (quando VITE_SUPABASE_URL/ANON_KEY existem): dados reais, protegidos por login e RLS.
//  - Demonstração (sem variáveis): dados fictícios em memória + localStorage.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Cliente, Corretor, Db, ModeloImportacao, Renovacao, Seguradora, Seguro } from '../domain/types'
import { supabase } from '../lib/supabase'
import { CORRETORES, gerarDbExemplo } from './mock'
import {
  atualizarCliente, atualizarSeguro, cadastrarSeguro, carregarDb, importarLote, inserirCliente, salvarModelo as salvarModeloRemoto,
  salvarRenovacao, type LoteImportacao,
} from './remote'

const CHAVE = 'crm-araujo-cruz:prototipo:v1'

const VAZIO: Db = { clientes: [], seguradoras: [], corretores: [], seguros: [], renovacoes: [], cotacoes: [], importacoes: [], modelos: [] }

function carregar(): Db {
  if (supabase) return VAZIO // os dados vêm do Supabase depois do login
  try {
    const salvo = localStorage.getItem(CHAVE)
    if (salvo) {
      const db = JSON.parse(salvo) as Db
      // Dados salvos antes dos modelos de importação; corretores cadastrados depois (ex.: Dani).
      const corretores = [...db.corretores, ...CORRETORES.filter((c) => !db.corretores.some((x) => x.id === c.id))]
      return { ...db, corretores, modelos: db.modelos ?? [] }
    }
  } catch {
    // storage indisponível ou corrompido: usa os dados de exemplo
  }
  return gerarDbExemplo()
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
  /** Grava uma importação inteira. Rejeita se falhar (nada é gravado pela metade). */
  importar: (lote: LoteImportacao) => Promise<void>
  /** Guarda como ler o relatório de uma seguradora (mapeamento de colunas). */
  salvarModelo: (m: ModeloImportacao, novo: boolean) => Promise<void>
  /** Cria ou atualiza um cliente. Rejeita se a gravação falhar. */
  salvarCliente: (c: Cliente, novo: boolean) => Promise<void>
  /** Novo seguro (com a renovação no fim da vigência) ou edição de um existente. */
  salvarSeguro: (s: Seguro, renovacao: Renovacao | null) => Promise<void>
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

  const importar = useCallback(async (lote: LoteImportacao) => {
    if (supabase) await importarLote(supabase, lote) // só atualiza a tela se gravou
    const juntar = <T extends { id: string }>(atuais: T[], novos: T[]) => {
      const porId = new Map(novos.map((x) => [x.id, x]))
      return [...atuais.map((x) => porId.get(x.id) ?? x), ...novos.filter((x) => !atuais.some((a) => a.id === x.id))]
    }
    setDb((atual) => ({
      ...atual,
      clientes: juntar(atual.clientes, lote.clientes),
      seguros: juntar(atual.seguros, lote.seguros),
      renovacoes: juntar(atual.renovacoes, lote.renovacoes),
      importacoes: [lote.importacao, ...atual.importacoes],
    }))
  }, [])

  const salvarModelo = useCallback(async (m: ModeloImportacao, novo: boolean) => {
    if (supabase) await salvarModeloRemoto(supabase, m, novo)
    setDb((atual) => ({ ...atual, modelos: novo ? [...atual.modelos, m] : atual.modelos.map((x) => (x.id === m.id ? m : x)) }))
  }, [])

  const salvarCliente = useCallback(async (c: Cliente, novo: boolean) => {
    if (supabase) await (novo ? inserirCliente(supabase, c) : atualizarCliente(supabase, c))
    setDb((atual) => ({
      ...atual,
      clientes: novo ? [...atual.clientes, c] : atual.clientes.map((x) => (x.id === c.id ? c : x)),
    }))
  }, [])

  const salvarSeguro = useCallback(async (s: Seguro, renovacao: Renovacao | null) => {
    if (supabase) await (renovacao ? cadastrarSeguro(supabase, s, renovacao) : atualizarSeguro(supabase, s))
    setDb((atual) => {
      if (renovacao) return { ...atual, seguros: [...atual.seguros, s], renovacoes: [...atual.renovacoes, renovacao] }
      return {
        ...atual,
        seguros: atual.seguros.map((x) => (x.id === s.id ? s : x)),
        renovacoes: atual.renovacoes.map((r) =>
          r.seguroId === s.id && (r.status === 'pendente' || r.status === 'cotando') ? { ...r, vencimento: s.fimVigencia } : r,
        ),
      }
    })
  }, [])

  const resetar = useCallback(() => {
    if (!supabase) setDb(gerarDbExemplo())
  }, [])

  const limparErro = useCallback(() => setErro(null), [])

  const value = useMemo(
    () => ({
      db, modo, carregando, erro, limparErro, recarregar, atualizarRenovacao, importar, salvarModelo, salvarCliente, salvarSeguro, resetar,
    }),
    [db, modo, carregando, erro, limparErro, recarregar, atualizarRenovacao, importar, salvarModelo, salvarCliente, salvarSeguro, resetar],
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
