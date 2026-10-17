// Gera planilhas 100% FICTÍCIAS em tests/fixtures/ para testar o importador.
// Nomes e CPFs são inventados (CPF com dígito verificador válido, gerado aleatoriamente).
// Uso: node scripts/gerar-planilhas-ficticias.mjs   (precisa de apps/web/node_modules instalado)

import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const XLSX = createRequire(join(raiz, 'apps/web/package.json'))('xlsx')
const destino = join(raiz, 'tests/fixtures')
mkdirSync(destino, { recursive: true })

let semente = 42
const rnd = () => ((semente = (semente * 16807) % 2147483647) / 2147483647)
const dv = (b, p) => { const s = b.reduce((t, d, i) => t + d * p[i], 0) % 11; return s < 2 ? 0 : 11 - s }
function cpfFicticio() {
  const b = Array.from({ length: 9 }, () => Math.floor(rnd() * 10))
  const d1 = dv(b, [10, 9, 8, 7, 6, 5, 4, 3, 2])
  const d2 = dv([...b, d1], [11, 10, 9, 8, 7, 6, 5, 4, 3, 2])
  return [...b, d1, d2].join('').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

// --- 1) Planilha da corretora: uma aba por mês, mesmas 13 colunas da planilha real -----
const CAB = ['Seguradoras', 'Nome do Segurado', 'Ramo', 'Vigência', 'Corretor', 'Renovada', 'Cotada',
  'Prêmio Líquido', 'Comissão', 'Valor Recebido', 'N. Parcelas', 'Valor Mensal', 'Seguradora Atual']

const set = [
  ['Tokio Marine', 'Joana Exemplo Prado', 'Residencial', '9/4/2026', 'R', '✅', true, 980.5, 0.15, 'R$ -', 4, 245.13, 'Tokio Marine'],
  ['Mapfre', 'Padaria Fictícia LTDA', 'Auto', '9/5/2026', 'R', '✅', true, 'R$ -', '', 'R$ -', '', '-', ''],
  ['Porto Seguro', 'Padaria Fictícia LTDA', 'Residencial', '9/12/2026', 'C', '❌', true, '', '', 'R$ -', '', '-', ''],
  ['Allianz', 'Rui Teste Moreira', 'Residencial', '9/18/2026', 'C', '✅', true, '1.200,00', '20%', 'R$ 240,00', 10, 'R$ 120,00', 'Porto Seguro'],
  ['Suhai', 'Carla Demo Nunes', 'Auto', '9/25/2026', 'R', '✅', true, '', '', 'R$ -', '', '-', ''],
]
const out = [
  ['Porto Seguro', 'Bruno Simulado Reis', 'Residencial', '10/3/2026', 'R', '✅', true, '', '', 'R$ -', '', '-', ''],
  ['Zurich', 'Joana Exemplo Prado', 'Auto', '10/14/2026', 'R', '', true, '', '', 'R$ -', '', '-', ''],
  ['Azul', 'Marcos Hipotético', 'Auto', '10/21/2026', 'C', '', false, '', '', 'R$ -', '', '-', ''],
  ['Porto', 'Lia Inventada Souza', 'Residencial', '10/28/2026', 'R', '', true, '', '', 'R$ -', '', '-', ''],
  ['Seguradora X', 'Linha Com Erro', 'Residencial', '10/30/2026', 'R', '', false, '', '', 'R$ -', '', '-', ''],
  ['Mapfre', 'Data Invalida Teste', 'Residencial', '2/30/2026', 'R', '', false, '', '', 'R$ -', '', '-', ''],
]
const wb1 = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb1, XLSX.utils.aoa_to_sheet([CAB, ...set]), 'Set')
XLSX.utils.book_append_sheet(wb1, XLSX.utils.aoa_to_sheet([CAB, ...out]), 'Out')
XLSX.writeFile(wb1, join(destino, 'planilha-corretora-ficticia.xlsx'))

// --- 2) Relatório de seguradora: títulos antes do cabeçalho, dd/mm/aaaa, CPF, apólice -----
const rel = [
  ['RELATÓRIO DE RENOVAÇÕES - PRÓXIMOS 30 DIAS'],
  ['Corretora: ARAUJO CRUZ (fictício)'],
  [],
  ['Apólice', 'Segurado', 'CPF/CNPJ', 'Produto', 'Início Vigência', 'Fim Vigência', 'Prêmio Líquido'],
  ['900001', 'Bruno Simulado Reis', cpfFicticio(), 'Residencial Habitual', '03/10/2026', '03/10/2027', '1.050,00'],
  ['900002', 'Nova Cliente Fictícia', cpfFicticio(), 'Residencial', '05/11/2025', '05/11/2026', '780,90'],
  ['900003', 'Outro Cliente Novo', '123.456.789-00', 'Residencial', '12/11/2025', '12/11/2026', ''],
  ['900004', 'Lia Inventada Souza', cpfFicticio(), 'Residencial', '28/10/2025', '28/10/2026', '1.320,00'],
  [],
  ['Total de registros: 4'],
]
const wb2 = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb2, XLSX.utils.aoa_to_sheet(rel), 'Renovacoes')
XLSX.writeFile(wb2, join(destino, 'relatorio-porto-ficticio.xlsx'))

console.log('Planilhas fictícias geradas em', destino)
