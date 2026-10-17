# Araújo Cruz Corretora de Seguros — Contexto do projeto

> Contexto extraído de uma reunião gravada no Granola. Fatos discutidos ≠ capacidades confirmadas. Na dúvida, pergunte antes de implementar.

## Objetivo

Construir um sistema que organize a operação da Araújo Cruz e, no futuro, permita que **novos clientes vindos de marketing digital** informem seus dados, recebam opções de seguro e avancem na contratação com menos trabalho manual.

- Clientes atuais e indicações orgânicas continuam no fluxo de atendimento atual (feito pela mãe de um dos participantes). A cotação automática **não substitui** esse atendimento.

## Frentes do projeto

| Frente | Status | Dependência |
| --- | --- | --- |
| CRM e organização da carteira | **Começar agora** (MVP) | Planilhas e processos existentes |
| Cotação automática | Em espera | API / link / acordo com fornecedor ou seguradora |
| Marketing para captar novos clientes | Depois | Saber qual fluxo de cotação será oferecido |

Não lançar campanha prometendo cotação automática antes de validar o fluxo de cotação.

## Operação atual

- Processos e planilhas manuais.
- A planilha disponível é **de renovações**, não a base completa de clientes. Alguns seguros (ex.: vida) não seguem esse fluxo.
- Para as renovações do mês, um primo baixa planilhas de cada seguradora, copia os dados e organiza por data. **Cada seguradora usa um modelo de planilha diferente.**
- Campos da planilha de renovações: seguradora, segurado, ramo, vencimento, corretor responsável, andamento da cotação, prêmio, comissão, parcelas e seguradora com a qual o cliente fechou.
  - O cliente pode renovar com uma seguradora diferente da anterior.
  - Campos financeiros deixaram de ser preenchidos de forma consistente.
- Um cliente pode ter vários seguros, cada um com valores e renovações próprios. **Clientes únicos ≠ quantidade de seguros.**
- A corretora usa o SeguroLink (multicálculo), pagando R$ 70. Não está decidido que o novo sistema vá substituí-lo.

## MVP do CRM (primeira etapa)

Objetivo: dar visibilidade à carteira e reduzir a dependência das planilhas, para clientes atuais e futuros.

- **Importar** os dados existentes; não exigir recadastro manual da carteira.
- Aceitar planilhas de renovação em formatos diferentes, com **modelos de importação por seguradora**.
- O download das planilhas nas seguradoras pode continuar manual no início.

### Modelagem

- **Um cadastro por cliente**, ligado aos seus seguros, cotações e renovações.
- Permitir ver a relação geral com o cliente e os dados financeiros de cada seguro.
- Requisito central: **não duplicar clientes** ao importar (definir chave de deduplicação, ex.: CPF/CNPJ).
- Não há consenso sobre separar CRM e cotação em módulos distintos. Preserve os relacionamentos; não force a separação.

### Restrição principal

A mãe e o primo **provavelmente não vão cadastrar novos clientes à mão**. Uma ferramenta que dependa de digitação manual tende a só acrescentar trabalho. Todo desenho precisa deixar claro:

1. como os dados entram no sistema hoje (importação de planilhas);
2. como isso mudaria com uma integração futura.

## Cotação automática (visão futura, não validada)

Fluxo desejado para novos clientes vindos de anúncios (principalmente Instagram):

1. Pessoa chega pelo anúncio e preenche seus dados.
2. Recebe **três orçamentos-base**.
3. Avança na contratação; casos que exigem personalização vão para atendimento humano.

O que **não** assumir:

- Que SeguroLink, Quiver ou outro multicálculo oferecem API, link de cotação ou integração adequada — nada disso foi verificado.
- Que existe link oficial da Porto Seguro para o cliente cotar e fechar sozinho nesse formato.

Pesquisa já feita (out/2026, Porto Seguro residencial):

- A Porto tem portal de APIs (dev.portoseguro.com.br), mas aceita apenas parceiros com acordo prévio. Não há API pública de cotação residencial confirmada.
- A cotação pelo corretor é digital (Corretor Online), do cálculo à transmissão da proposta.
- O SeguroLink lista a Porto entre as seguradoras e usa integração híbrida (robô + webservice) segundo fonte de mercado; o tipo de integração com a Porto não foi confirmado.

**Não construir sobre scraping ou automação do portal da seguradora** sem autorização: riscos de termos de uso, credenciais, mudanças de interface e dados pessoais (LGPD). Isso é uma cautela, não parecer jurídico.

## Pontos em aberto

1. Obter e examinar a planilha real de renovações e exemplos dos arquivos exportados por cada seguradora.
2. Mapear o fluxo atual: quem baixa arquivos, quem cota, quem atualiza status, quais dados financeiros são registrados.
3. Definir o escopo mínimo do CRM útil **sem criar nova obrigação de digitação**.
4. Confirmar com o fornecedor do sistema de cálculo (SeguroLink) se há API, links de cotação e acesso aos dados, e em quais condições.
5. Investigar alternativas de multicálculo e o papel delas no fluxo do cliente.
6. Só então detalhar formulário, orçamentos-base, encaminhamento para atendimento e campanha de aquisição.

Esses pontos não têm responsáveis nem prazos definidos.

## Como trabalhar neste projeto

- Comece propondo o **MVP do CRM com os dados e processos disponíveis agora**.
- Separe sempre o que dá para fazer com **importação de planilhas** do que depende de **API ou acordo com fornecedor**.
- Antes de especificar funcionalidades, explicite as suposições e pergunte sobre:
  - os arquivos reais (planilhas de renovação e exportações das seguradoras);
  - quem vai usar a ferramenta;
  - como novos clientes vão entrar no sistema.
- Não trate produtos pesquisados ou integrações citadas como capacidades confirmadas.
- Dados de clientes (CPF, endereço, dados de apólice) são pessoais: não use dados reais em exemplos, testes ou commits.
