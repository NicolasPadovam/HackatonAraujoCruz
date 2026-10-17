// Gráficos do Painel em SVG/HTML puro (sem biblioteca), no mesmo estilo do resto da interface.

import type { ReactNode } from 'react'

/** Cores categóricas fixas, para a mesma seguradora/ramo ter a mesma cor em todos os gráficos. */
export const CORES = ['#3b63d9', '#8b5cf6', '#0d9488', '#f59e0b', '#ec4899', '#64748b', '#65a30d', '#ea580c']
export const cor = (i: number) => CORES[i % CORES.length]

export function Legenda({ itens }: { itens: { label: string; cor: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
      {itens.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: i.cor }} />
          {i.label}
        </span>
      ))}
    </div>
  )
}

// ---------- Linhas ----------

export interface Serie {
  nome: string
  cor: string
  valores: (number | null)[]
}

const L = 640
const A = 220
const M = { t: 12, r: 16, b: 28, l: 40 }

/** Gráfico de linhas com uma ou mais séries. `null` interrompe a linha. */
export function Linhas({ rotulos, series, formatar = (v) => String(v), max }: {
  rotulos: string[]
  series: Serie[]
  formatar?: (v: number) => string
  max?: number
}) {
  const todos = series.flatMap((s) => s.valores).filter((v): v is number => v != null)
  const topo = max ?? Math.max(1, Math.ceil(Math.max(0, ...todos) * 1.1))
  const w = L - M.l - M.r
  const h = A - M.t - M.b
  const x = (i: number) => M.l + (rotulos.length === 1 ? w / 2 : (i / (rotulos.length - 1)) * w)
  const y = (v: number) => M.t + h - (v / topo) * h
  const grade = [0, 0.25, 0.5, 0.75, 1].map((f) => f * topo)

  return (
    <svg viewBox={`0 0 ${L} ${A}`} className="w-full" role="img">
      {grade.map((g) => (
        <g key={g}>
          <line x1={M.l} x2={L - M.r} y1={y(g)} y2={y(g)} stroke="#e2e8f0" />
          <text x={M.l - 6} y={y(g) + 4} textAnchor="end" fontSize="11" fill="#64748b">{formatar(Math.round(g))}</text>
        </g>
      ))}
      {rotulos.map((r, i) => (
        <text key={r} x={x(i)} y={A - 8} textAnchor="middle" fontSize="11" fill="#64748b">{r}</text>
      ))}
      {series.map((s) => {
        let d = ''
        let aberto = false
        s.valores.forEach((v, i) => {
          if (v == null) { aberto = false; return }
          d += `${aberto ? 'L' : 'M'}${x(i)},${y(v)} `
          aberto = true
        })
        return (
          <g key={s.nome}>
            <path d={d} fill="none" stroke={s.cor} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {s.valores.map((v, i) =>
              v == null ? null : (
                <circle key={i} cx={x(i)} cy={y(v)} r="4" fill="white" stroke={s.cor} strokeWidth="2">
                  <title>{`${s.nome} · ${rotulos[i]}: ${formatar(v)}`}</title>
                </circle>
              ),
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ---------- Rosca ----------

export interface Fatia {
  label: string
  valor: number
  cor: string
}

export function Rosca({ fatias, centro }: { fatias: Fatia[]; centro?: ReactNode }) {
  const total = fatias.reduce((t, f) => t + f.valor, 0)
  const R = 54
  const C = 2 * Math.PI * R
  let acumulado = 0
  return (
    <div className="flex items-center gap-5">
      <div className="relative size-36 shrink-0">
        <svg viewBox="0 0 140 140" className="size-full -rotate-90" role="img">
          <circle cx="70" cy="70" r={R} fill="none" stroke="#f1f5f9" strokeWidth="18" />
          {total > 0 &&
            fatias.map((f) => {
              const len = (f.valor / total) * C
              const el = (
                <circle
                  key={f.label}
                  cx="70" cy="70" r={R} fill="none" stroke={f.cor} strokeWidth="18"
                  strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-acumulado}
                >
                  <title>{`${f.label}: ${f.valor} (${Math.round((f.valor / total) * 100)}%)`}</title>
                </circle>
              )
              acumulado += len
              return el
            })}
        </svg>
        {centro && <div className="absolute inset-0 grid place-items-center text-center">{centro}</div>}
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
        {fatias.map((f) => (
          <li key={f.label} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: f.cor }} />
            <span className="truncate">{f.label}</span>
            <span className="ml-auto tabular-nums text-slate-500">
              {f.valor} · {total ? Math.round((f.valor / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ---------- Barras ----------

export interface LinhaBarra {
  label: string
  valor: number
  /** Texto à direita; por padrão, o próprio valor. */
  detalhe?: string
  cor?: string
}

export function BarrasH({ linhas, cor: corPadrao = '#3b63d9', max }: { linhas: LinhaBarra[]; cor?: string; max?: number }) {
  const topo = max ?? Math.max(1, ...linhas.map((l) => l.valor))
  return (
    <div className="space-y-3">
      {linhas.map((l) => (
        <div key={l.label} className="space-y-1">
          <div className="flex justify-between gap-3 text-sm">
            <span className="truncate font-medium">{l.label}</span>
            <span className="shrink-0 tabular-nums text-slate-500">{l.detalhe ?? l.valor}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full" style={{ width: `${(l.valor / topo) * 100}%`, background: l.cor ?? corPadrao }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Barras divergentes (positivo à direita, negativo à esquerda), p. ex. saldo de clientes. */
export function BarrasDivergentes({ linhas }: { linhas: { label: string; valor: number; detalhe?: string }[] }) {
  const topo = Math.max(1, ...linhas.map((l) => Math.abs(l.valor)))
  return (
    <div className="space-y-2.5">
      {linhas.map((l) => (
        <div key={l.label} className="grid grid-cols-[7rem_1fr_5.5rem] items-center gap-3 text-sm">
          <span className="truncate font-medium">{l.label}</span>
          <div className="relative h-3">
            <span className="absolute inset-y-0 left-1/2 w-px bg-slate-300" />
            <span
              className={`absolute inset-y-0 rounded-full ${l.valor >= 0 ? 'left-1/2 bg-emerald-500' : 'right-1/2 bg-rose-500'}`}
              style={{ width: `${(Math.abs(l.valor) / topo) * 50}%` }}
            />
          </div>
          <span className="text-right tabular-nums text-slate-500">{l.detalhe ?? (l.valor > 0 ? `+${l.valor}` : l.valor)}</span>
        </div>
      ))}
    </div>
  )
}

// ---------- Colunas empilhadas ----------

export interface Coluna {
  label: string
  /** Segmentos de baixo para cima. */
  partes: { label: string; valor: number; cor: string }[]
  destaque?: boolean
}

export function ColunasEmpilhadas({ colunas, altura = 160 }: { colunas: Coluna[]; altura?: number }) {
  const topo = Math.max(1, ...colunas.map((c) => c.partes.reduce((t, p) => t + p.valor, 0)))
  return (
    <div className="flex items-end gap-1.5" style={{ height: altura + 28 }}>
      {colunas.map((c) => {
        const total = c.partes.reduce((t, p) => t + p.valor, 0)
        const dica = `${c.label}: ${total}` + c.partes.filter((p) => p.valor).map((p) => `\n${p.label}: ${p.valor}`).join('')
        return (
          <div key={c.label} className="flex min-w-0 flex-1 flex-col items-center gap-1" title={dica}>
            <span className="text-xs tabular-nums text-slate-500">{total || ''}</span>
            <div className="flex w-full flex-col-reverse overflow-hidden rounded-t" style={{ height: (total / topo) * altura }}>
              {c.partes.map((p) => (
                <span key={p.label} style={{ height: `${total ? (p.valor / total) * 100 : 0}%`, background: p.cor }} />
              ))}
            </div>
            <span className={`w-full truncate text-center text-[11px] ${c.destaque ? 'font-semibold text-rose-600' : 'text-slate-500'}`}>
              {c.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ---------- Funil ----------

export interface EtapaFunil {
  label: string
  valor: number
  cor: string
}

/** Etapas em barras proporcionais à primeira, com a conversão em relação à etapa anterior. */
export function Funil({ etapas }: { etapas: EtapaFunil[] }) {
  const base = Math.max(1, etapas[0]?.valor ?? 1)
  return (
    <div className="space-y-2.5">
      {etapas.map((e, i) => {
        const anterior = i > 0 ? etapas[i - 1].valor : null
        return (
          <div key={e.label} className="grid grid-cols-[8rem_1fr_6.5rem] items-center gap-3 text-sm">
            <span className="font-medium">{e.label}</span>
            <div className="h-7 overflow-hidden rounded-md bg-slate-100">
              <div className="h-full rounded-md" style={{ width: `${(e.valor / base) * 100}%`, background: e.cor }} />
            </div>
            <span className="text-right tabular-nums text-slate-500">
              <span className="font-semibold text-slate-900">{e.valor}</span>
              {anterior ? ` · ${Math.round((e.valor / anterior) * 100)}%` : ''}
            </span>
          </div>
        )
      })}
    </div>
  )
}
