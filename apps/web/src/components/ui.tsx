import { Car, HeartPulse, Home, Shield, X, type LucideIcon } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
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
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${s.classe}`}>
      <span className={`size-1.5 rounded-full ${s.ponto}`} />
      {s.label}
    </span>
  )
}

export function RamoBadge({ ramo, compacto = false }: { ramo: Ramo; compacto?: boolean }) {
  const r = RAMO[ramo]
  const Icone = r.icone
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ${r.classe}`}>
      <Icone className="size-3.5" />
      {!compacto && r.label}
    </span>
  )
}

export function PageHeader({ titulo, subtitulo, direita }: { titulo: string; subtitulo?: string; direita?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 bg-marca-700 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] text-white">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold">{titulo}</h1>
          {subtitulo && <p className="text-sm text-marca-100">{subtitulo}</p>}
        </div>
        {direita}
      </div>
    </header>
  )
}

export interface Opcao<T extends string> {
  valor: T
  label: string
  contagem?: number
}

export function Chips<T extends string>({
  opcoes, valor, onChange, escuro = false,
}: { opcoes: Opcao<T>[]; valor: T; onChange: (v: T) => void; escuro?: boolean }) {
  return (
    <div className="scroll-x -mx-4 flex gap-2 overflow-x-auto px-4">
      {opcoes.map((o) => {
        const ativo = o.valor === valor
        const base = escuro
          ? ativo ? 'bg-white text-marca-700' : 'bg-marca-600 text-marca-50'
          : ativo ? 'bg-marca-700 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'
        return (
          <button
            key={o.valor}
            onClick={() => onChange(o.valor)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${base}`}
          >
            {o.label}
            {o.contagem != null && <span className="ml-1.5 opacity-70">{o.contagem}</span>}
          </button>
        )
      })}
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 ${className}`}>{children}</div>
}

export function Secao({ titulo, children, acao }: { titulo: string; children: ReactNode; acao?: ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{titulo}</h2>
        {acao}
      </div>
      {children}
    </section>
  )
}

export function Avatar({ texto, cor = 'bg-marca-100 text-marca-700' }: { texto: string; cor?: string }) {
  return (
    <span className={`grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold ${cor}`}>{texto}</span>
  )
}

export function Sheet({ aberto, onFechar, titulo, children }: {
  aberto: boolean; onFechar: () => void; titulo: string; children: ReactNode
}) {
  useEffect(() => {
    if (!aberto) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [aberto, onFechar])

  if (!aberto) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button aria-label="Fechar" className="absolute inset-0 bg-slate-900/40" onClick={onFechar} />
      <div className="relative max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="sticky top-0 flex items-center justify-between bg-white px-5 pb-2 pt-4">
          <h3 className="text-lg font-semibold">{titulo}</h3>
          <button onClick={onFechar} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100">
            <X className="size-5" />
          </button>
        </div>
        <div className="px-5">{children}</div>
      </div>
    </div>
  )
}

export function Vazio({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">{children}</p>
}

export function AvisoPrototipo({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">{children}</div>
  )
}
