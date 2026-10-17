// Edge Function: criação e ativação/desativação de usuários (Configurações > Usuários).
// Precisa da chave de serviço do Supabase, que nunca vai para o navegador: por isso fica aqui.
// Só administradores ativos podem chamar. docs/produto/features/003-configuracoes-usuarios.md
//
// Corpo da requisição (JSON):
//   { acao: 'criar', nome, email, funcao: 'administrativo' | 'corretora', acesso: 'administrador' | 'usuario', redirectTo? }
//   { acao: 'situacao', id, ativo }

import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const resposta = (status: number, corpo: Record<string, unknown>) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const FUNCOES = ['administrativo', 'corretora']
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Administrador do sistema = papel 'admin'; "Usuário" usa o papel 'corretor', que já grava na operação.
const PAPEL_POR_ACESSO: Record<string, string> = { administrador: 'admin', usuario: 'corretor' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return resposta(405, { erro: 'Método não permitido.' })

  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const chamador = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })
    const { data: sessao } = await chamador.auth.getUser()
    if (!sessao.user) return resposta(401, { erro: 'Sessão inválida.' })

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: quem } = await admin.from('perfis').select('papel, ativo').eq('id', sessao.user.id).single()
    if (!quem?.ativo || quem.papel !== 'admin') return resposta(403, { erro: 'Apenas administradores podem gerenciar usuários.' })

    const corpo = await req.json()

    if (corpo.acao === 'criar') {
      const nome = String(corpo.nome ?? '').trim()
      const email = String(corpo.email ?? '').trim().toLowerCase()
      const papel = PAPEL_POR_ACESSO[String(corpo.acesso)]
      if (!nome) return resposta(400, { erro: 'Informe o nome.' })
      if (!EMAIL.test(email)) return resposta(400, { erro: 'E-mail inválido.' })
      if (!FUNCOES.includes(corpo.funcao)) return resposta(400, { erro: 'Função inválida.' })
      if (!papel) return resposta(400, { erro: 'Acesso inválido.' })

      // convite: true marca que a pessoa ainda precisa definir a própria senha (o site pede no primeiro acesso).
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        data: { nome, convite: true },
        redirectTo: typeof corpo.redirectTo === 'string' ? corpo.redirectTo : undefined,
      })
      if (error || !data.user) {
        const jaExiste = error?.message?.toLowerCase().includes('already')
        return resposta(jaExiste ? 409 : 400, { erro: jaExiste ? 'Já existe um usuário com este e-mail.' : (error?.message ?? 'Falha ao convidar.') })
      }
      // O perfil nasce pelo trigger do Auth; função e acesso são gravados aqui, nunca vindos do navegador.
      const { error: erroPerfil } = await admin
        .from('perfis')
        .update({ nome, email, funcao: corpo.funcao, papel })
        .eq('id', data.user.id)
      if (erroPerfil) return resposta(500, { erro: erroPerfil.message })
      return resposta(200, { id: data.user.id })
    }

    if (corpo.acao === 'situacao') {
      const id = String(corpo.id ?? '')
      const ativo = corpo.ativo === true
      if (!id) return resposta(400, { erro: 'Usuário não informado.' })
      if (id === sessao.user.id && !ativo) return resposta(400, { erro: 'Você não pode desativar o próprio usuário.' })

      // O trigger perfis_guardar impede desativar o último administrador ativo.
      const { error: erroPerfil } = await admin.from('perfis').update({ ativo }).eq('id', id)
      if (erroPerfil) return resposta(400, { erro: erroPerfil.message })
      // Além de perder o acesso aos dados (RLS), a pessoa não consegue mais entrar.
      const { error: erroAuth } = await admin.auth.admin.updateUserById(id, { ban_duration: ativo ? 'none' : '876000h' })
      if (erroAuth) return resposta(500, { erro: erroAuth.message })
      return resposta(200, { ok: true })
    }

    return resposta(400, { erro: 'Ação desconhecida.' })
  } catch (e) {
    return resposta(500, { erro: e instanceof Error ? e.message : 'Erro inesperado.' })
  }
})
