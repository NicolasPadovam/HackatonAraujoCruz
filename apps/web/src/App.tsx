import { BarChart3, CalendarClock, Upload, Users } from 'lucide-react'
import { HashRouter, NavLink, Outlet, Route, Routes } from 'react-router-dom'
import { DbProvider } from './data/store'
import ClienteFicha from './pages/ClienteFicha'
import Clientes from './pages/Clientes'
import Importar from './pages/Importar'
import Painel from './pages/Painel'
import Renovacoes from './pages/Renovacoes'
import Roadmap from './pages/Roadmap'

const ABAS = [
  { to: '/', label: 'Renovações', icone: CalendarClock },
  { to: '/clientes', label: 'Clientes', icone: Users },
  { to: '/importar', label: 'Importar', icone: Upload },
  { to: '/painel', label: 'Painel', icone: BarChart3 },
]

function Layout() {
  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-[#f1f4f9] pb-24 shadow-xl shadow-slate-300/40">
      <Outlet />
      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <ul className="grid grid-cols-4">
          {ABAS.map(({ to, label, icone: Icone }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${isActive ? 'text-marca-700' : 'text-slate-400'}`
                }
              >
                <Icone className="size-5" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

export default function App() {
  return (
    <DbProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Renovacoes />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="clientes/:id" element={<ClienteFicha />} />
            <Route path="importar" element={<Importar />} />
            <Route path="painel" element={<Painel />} />
            <Route path="roadmap" element={<Roadmap />} />
          </Route>
        </Routes>
      </HashRouter>
    </DbProvider>
  )
}
