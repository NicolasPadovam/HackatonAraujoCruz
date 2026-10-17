import type { Seguradora } from '../domain/types'

// Portal do corretor de cada seguradora, por palavra-chave do nome.
const PORTAIS: [chave: string, url: string][] = [
  ['allianz', 'https://www.allianznet.com.br/ngx-azb-epac/public/home'],
  ['bradesco', 'https://wwwn.bradescoseguros.com.br/pnegocios2/wps/portal/portaldenegociosnovo/'],
  ['hdi', 'https://www.hdi.com.br/hdidigital/'],
  ['mapfre', 'https://negocios.mapfre.com.br/acesso'],
  ['porto', 'https://corretor.portoseguro.com.br/corretoronline/'],
  ['suhai', 'https://suhaiseguradoracotacao.com.br/login'],
  ['tokio', 'https://ssoportais3.tokiomarine.com.br/openam/XUI/'],
  ['zurich', 'https://espacoparceiros.zurich.com.br'],
]

const normalizar = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

export function portalSeguradora(seguradora: Seguradora | undefined): string | undefined {
  if (!seguradora) return undefined
  const nomes = [seguradora.nome, ...(seguradora.apelidos ?? [])].map(normalizar)
  return PORTAIS.find(([chave]) => nomes.some((n) => n.split(/[^a-z0-9]+/).includes(chave)))?.[1]
}
