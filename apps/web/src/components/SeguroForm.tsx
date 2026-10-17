import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Seguro } from '../domain/types'
import { useStore } from '../data/store'
import { limparErros, montarSeguro, SeguroCampos, validarSeguro, valoresIniciais, type ErrosSeguro, type SeguroValores } from './SeguroCampos'
import { BotaoPrimario, BotaoSecundario, Drawer } from './ui'

/** Adicionar seguro a um cliente (gera a renovação) ou editar um seguro existente. */
export function SeguroForm({ aberto, onFechar, clienteId, clienteNome, seguro }: {
  aberto: boolean
  onFechar: () => void
  clienteId: string
  clienteNome: string
  seguro?: Seguro
}) {
  const { db, salvarSeguro } = useStore()
  const [v, setV] = useState<SeguroValores>(() => valoresIniciais(db, seguro))
  const [erros, setErros] = useState<ErrosSeguro>({})
  const [salvando, setSalvando] = useState(false)
  const [erroGravacao, setErroGravacao] = useState<string | null>(null)

  useEffect(() => {
    if (!aberto) return
    setV(valoresIniciais(db, seguro))
    setErros({})
    setErroGravacao(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reinicia só ao abrir
  }, [aberto, seguro?.id])

  const salvar = async () => {
    const e = validarSeguro(v)
    setErros(e)
    if (Object.keys(e).length) return
    const { seguro: s, renovacao } = montarSeguro(v, clienteId, seguro)
    setSalvando(true)
    setErroGravacao(null)
    try {
      await salvarSeguro(s, renovacao)
      onFechar()
    } catch (err) {
      setErroGravacao(`Nada foi salvo. ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Drawer
      aberto={aberto}
      onFechar={onFechar}
      titulo={seguro ? `Editar seguro · ${clienteNome}` : `Novo seguro · ${clienteNome}`}
      largura="max-w-2xl"
      rodape={
        <div className="flex justify-end gap-2">
          <BotaoSecundario onClick={onFechar} disabled={salvando}>Cancelar</BotaoSecundario>
          <BotaoPrimario onClick={() => void salvar()} disabled={salvando}>
            {salvando && <Loader2 className="size-4 animate-spin" />} Salvar
          </BotaoPrimario>
        </div>
      }
    >
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void salvar() }}>
        <SeguroCampos db={db} valores={v} onChange={(nv) => { setErros((e) => limparErros(e, v, nv)); setV(nv) }} erros={erros} novo={!seguro} />
        {erroGravacao && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-rose-200">{erroGravacao}</p>}
        <button type="submit" className="hidden" />
      </form>
    </Drawer>
  )
}
