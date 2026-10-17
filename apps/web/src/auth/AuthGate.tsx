import type { Session } from '@supabase/supabase-js'
import { Loader2, LogIn } from 'lucide-react'
import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'

interface Sessao {
  email: string | null
  sair: () => void
}

const Ctx = createContext<Sessao>({ email: null, sair: () => {} })

/** Dados do usuário logado (email nulo no modo demonstração). */
export const useSessao = () => useContext(Ctx)

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

/** Com Supabase configurado, exige login. Sem ele, libera o modo demonstração. */
export default function AuthGate({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null)
  const [verificando, setVerificando] = useState(supabase !== null)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session)
      setVerificando(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_evento, nova) => setSessao(nova))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!supabase) return <Ctx.Provider value={{ email: null, sair: () => {} }}>{children}</Ctx.Provider>
  if (verificando) return <div className="grid min-h-screen place-items-center text-slate-500"><Loader2 className="size-6 animate-spin" /></div>
  if (!sessao) return <Login />

  return (
    <Ctx.Provider value={{ email: sessao.user.email ?? null, sair: () => void supabase!.auth.signOut() }}>
      {children}
    </Ctx.Provider>
  )
}
