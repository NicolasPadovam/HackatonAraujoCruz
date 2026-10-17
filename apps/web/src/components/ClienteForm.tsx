import { AlertTriangle, Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Cliente, OrigemCliente, TipoPessoa } from '../domain/types'
import { useStore } from '../data/store'
import { normalizarNome } from '../lib/format'
import { cnpjValido, cpfValido, emailValido, fmtCpfCnpj, fmtTelefone, somenteDigitos } from '../lib/validacao'
import { limparErros, montarSeguro, SeguroCampos, validarSeguro, valoresIniciais, type ErrosSeguro, type SeguroValores } from './SeguroCampos'
import { BotaoPrimario, BotaoSecundario, Campo, Drawer, INPUT, Segmentos } from './ui'

interface Valores {
  tipo: TipoPessoa
  nome: string
  cpfCnpj: string
  telefone: string
  email: string
  origem: OrigemCliente
  observacoes: string
}

type ErrosCliente = Partial<Record<keyof Valores, string>>

function iniciais(c?: Cliente): Valores {
  return {
    tipo: c?.tipo ?? (c?.cpfCnpj?.length === 14 ? 'juridica' : 'fisica'),
    nome: c?.nome ?? '',
    cpfCnpj: fmtCpfCnpj(c?.cpfCnpj),
    telefone: c?.telefone ?? '',
    email: c?.email ?? '',
    origem: c?.origem ?? 'carteira',
    observacoes: c?.observacoes ?? '',
  }
}

/**
 * Cadastro e edição de cliente. No cadastro, permite incluir o primeiro seguro
 * (que já gera a renovação) e "Salvar e cadastrar outro" para carga em lote.
 */
export function ClienteForm({ aberto, onFechar, cliente, onSalvo }: {
  aberto: boolean
  onFechar: () => void
  cliente?: Cliente
  onSalvo?: (id: string, continuar: boolean) => void
}) {
  const { db, salvarCliente, salvarSeguro } = useStore()
  const novo = !cliente
  const [v, setV] = useState<Valores>(() => iniciais(cliente))
  const [comSeguro, setComSeguro] = useState(true)
  const [seguro, setSeguro] = useState<SeguroValores>(() => valoresIniciais(db))
  const [erros, setErros] = useState<ErrosCliente>({})
  const [errosSeguro, setErrosSeguro] = useState<ErrosSeguro>({})
  const [outroCliente, setOutroCliente] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erroGravacao, setErroGravacao] = useState<string | null>(null)
  // Se o cliente gravou e o seguro falhou, a nova tentativa grava só o seguro.
  const [clienteGravado, setClienteGravado] = useState<Cliente | null>(null)
  const [ultimoSalvo, setUltimoSalvo] = useState<string | null>(null)

  useEffect(() => {
    if (!aberto) return
    setV(iniciais(cliente))
    setSeguro(valoresIniciais(db))
    setErros({})
    setErrosSeguro({})
    setOutroCliente(false)
    setErroGravacao(null)
    setClienteGravado(null)
    setUltimoSalvo(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reinicia só ao abrir
  }, [aberto, cliente?.id])

  const set = <K extends keyof Valores>(k: K, valor: Valores[K]) => {
    setV((atual) => ({ ...atual, [k]: valor }))
    setErros((e) => ({ ...e, [k]: undefined }))
  }

  const homonimo = useMemo(() => {
    const k = normalizarNome(v.nome)
    if (!k) return undefined
    return db.clientes.find((c) => c.id !== cliente?.id && normalizarNome(c.nome) === k)
  }, [db.clientes, v.nome, cliente?.id])

  const validar = (): ErrosCliente => {
    const e: ErrosCliente = {}
    if (!v.nome.trim()) e.nome = 'Informe o nome.'
    const doc = somenteDigitos(v.cpfCnpj)
    if (doc) {
      if (v.tipo === 'fisica' && !cpfValido(doc)) e.cpfCnpj = 'CPF inválido.'
      if (v.tipo === 'juridica' && !cnpjValido(doc)) e.cpfCnpj = 'CNPJ inválido.'
      const dono = db.clientes.find((c) => c.id !== cliente?.id && c.cpfCnpj === doc)
      if (!e.cpfCnpj && dono) e.cpfCnpj = `Já cadastrado para ${dono.nome}.`
    }
    if (v.email.trim() && !emailValido(v.email)) e.email = 'E-mail inválido.'
    const tel = somenteDigitos(v.telefone)
    if (tel && tel.length !== 10 && tel.length !== 11) e.telefone = 'Use DDD + número.'
    return e
  }

  const salvar = async (continuar: boolean) => {
    const e = validar()
    const es = novo && comSeguro ? validarSeguro(seguro) : {}
    setErros(e)
    setErrosSeguro(es)
    if (Object.keys(e).length || Object.keys(es).length) return
    if (homonimo && !outroCliente && !clienteGravado) {
      setErroGravacao('Já existe um cliente com este nome. Confirme abaixo que é outra pessoa, ou abra o cadastro existente.')
      return
    }

    const doc = somenteDigitos(v.cpfCnpj)
    const dados: Cliente = {
      id: clienteGravado?.id ?? cliente?.id ?? crypto.randomUUID(),
      tipo: v.tipo,
      nome: v.nome.trim().replace(/\s+/g, ' '),
      cpfCnpj: doc || undefined,
      telefone: v.telefone.trim() ? fmtTelefone(v.telefone) : undefined,
      email: v.email.trim() || undefined,
      origem: v.origem,
      observacoes: v.observacoes.trim() || undefined,
    }

    setSalvando(true)
    setErroGravacao(null)
    try {
      if (!clienteGravado) {
        await salvarCliente(dados, novo)
        setClienteGravado(dados)
      }
      if (novo && comSeguro) {
        const { seguro: s, renovacao } = montarSeguro(seguro, dados.id)
        try {
          await salvarSeguro(s, renovacao)
        } catch (err) {
          throw new Error(`O cliente foi salvo, mas o seguro não: ${err instanceof Error ? err.message : String(err)}`)
        }
      }
      onSalvo?.(dados.id, continuar)
      if (continuar) {
        setUltimoSalvo(dados.nome)
        setV({ ...iniciais(), tipo: v.tipo, origem: v.origem })
        setSeguro({ ...valoresIniciais(db), ramo: seguro.ramo, corretorId: seguro.corretorId })
        setOutroCliente(false)
        setClienteGravado(null)
      } else {
        onFechar()
      }
    } catch (err) {
      setErroGravacao(err instanceof Error ? err.message : String(err))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Drawer
      aberto={aberto}
      onFechar={onFechar}
      titulo={novo ? 'Novo cliente' : `Editar ${cliente?.nome ?? ''}`}
      largura="max-w-2xl"
      rodape={
        <div className="flex items-center justify-end gap-2">
          <BotaoSecundario onClick={onFechar} disabled={salvando}>Cancelar</BotaoSecundario>
          {novo && <BotaoSecundario onClick={() => void salvar(true)} disabled={salvando}>Salvar e cadastrar outro</BotaoSecundario>}
          <BotaoPrimario onClick={() => void salvar(false)} disabled={salvando}>
            {salvando && <Loader2 className="size-4 animate-spin" />} {clienteGravado ? 'Tentar salvar o seguro de novo' : 'Salvar'}
          </BotaoPrimario>
        </div>
      }
    >
      <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); void salvar(false) }}>
        {ultimoSalvo && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-200">
            {ultimoSalvo} salvo. Pode cadastrar o próximo.
          </p>
        )}

        <fieldset className="space-y-4" disabled={!!clienteGravado}>
          <div className="flex items-center justify-between">
            <legend className="text-sm font-semibold uppercase tracking-wide text-slate-500">Cliente</legend>
            <Segmentos
              valor={v.tipo}
              onChange={(t) => set('tipo', t)}
              opcoes={[{ valor: 'fisica', label: 'Pessoa física' }, { valor: 'juridica', label: 'Pessoa jurídica' }]}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Campo label={v.tipo === 'fisica' ? 'Nome completo' : 'Razão social'} obrigatorio erro={erros.nome} className="col-span-2">
              <input autoFocus className={INPUT} aria-invalid={!!erros.nome} value={v.nome} onChange={(e) => { set('nome', e.target.value); setOutroCliente(false) }} />
            </Campo>
            {homonimo && !clienteGravado && (
              <div className="col-span-2 space-y-2 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-900 ring-1 ring-amber-200">
                <p>
                  <AlertTriangle className="mr-1.5 inline size-4 -translate-y-px" />
                  Já existe um cliente com este nome:{' '}
                  <Link to={`/clientes/${homonimo.id}`} onClick={onFechar} className="font-semibold underline">{homonimo.nome}</Link>.
                  {novo && ' Para adicionar outro seguro a ele, abra o cadastro existente.'}
                </p>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={outroCliente} onChange={(e) => setOutroCliente(e.target.checked)} />
                  É outra pessoa com o mesmo nome
                </label>
              </div>
            )}
            <Campo label={v.tipo === 'fisica' ? 'CPF' : 'CNPJ'} erro={erros.cpfCnpj}>
              <input
                inputMode="numeric"
                className={INPUT}
                aria-invalid={!!erros.cpfCnpj}
                value={v.cpfCnpj}
                onChange={(e) => set('cpfCnpj', e.target.value)}
                onBlur={() => set('cpfCnpj', fmtCpfCnpj(v.cpfCnpj))}
                placeholder={v.tipo === 'fisica' ? '000.000.000-00' : '00.000.000/0000-00'}
              />
            </Campo>
            <Campo label="Origem">
              <select className={INPUT} value={v.origem} onChange={(e) => set('origem', e.target.value as OrigemCliente)}>
                <option value="carteira">Carteira</option>
                <option value="indicacao">Indicação</option>
                <option value="marketing">Marketing</option>
              </select>
            </Campo>
            <Campo label="Telefone / WhatsApp" erro={erros.telefone}>
              <input
                inputMode="tel"
                className={INPUT}
                aria-invalid={!!erros.telefone}
                value={v.telefone}
                onChange={(e) => set('telefone', e.target.value)}
                onBlur={() => v.telefone && set('telefone', fmtTelefone(v.telefone))}
                placeholder="(11) 90000-0000"
              />
            </Campo>
            <Campo label="E-mail" erro={erros.email}>
              <input type="email" className={INPUT} aria-invalid={!!erros.email} value={v.email} onChange={(e) => set('email', e.target.value)} />
            </Campo>
            <Campo label="Observações" className="col-span-2">
              <textarea rows={2} className={INPUT} value={v.observacoes} onChange={(e) => set('observacoes', e.target.value)} />
            </Campo>
          </div>
        </fieldset>

        {novo && (
          <fieldset className="space-y-4 border-t border-slate-200 pt-5">
            <label className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              <input type="checkbox" checked={comSeguro} onChange={(e) => setComSeguro(e.target.checked)} disabled={!!clienteGravado} />
              Cadastrar também um seguro
            </label>
            {comSeguro && <SeguroCampos db={db} valores={seguro} onChange={(nv) => { setErrosSeguro((e) => limparErros(e, seguro, nv)); setSeguro(nv) }} erros={errosSeguro} novo />}
          </fieldset>
        )}

        {erroGravacao && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-rose-200">{erroGravacao}</p>}
        <button type="submit" className="hidden" />
      </form>
    </Drawer>
  )
}
