import { Loader2, Plus, UserCog } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSessao } from '../auth/AuthGate'
import { AvisoPrototipo, BotaoPrimario, BotaoSecundario, Campo, Drawer, INPUT, PageHeader, TD, TH, Vazio } from '../components/ui'
import { atualizarUsuario, convidarUsuario, listarUsuarios, mudarSituacaoUsuario } from '../data/remote'
import type { Acesso, Funcao, Usuario } from '../domain/types'
import { FUNCAO_LABEL } from '../lib/atividades'
import { emailValido } from '../lib/validacao'
import { supabase } from '../lib/supabase'

const ACESSO_LABEL: Record<Acesso, string> = { administrador: 'Administrador', usuario: 'Usuário' }
const DEMO_CHAVE = 'crm-araujo-cruz:demo-usuarios:v1'

const DEMO_INICIAL: Usuario[] = [
  { id: 'demo', nome: 'Demonstração (você)', email: 'voce@exemplo.com', funcao: 'administrativo', acesso: 'administrador', ativo: true },
  { id: 'demo-2', nome: 'Pessoa Fictícia A', email: 'a@exemplo.com', funcao: 'corretora', acesso: 'usuario', ativo: true },
  { id: 'demo-3', nome: 'Pessoa Fictícia B', email: 'b@exemplo.com', funcao: 'administrativo', acesso: 'usuario', ativo: false },
]

function lerDemo(): Usuario[] {
  try {
    const salvo = localStorage.getItem(DEMO_CHAVE)
    if (salvo) return JSON.parse(salvo) as Usuario[]
  } catch {
    // storage indisponível ou corrompido: usa os fictícios
  }
  return DEMO_INICIAL
}

/** Lista e gravações de usuários: Supabase (via Edge Function para criar/desativar) ou lista fictícia local. */
function useUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>(supabase ? [] : lerDemo)
  const [carregando, setCarregando] = useState(supabase !== null)
  const [erro, setErro] = useState<string | null>(null)

  const recarregar = useCallback(async () => {
    if (!supabase) return
    setCarregando(true)
    try {
      setUsuarios(await listarUsuarios(supabase))
      setErro(null)
    } catch (e) {
      setErro(`Não foi possível carregar os usuários: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void recarregar()
  }, [recarregar])

  useEffect(() => {
    if (supabase) return
    try {
      localStorage.setItem(DEMO_CHAVE, JSON.stringify(usuarios))
    } catch {
      // sem persistência, segue em memória
    }
  }, [usuarios])

  const criar = async (u: Pick<Usuario, 'nome' | 'email' | 'funcao' | 'acesso'>) => {
    if (supabase) {
      await convidarUsuario(supabase, u)
      await recarregar()
    } else {
      if (usuarios.some((x) => x.email.toLowerCase() === u.email.toLowerCase())) throw new Error('Já existe um usuário com este e-mail.')
      setUsuarios((atual) => [...atual, { id: crypto.randomUUID(), ativo: true, ...u }])
    }
  }

  const editar = async (u: Pick<Usuario, 'id' | 'nome' | 'funcao' | 'acesso'>) => {
    if (supabase) {
      await atualizarUsuario(supabase, u)
      await recarregar()
    } else {
      setUsuarios((atual) => atual.map((x) => (x.id === u.id ? { ...x, ...u } : x)))
    }
  }

  const mudarSituacao = async (id: string, ativo: boolean) => {
    if (supabase) {
      await mudarSituacaoUsuario(supabase, id, ativo)
      await recarregar()
    } else {
      setUsuarios((atual) => atual.map((x) => (x.id === id ? { ...x, ativo } : x)))
    }
  }

  return { usuarios, carregando, erro, criar, editar, mudarSituacao }
}

function FormUsuario({ inicial, onSalvar, onCancelar }: {
  inicial: Usuario | null // null = novo
  onSalvar: (v: Pick<Usuario, 'nome' | 'email' | 'funcao' | 'acesso'>) => Promise<void>
  onCancelar: () => void
}) {
  const [nome, setNome] = useState(inicial?.nome ?? '')
  const [email, setEmail] = useState(inicial?.email ?? '')
  const [funcao, setFuncao] = useState<Funcao>(inicial?.funcao ?? 'administrativo')
  const [acesso, setAcesso] = useState<Acesso>(inicial?.acesso ?? 'usuario')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const salvar = async (e: FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) return setErro('Informe o nome.')
    if (!inicial && !emailValido(email)) return setErro('Informe um e-mail válido.')
    setEnviando(true)
    setErro(null)
    try {
      await onSalvar({ nome: nome.trim(), email: email.trim().toLowerCase(), funcao, acesso })
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err))
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={salvar} noValidate className="space-y-4">
      <Campo label="Nome" obrigatorio>
        <input className={INPUT} value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
      </Campo>
      <Campo
        label="E-mail"
        obrigatorio={!inicial}
        dica={inicial ? 'O e-mail não pode ser alterado.' : 'A pessoa recebe um convite por e-mail para definir a própria senha.'}
      >
        <input className={INPUT} type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!!inicial} />
      </Campo>
      <Campo label="Função" obrigatorio dica="Define quais atividades aparecem em “Minhas atividades”.">
        <select className={INPUT} value={funcao} onChange={(e) => setFuncao(e.target.value as Funcao)}>
          {(Object.keys(FUNCAO_LABEL) as Funcao[]).map((f) => <option key={f} value={f}>{FUNCAO_LABEL[f]}</option>)}
        </select>
      </Campo>
      <Campo label="Acesso" obrigatorio dica="Administradores também gerenciam usuários e veem as atividades das duas funções.">
        <select className={INPUT} value={acesso} onChange={(e) => setAcesso(e.target.value as Acesso)}>
          {(Object.keys(ACESSO_LABEL) as Acesso[]).map((a) => <option key={a} value={a}>{ACESSO_LABEL[a]}</option>)}
        </select>
      </Campo>
      {erro && <p role="alert" className="text-sm text-rose-700">{erro}</p>}
      <div className="flex gap-2 pt-2">
        <BotaoPrimario type="submit" disabled={enviando} className="flex-1">
          {enviando && <Loader2 className="size-4 animate-spin" />}
          {inicial ? 'Salvar alterações' : 'Criar e enviar convite'}
        </BotaoPrimario>
        <BotaoSecundario type="button" onClick={onCancelar}>Cancelar</BotaoSecundario>
      </div>
    </form>
  )
}

function SecaoUsuarios() {
  const { id: meuId } = useSessao()
  const { usuarios, carregando, erro, criar, editar, mudarSituacao } = useUsuarios()
  const [formulario, setFormulario] = useState<{ usuario: Usuario | null } | null>(null)
  const [avisoAcao, setAvisoAcao] = useState<string | null>(null)

  const adminsAtivos = useMemo(() => usuarios.filter((u) => u.acesso === 'administrador' && u.ativo), [usuarios])
  const ultimoAdmin = (u: Usuario) => u.acesso === 'administrador' && u.ativo && adminsAtivos.length <= 1

  const alternar = async (u: Usuario) => {
    setAvisoAcao(null)
    try {
      await mudarSituacao(u.id, !u.ativo)
    } catch (e) {
      setAvisoAcao(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Usuários</h2>
          <p className="text-sm text-slate-500">Quem acessa o sistema, com qual função e com qual acesso.</p>
        </div>
        <BotaoPrimario onClick={() => setFormulario({ usuario: null })}><Plus className="size-4" /> Novo usuário</BotaoPrimario>
      </div>

      {!supabase && <AvisoPrototipo>Modo demonstração: estes usuários são fictícios e ficam só neste navegador. Nenhum convite é enviado.</AvisoPrototipo>}
      {(erro || avisoAcao) && <p role="alert" className="rounded-lg bg-rose-50 px-4 py-2.5 text-sm text-rose-800 ring-1 ring-rose-200">{erro ?? avisoAcao}</p>}

      {carregando ? (
        <div className="grid h-40 place-items-center text-slate-500"><Loader2 className="size-6 animate-spin" /></div>
      ) : usuarios.length === 0 ? (
        <Vazio>Nenhum usuário cadastrado.</Vazio>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200/70">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className={TH}>Nome</th><th className={TH}>E-mail</th><th className={TH}>Função</th>
                <th className={TH}>Acesso</th><th className={TH}>Situação</th><th className={TH} />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usuarios.map((u) => {
                const eu = u.id === meuId
                const semDesativar = eu || ultimoAdmin(u)
                return (
                  <tr key={u.id} className={u.ativo ? '' : 'text-slate-400'}>
                    <td className={`${TD} font-medium`}>{u.nome}{eu && <span className="ml-2 text-xs font-normal text-slate-400">você</span>}</td>
                    <td className={TD}>{u.email}</td>
                    <td className={TD}>{FUNCAO_LABEL[u.funcao]}</td>
                    <td className={TD}>{ACESSO_LABEL[u.acesso]}</td>
                    <td className={TD}>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${u.ativo ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-slate-300'}`}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className={`${TD} whitespace-nowrap text-right`}>
                      <button onClick={() => setFormulario({ usuario: u })} className="mr-3 text-sm text-marca-600 hover:underline">Editar</button>
                      <button
                        onClick={() => void alternar(u)}
                        disabled={u.ativo && semDesativar}
                        title={u.ativo && semDesativar ? (eu ? 'Você não pode desativar o próprio usuário.' : 'Mantenha ao menos um administrador ativo.') : undefined}
                        className="text-sm text-slate-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline"
                      >
                        {u.ativo ? 'Desativar' : 'Reativar'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Drawer aberto={formulario != null} onFechar={() => setFormulario(null)} titulo={formulario?.usuario ? 'Editar usuário' : 'Novo usuário'}>
        {formulario && (
          <FormUsuario
            key={formulario.usuario?.id ?? 'novo'}
            inicial={formulario.usuario}
            onCancelar={() => setFormulario(null)}
            onSalvar={async (v) => {
              const atual = formulario.usuario
              if (atual) {
                if (ultimoAdmin(atual) && v.acesso !== 'administrador') throw new Error('Mantenha ao menos um administrador ativo.')
                await editar({ id: atual.id, nome: v.nome, funcao: v.funcao, acesso: v.acesso })
              } else {
                await criar(v)
              }
              setFormulario(null)
            }}
          />
        )}
      </Drawer>
    </section>
  )
}

export default function Configuracoes() {
  return (
    <>
      <PageHeader titulo="Configurações" subtitulo="Ajustes do sistema" />
      <div className="grid grid-cols-[12rem_1fr] gap-8 px-8 py-6">
        <nav aria-label="Seções de configuração">
          <span className="flex items-center gap-2 rounded-lg bg-marca-50 px-3 py-2 text-sm font-medium text-marca-700">
            <UserCog className="size-4" /> Usuários
          </span>
        </nav>
        <SecaoUsuarios />
      </div>
    </>
  )
}
