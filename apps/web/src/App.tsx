import { BarChart3, CalendarClock, Map, Upload, Users } from 'lucide-react'
import { HashRouter, NavLink, Outlet, Route, Routes } from 'react-router-dom'
import { DbProvider } from './data/store'
import ClienteFicha from './pages/ClienteFicha'
import Clientes from './pages/Clientes'
import Importar from './pages/Importar'
import Painel from './pages/Painel'
import Renovacoes from './pages/Renovacoes'
import Roadmap from './pages/Roadmap'

const MENU = [
  { to: '/', label: 'Renovações', icone: CalendarClock },
  { to: '/clientes', label: 'Clientes', icone: Users },
  { to: '/importar', label: 'Importar planilha', icone: Upload },
  { to: '/painel', label: 'Painel', icone: BarChart3 },
]

function ItemMenu({ to, label, icone: Icone }: { to: string; label: string; icone: typeof Users }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
          isActive ? 'bg-marca-600 text-white' : 'text-marca-100 hover:bg-marca-600/50 hover:text-white'
        }`
      }
    >
      <Icone className="size-4.5" />
      {label}
    </NavLink>
  )
}

function Layout() {
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col bg-marca-900 px-3 py-5">
        <div className="mb-8 flex items-center gap-2.5 px-3">
          <span className="grid size-9 place-items-center rounded-lg bg-white text-sm font-bold text-marca-700">AC</span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-white">Araújo Cruz</p>
            <p className="text-xs text-marca-100/70">CRM de seguros</p>
          </div>
        </div>
        <nav className="space-y-1">
          {MENU.map((m) => <ItemMenu key={m.to} {...m} />)}
        </nav>
        <div className="mt-auto space-y-3">
          <ItemMenu to="/roadmap" label="Sobre o protótipo" icone={Map} />
          <p className="px-3 text-[11px] leading-snug text-marca-100/60">Protótipo com dados fictícios</p>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
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
