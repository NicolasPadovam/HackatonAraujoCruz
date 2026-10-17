import { ArrowLeft, CheckCircle2, Circle, CircleDashed, Lock, RotateCcw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AvisoPrototipo, Card, Secao } from '../components/ui'
import { useStore } from '../data/store'

type Estado = 'prototipo' | 'proximo' | 'standby' | 'depende'

const ESTADO: Record<Estado, { label: string; icone: typeof Circle; classe: string }> = {
  prototipo: { label: 'No protótipo', icone: CheckCircle2, classe: 'text-emerald-600' },
  proximo: { label: 'Próximo passo', icone: Circle, classe: 'text-marca-600' },
  standby: { label: 'Stand-by', icone: CircleDashed, classe: 'text-amber-600' },
  depende: { label: 'Depende de fornecedor', icone: Lock, classe: 'text-slate-400' },
}

const ITENS: { titulo: string; detalhe: string; estado: Estado }[] = [
  { titulo: 'Renovações do mês', detalhe: 'Lista por vencimento, filtros por ramo, corretor e status, status em 1 toque.', estado: 'prototipo' },
  { titulo: 'Ficha do cliente', detalhe: 'Todos os seguros, histórico de renovações e trocas de seguradora, cotações.', estado: 'prototipo' },
  { titulo: 'Painel', detalhe: 'Taxa de renovação, urgências, por ramo/seguradora/corretor, clientes únicos × seguros.', estado: 'prototipo' },
  { titulo: 'Fluxo de importação', detalhe: 'Arquivo → aba do mês → prévia com vínculo por nome → confirmar.', estado: 'prototipo' },
  { titulo: 'Leitor real do .xlsx', detalhe: 'Ler a planilha de renovações (abas por mês) no lugar dos dados simulados.', estado: 'proximo' },
  { titulo: 'Conectar ao Supabase', detalhe: 'Trocar src/data/store.tsx pelo cliente Supabase, com login da equipe e RLS.', estado: 'proximo' },
  { titulo: 'Base de clientes (CPF, contato)', detalhe: 'Está sendo carregada direto no Supabase. Vai preencher CPF/telefone dos clientes.', estado: 'standby' },
  { titulo: 'Modelos de importação por seguradora', detalhe: 'Importar o arquivo baixado de cada seguradora, sem consolidar à mão.', estado: 'proximo' },
  { titulo: 'Campos do imóvel (residencial)', detalhe: 'Endereço, tipo de imóvel, coberturas: base para cotar residencial.', estado: 'proximo' },
  { titulo: 'Cotação automática', detalhe: 'Três orçamentos-base para o cliente. Exige API/acordo com SeguroLink ou seguradora (não confirmado).', estado: 'depende' },
  { titulo: 'Formulário para clientes de marketing', detalhe: 'Só depois de validar o fluxo de cotação.', estado: 'depende' },
]

export default function Roadmap() {
  const { resetar } = useStore()
  return (
    <>
      <header className="sticky top-0 z-20 bg-marca-700 px-4 pb-5 pt-[max(1rem,env(safe-area-inset-top))] text-white">
        <Link to="/" className="-ml-1 mb-3 inline-flex items-center gap-1 text-sm text-marca-100">
          <ArrowLeft className="size-4" /> Voltar
        </Link>
        <h1 className="text-xl font-semibold">Sobre o protótipo</h1>
        <p className="text-sm text-marca-100">O que já dá para ver e o que vem depois</p>
      </header>
      <div className="space-y-5 p-4">
        <AvisoPrototipo>
          Todos os dados são <strong>fictícios</strong> e ficam só neste navegador. Nada é enviado a servidor.
        </AvisoPrototipo>

        <Secao titulo="Funcionalidades">
          <Card className="!p-0">
            <ul className="divide-y divide-slate-100">
              {ITENS.map((i) => {
                const E = ESTADO[i.estado]
                const Icone = E.icone
                return (
                  <li key={i.titulo} className="flex gap-3 px-4 py-3">
                    <Icone className={`mt-0.5 size-5 shrink-0 ${E.classe}`} />
                    <div>
                      <p className="text-sm font-medium">{i.titulo} <span className={`ml-1 text-xs font-normal ${E.classe}`}>{E.label}</span></p>
                      <p className="text-xs text-slate-500">{i.detalhe}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </Card>
        </Secao>

        <button
          onClick={() => { resetar(); alert('Dados de exemplo restaurados.') }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-medium text-slate-700 ring-1 ring-slate-200"
        >
          <RotateCcw className="size-4" /> Restaurar dados de exemplo
        </button>
      </div>
    </>
  )
}
