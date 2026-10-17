import { CheckCircle2, Circle, CircleDashed, Lock, RotateCcw } from 'lucide-react'
import { AvisoPrototipo, PageHeader, TD, TH } from '../components/ui'
import { useStore } from '../data/store'

type Estado = 'prototipo' | 'proximo' | 'standby' | 'depende'

const ESTADO: Record<Estado, { label: string; icone: typeof Circle; classe: string }> = {
  prototipo: { label: 'No protótipo', icone: CheckCircle2, classe: 'text-emerald-600' },
  proximo: { label: 'Próximo passo', icone: Circle, classe: 'text-marca-600' },
  standby: { label: 'Stand-by', icone: CircleDashed, classe: 'text-amber-600' },
  depende: { label: 'Depende de fornecedor', icone: Lock, classe: 'text-slate-400' },
}

const ITENS: { titulo: string; detalhe: string; estado: Estado }[] = [
  { titulo: 'Renovações do mês', detalhe: 'Tabela por vencimento, filtros por ramo, corretor e status; andamento atualizado no painel lateral.', estado: 'prototipo' },
  { titulo: 'Ficha do cliente', detalhe: 'Todos os seguros, histórico de renovações e trocas de seguradora, cotações.', estado: 'prototipo' },
  { titulo: 'Painel', detalhe: 'Taxa de renovação, urgências, por ramo/seguradora/corretor, clientes únicos × seguros.', estado: 'prototipo' },
  { titulo: 'Fluxo de importação', detalhe: 'Arquivo → aba do mês → prévia com vínculo por nome → confirmar.', estado: 'prototipo' },
  { titulo: 'Conectar ao Supabase', detalhe: 'Trocar src/data/store.tsx pelo cliente Supabase, com login da equipe e RLS.', estado: 'proximo' },
  { titulo: 'Leitor real do .xlsx', detalhe: 'Ler a planilha de renovações (abas por mês) no lugar dos dados simulados.', estado: 'proximo' },
  { titulo: 'Modelos de importação por seguradora', detalhe: 'Importar o arquivo baixado de cada seguradora, sem consolidar à mão.', estado: 'proximo' },
  { titulo: 'Campos do imóvel (residencial)', detalhe: 'Endereço, tipo de imóvel, coberturas: base para cotar residencial.', estado: 'proximo' },
  { titulo: 'Base de clientes (CPF, contato)', detalhe: 'Está sendo carregada direto no Supabase. Vai preencher CPF/telefone dos clientes.', estado: 'standby' },
  { titulo: 'Cotação automática', detalhe: 'Três orçamentos-base para o cliente. Exige API/acordo com SeguroLink ou seguradora (não confirmado).', estado: 'depende' },
  { titulo: 'Formulário para clientes de marketing', detalhe: 'Só depois de validar o fluxo de cotação.', estado: 'depende' },
]

export default function Roadmap() {
  const { resetar } = useStore()
  return (
    <>
      <PageHeader
        titulo="Sobre o protótipo"
        subtitulo="O que já dá para ver e o que vem depois"
        direita={
          <button
            onClick={() => { resetar(); alert('Dados de exemplo restaurados.') }}
            className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
          >
            <RotateCcw className="size-4" /> Restaurar dados de exemplo
          </button>
        }
      />
      <div className="max-w-5xl space-y-5 px-8 py-6">
        <AvisoPrototipo>
          Todos os dados são <strong>fictícios</strong> e ficam só neste navegador (localStorage). Nada é enviado a servidor.
        </AvisoPrototipo>

        <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200/70">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr><th className={TH}>Funcionalidade</th><th className={TH}>Detalhe</th><th className={TH}>Situação</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ITENS.map((i) => {
                const E = ESTADO[i.estado]
                const Icone = E.icone
                return (
                  <tr key={i.titulo}>
                    <td className={`${TD} whitespace-nowrap font-medium`}>{i.titulo}</td>
                    <td className={`${TD} text-slate-600`}>{i.detalhe}</td>
                    <td className={`${TD} whitespace-nowrap`}>
                      <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${E.classe}`}><Icone className="size-4" />{E.label}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
