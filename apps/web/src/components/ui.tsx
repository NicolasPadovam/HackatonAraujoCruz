import { Car, HeartPulse, Home, Shield, X, type LucideIcon } from 'lucide-react'
import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react'
import type { Ramo, StatusRenovacao } from '../domain/types'

export const STATUS: Record<StatusRenovacao, { label: string; classe: string; ponto: string }> = {
  pendente: { label: 'Pendente', classe: 'bg-amber-50 text-amber-800 ring-amber-200', ponto: 'bg-amber-500' },
  cotando: { label: 'Cotando', classe: 'bg-sky-50 text-sky-800 ring-sky-200', ponto: 'bg-sky-500' },
  renovada: { label: 'Renovada', classe: 'bg-emerald-50 text-emerald-800 ring-emerald-200', ponto: 'bg-emerald-500' },
  nao_renovada: { label: 'Não renovada', classe: 'bg-rose-50 text-rose-800 ring-rose-200', ponto: 'bg-rose-500' },
}

export const RAMO: Record<Ramo, { label: string; icone: LucideIcon; classe: string }> = {
  residencial: { label: 'Residencial', icone: Home, classe: 'bg-violet-50 text-violet-700' },
  auto: { label: 'Auto', icone: Car, classe: 'bg-slate-100 text-slate-700' },
  vida: { label: 'Vida', icone: HeartPulse, classe: 'bg-pink-50 text-pink-700' },
  outro: { label: 'Outro', icone: Shield, classe: 'bg-slate-100 text-slate-700' },
}

export function StatusBadge({ status }: { status: StatusRenovacao }) {
  const s = STATUS[status]
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${s.classe}`}>
      <span className={`size-1.5 rounded-full ${s.ponto}`} />
      {s.label}
    </span>
  )
}

export function RamoBadge({ ramo, compacto = false }: { ramo: Ramo; compacto?: boolean }) {
  const r = RAMO[ramo]
  const Icone = r.icone
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium ${r.classe}`}>
      <Icone className="size-3.5" />
      {!compacto && r.label}
    </span>
  )
}

export function PageHeader({ titulo, subtitulo, direita, voltar }: {
  titulo: string; subtitulo?: string; direita?: ReactNode; voltar?: ReactNode
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-8 py-5 backdrop-blur">
      {voltar}
      <div className="flex items-center justify-between gap-6">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{titulo}</h1>
          {subtitulo && <p className="text-sm text-slate-500">{subtitulo}</p>}
        </div>
        {direita && <div className="flex shrink-0 items-center gap-2">{direita}</div>}
      </div>
    </header>
  )
}

export interface Opcao<T extends string> {
  valor: T
  label: string
  contagem?: number
}

/** Controle segmentado (filtros). */
export function Segmentos<T extends string>({
  opcoes, valor, onChange,
}: { opcoes: Opcao<T>[]; valor: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
      {opcoes.map((o) => {
        const ativo = o.valor === valor
        return (
          <button
            key={o.valor}
            onClick={() => onChange(o.valor)}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition ${
              ativo ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {o.label}
            {o.contagem != null && <span className="ml-1.5 text-slate-400">{o.contagem}</span>}
          </button>
        )
      })}
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 ${className}`}>{children}</div>
}

export function Secao({ titulo, children, acao }: { titulo: string; children: ReactNode; acao?: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{titulo}</h2>
        {acao}
      </div>
      {children}
    </section>
  )
}

export function Avatar({ texto, cor = 'bg-marca-100 text-marca-700', tamanho = 'size-9' }: { texto: string; cor?: string; tamanho?: string }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-full text-sm font-semibold ${tamanho} ${cor}`}>{texto}</span>
  )
}

/** Painel lateral à direita (detalhes sem sair da lista). */
export function Drawer({ aberto, onFechar, titulo, children, largura = 'max-w-md', rodape }: {
  aberto: boolean; onFechar: () => void; titulo: string; children: ReactNode; largura?: string; rodape?: ReactNode
}) {
  useEffect(() => {
    if (!aberto) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [aberto, onFechar])

  if (!aberto) return null
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button aria-label="Fechar" className="absolute inset-0 bg-slate-900/30" onClick={onFechar} />
      <aside className={`relative flex h-full w-full ${largura} flex-col bg-white shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="truncate text-lg font-semibold">{titulo}</h3>
          <button onClick={onFechar} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100" title="Fechar (Esc)">
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {rodape && <div className="border-t border-slate-200 bg-slate-50 px-6 py-3">{rodape}</div>}
      </aside>
    </div>
  )
}

export function Vazio({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">{children}</p>
}

export function AvisoPrototipo({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-900 ring-1 ring-amber-200">{children}</div>
  )
}

export function Select({ value, onChange, children, className = '' }: {
  value: string; onChange: (v: string) => void; children: ReactNode; className?: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-slate-200 focus:ring-2 focus:ring-marca-500 ${className}`}
    >
      {children}
    </select>
  )
}

export const INPUT =
  'w-full rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-marca-500 aria-[invalid=true]:ring-rose-400'

export function Campo({ label, obrigatorio, erro, dica, children, className = '' }: {
  label: string; obrigatorio?: boolean; erro?: string | null; dica?: ReactNode; children: ReactNode; className?: string
}) {
  return (
    <label className={`block space-y-1 ${className}`}>
      <span className="text-sm font-medium text-slate-700">
        {label}{obrigatorio && <span className="text-rose-500"> *</span>}
      </span>
      {children}
      {erro ? <span className="block text-xs text-rose-600">{erro}</span> : dica && <span className="block text-xs text-slate-500">{dica}</span>}
    </label>
  )
}

export function BotaoPrimario({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-marca-700 px-4 py-2 text-sm font-semibold text-white hover:bg-marca-600 disabled:opacity-60 ${props.className ?? ''}`}
    >
      {children}
    </button>
  )
}

export function BotaoSecundario({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-60 ${props.className ?? ''}`}
    >
      {children}
    </button>
  )
}

/** Estilos de tabela compartilhados. */
export const TH = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'
export const TD = 'px-4 py-3 text-sm'
