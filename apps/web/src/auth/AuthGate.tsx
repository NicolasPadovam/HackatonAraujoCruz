import type { Session } from '@supabase/supabase-js'
import { Loader2, LogIn } from 'lucide-react'
import { createContext, useContext, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { carregarPerfil } from '../data/remote'
import type { Acesso, Funcao, Usuario } from '../domain/types'
import { supabase } from '../lib/supabase'

export interface Sessao {
  id: string | null
  email: string | null
  nome: string
  /** Define as atividades mostradas em Início (docs/produto/features/002). */
  funcao: Funcao
  /** Administrador também gerencia usuários em Configurações (docs/produto/features/003). */
  acesso: Acesso
  sair: () => void
  /** Só no modo demonstração: permite experimentar cada visão sem login. */
  trocarVisao?: (v: { funcao: Funcao; acesso: Acesso }) => void
}

const DEMO_CHAVE = 'crm-araujo-cruz:demo-visao:v1'

const Ctx = createContext<Sessao>({ id: null, email: null, nome: 'Você', funcao: 'administrativo', acesso: 'usuario', sair: () => {} })

/** Dados do usuário logado (e-mail nulo no modo demonstração). */
// eslint-disable-next-line react-refresh/only-export-components
export const useSessao = () => useContext(Ctx)

function lerVisaoDemo(): { funcao: Funcao; acesso: Acesso } {
  try {
    const v = JSON.parse(localStorage.getItem(DEMO_CHAVE) ?? 'null')
    if ((v?.funcao === 'administrativo' || v?.funcao === 'corretora') && (v?.acesso === 'administrador' || v?.acesso === 'usuario')) return v
  } catch {
    // storage indisponível ou corrompido: usa o padrão
  }
  return { funcao: 'administrativo', acesso: 'administrador' }
}

function ProvedorDemo({ children }: { children: ReactNode }) {
  const [visao, setVisao] = useState(lerVisaoDemo)
  const valor = useMemo<Sessao>(
    () => ({
      id: 'demo',
      email: null,
      nome: 'Demonstração',
      ...visao,
      sair: () => {},
      trocarVisao: (v) => {
        setVisao(v)
        try {
          localStorage.setItem(DEMO_CHAVE, JSON.stringify(v))
        } catch {
          // sem persistência, segue em memória
        }
      },
    }),
    [visao],
  )
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

function Cartao({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <div className="w-full max-w-sm space-y-5 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200/70">{children}</div>
    </div>
  )
}

function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const entrar = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setEnviando(true)
    setErro(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
    if (error) setErro('E-mail ou senha incorretos.') // mensagem genérica: não revela se o e-mail existe
    setEnviando(false)
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <form onSubmit={entrar} className="w-full max-w-sm space-y-5 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200/70">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-marca-700 text-sm font-bold text-white">AC</span>
          <div className="leading-tight">
            <p className="font-semibold text-slate-900">Araújo Cruz</p>
            <p className="text-sm text-slate-500">CRM de seguros</p>
          </div>
        </div>
        <label className="block space-y-1.5 text-sm font-medium text-slate-700">
          E-mail
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border-0 px-3 py-2 ring-1 ring-slate-300 focus:ring-2 focus:ring-marca-600 focus:outline-none"
          />
        </label>
        <label className="block space-y-1.5 text-sm font-medium text-slate-700">
          Senha
          <input
            type="password"
            required
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full rounded-lg border-0 px-3 py-2 ring-1 ring-slate-300 focus:ring-2 focus:ring-marca-600 focus:outline-none"
          />
        </label>
        {erro && <p role="alert" className="text-sm text-rose-700">{erro}</p>}
        <button
          type="submit"
          disabled={enviando}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-marca-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-marca-600 disabled:opacity-60"
        >
          {enviando ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
          Entrar
        </button>
        <p className="text-xs text-slate-500">Acesso restrito à equipe. Não há cadastro público: peça a um administrador.</p>
      </form>
    </div>
  )
}

/** Primeiro acesso por convite: a pessoa define a própria senha (o administrador nunca a vê). */
function DefinirSenha({ onConcluir }: { onConcluir: () => void }) {
  const [senha, setSenha] = useState('')
  const [repete, setRepete] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const salvar = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    if (senha.length < 8) return setErro('Use ao menos 8 caracteres.')
    if (senha !== repete) return setErro('As senhas não conferem.')
    setEnviando(true)
    setErro(null)
    const { error } = await supabase.auth.updateUser({ password: senha, data: { convite: false } })
    setEnviando(false)
    if (error) return setErro('Não foi possível salvar a senha. Tente de novo.')
    onConcluir()
  }

  const campo = 'w-full rounded-lg border-0 px-3 py-2 ring-1 ring-slate-300 focus:ring-2 focus:ring-marca-600 focus:outline-none'
  return (
    <Cartao>
      <form onSubmit={salvar} className="space-y-5">
        <div>
          <p className="font-semibold text-slate-900">Bem-vindo(a)!</p>
          <p className="text-sm text-slate-500">Defina uma senha para acessar o CRM.</p>
        </div>
        <label className="block space-y-1.5 text-sm font-medium text-slate-700">
          Nova senha
          <input type="password" required autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} className={campo} />
        </label>
        <label className="block space-y-1.5 text-sm font-medium text-slate-700">
          Repita a senha
          <input type="password" required autoComplete="new-password" value={repete} onChange={(e) => setRepete(e.target.value)} className={campo} />
        </label>
        {erro && <p role="alert" className="text-sm text-rose-700">{erro}</p>}
        <button
          type="submit"
          disabled={enviando}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-marca-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-marca-600 disabled:opacity-60"
        >
          {enviando && <Loader2 className="size-4 animate-spin" />}
          Salvar senha e entrar
        </button>
      </form>
    </Cartao>
  )
}

function SemAcesso({ sair }: { sair: () => void }) {
  return (
    <Cartao>
      <p className="font-semibold text-slate-900">Acesso indisponível</p>
      <p className="text-sm text-slate-600">Seu usuário está desativado ou ainda não tem perfil. Fale com um administrador.</p>
      <button onClick={sair} className="text-sm font-medium text-marca-600 hover:underline">Sair</button>
    </Cartao>
  )
}

/** Com Supabase configurado, exige login. Sem ele, libera o modo demonstração. */
export default function AuthGate({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null)
  const [verificando, setVerificando] = useState(supabase !== null)
  const [perfil, setPerfil] = useState<Usuario | null | undefined>(undefined) // undefined = carregando
  const [convite, setConvite] = useState(false)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session)
      setVerificando(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_evento, nova) => setSessao(nova))
    return () => data.subscription.unsubscribe()
  }, [])

  const usuarioId = sessao?.user.id
  const veioDeConvite = sessao?.user.user_metadata?.convite === true
  useEffect(() => {
    setConvite(veioDeConvite)
  }, [veioDeConvite])

  useEffect(() => {
    if (!supabase || !usuarioId) return
    let cancelado = false
    setPerfil(undefined)
    carregarPerfil(supabase, usuarioId)
      .then((p) => { if (!cancelado) setPerfil(p) })
      .catch(() => { if (!cancelado) setPerfil(null) })
    return () => { cancelado = true }
  }, [usuarioId])

  if (!supabase) return <ProvedorDemo>{children}</ProvedorDemo>
  if (verificando) return <div className="grid min-h-screen place-items-center text-slate-500"><Loader2 className="size-6 animate-spin" /></div>
  if (!sessao) return <Login />
  const sair = () => void supabase!.auth.signOut()
  if (convite) return <DefinirSenha onConcluir={() => setConvite(false)} />
  if (perfil === undefined) return <div className="grid min-h-screen place-items-center text-slate-500"><Loader2 className="size-6 animate-spin" /></div>
  if (!perfil || !perfil.ativo) return <SemAcesso sair={sair} />

  return (
    <Ctx.Provider value={{ id: sessao.user.id, email: sessao.user.email ?? null, nome: perfil.nome, funcao: perfil.funcao, acesso: perfil.acesso, sair }}>
      {children}
    </Ctx.Provider>
  )
}
