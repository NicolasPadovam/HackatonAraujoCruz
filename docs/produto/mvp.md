# MVP — CRM Araújo Cruz

> Status: **proposta**, aguardando revisão do time. Contexto: [contexto.md](contexto.md). Modelo de dados: [../arquitetura/modelo-dados.md](../arquitetura/modelo-dados.md).

## Objetivo

Dar ao pessoal da Araújo Cruz, **no computador (desktop)**, uma visão da carteira (clientes, seguros, renovações) alimentada por **importação das planilhas existentes**, sem criar obrigação de digitação. O CRM é a base de dados da futura cotação automática.

## Quem usa e como

- Equipe da Araújo Cruz (hoje: a corretora e o primo). Uso no **desktop**.
- O atendimento continua igual: o cliente manda mensagem e a corretora cota nas seguradoras. O CRM só organiza o que já acontece.
- Foco inicial no ramo **residencial**. O modelo aceita qualquer ramo, para não ter de refazer nada ao expandir.

## Como os dados entram

| Hoje (MVP) | Futuro (depende de acordo com fornecedor) |
| --- | --- |
| Upload da planilha de renovações consolidada | Importação direta do arquivo de cada seguradora |
| Base de clientes: sendo carregada direto no Supabase (em andamento, outra branch) | Dados vindos do SeguroLink/multicálculo, **se houver API** (não confirmado) |
| Edição pontual: só o status da renovação | Formulário público de cotação (clientes de marketing) |

Recomendação: importar **todos os ramos** da planilha, não só residencial. O custo é zero, e sem isso a ficha do cliente fica incompleta (quem tem residencial geralmente também tem auto). O foco em residencial fica nas telas e nos filtros.

## Funcionalidades (priorizadas)

1. **Importar planilha de renovações do mês** (formato atual, ver mapeamento abaixo), com prévia antes de gravar e relatório de linhas com erro. Existe uma planilha por mês: importa-se um mês por vez, e reimportar o mesmo mês atualiza os registros em vez de duplicar.
2. **Vincular renovações aos clientes já existentes** no Supabase, por CPF/CNPJ ou, se não houver, pelo nome. *Em stand-by: a base de clientes ainda está sendo carregada. Até lá, o importador cria o cliente só pelo nome.*
3. **Deduplicação de clientes**: possíveis duplicatas vão para uma fila de revisão, nunca são mescladas sozinhas.
4. **Renovações do mês** (tela inicial): tabela por vencimento, com filtro por ramo (padrão: residencial), corretor e status.
5. **Atualizar status da renovação** com 1 clique: pendente → cotando → renovada / não renovada, e com qual seguradora fechou.
6. **Ficha do cliente**: todos os seguros, histórico de renovações e seguradoras, contato.
7. **Busca** de cliente por nome ou CPF.
8. **Login** da equipe (Supabase Auth). Sem acesso público.

## Fora do escopo do MVP

- Cotação automática, formulário público, integração com SeguroLink ou seguradoras.
- Importação dos arquivos originais de cada seguradora (fica para a fase 2, quando tivermos exemplos).
- Cadastro manual completo de clientes como fluxo principal.
- Campos específicos de residencial (imóvel, coberturas). Entram quando formos desenhar a cotação residencial.
- Dashboards financeiros: os campos de prêmio e comissão estão vazios na planilha atual.

## Mapeamento das planilhas

O mapeamento da planilha de renovações da corretora está em [docs/importacao/consolidada.md](../importacao/consolidada.md). Os relatórios de cada seguradora estão em [docs/importacao/](../importacao/README.md).

## Perguntas em aberto

1. **Alinhar com quem configura o Supabase** o esquema da tabela de clientes que está sendo carregada (campos, chave CPF/CNPJ), para que o importador de renovações vincule a ela em vez de criar outra.

## Respondidas

- Planilhas mensais: são **abas de um mesmo arquivo**. No upload, o usuário escolhe a aba (mês) a importar.
- Mesmo nome = mesmo cliente. Quando um nome aparece em várias linhas, é o mesmo cliente com seguros de ramos diferentes (ex.: uma empresa com auto e residencial). A deduplicação por nome vincula essas linhas ao mesmo cadastro.
- Corretores: R = Renata, C = Carlos.
- Comissão: registrada em %.
- Planilha de renovações: uma por mês.
- Base de clientes: em stand-by. Está sendo carregada direto no Supabase.
