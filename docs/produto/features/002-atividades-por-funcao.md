# 002 — Atividades por função (Administrativo e Corretora)

**Status:** implementado (migrations 000600 e 000700 + telas). Pendente: aplicar as migrations no Supabase e testar com dados reais.

## Contexto

A operação tem duas funções com atividades diferentes sobre as mesmas renovações:

- **Administrativo**: do dia 10 ao dia 20 de cada mês, busca nas seguradoras parceiras as renovações do **mês seguinte** e monta as planilhas que são importadas no sistema (há **uma planilha por seguradora**, cada uma com seu modelo). Quando a renovação está a 10 dias de vencer, **cota de novo** (os seguros costumam ser anuais, e o valor pode mudar na negociação de cada um) e envia para a Corretora.
- **Corretora**: pega a renovação cotada e envia ao cliente. Se o cliente não concorda com os valores, faz uma **nova oferta** por um de dois caminhos, que são alternativas: contato com o interno da seguradora **ou** redução de comissão. Não há limite de rodadas. Se a negociação não for concluída, a renovação fica **cancelada**.

Hoje o status da renovação (pendente, cotando, renovada, não renovada) não diz de quem é a vez, então ninguém sabe o que está pendente para si.

## Comportamento esperado

### Funções

- O usuário tem uma **função**: **Administrativo** ou **Corretora**. Nesta fase não se separa por pessoa, só por função. Quem tem qual função é definido em [003 — Configurações > Usuários](003-configuracoes-usuarios.md).
- Quem tem acesso de administrador do sistema vê as atividades das duas funções.

### Etapas da renovação (status)

O status ganha etapas intermediárias. Os quatro valores atuais continuam existindo, com o mesmo significado de hoje; entram `cotada`, `enviada`, `negociando` e `cancelada`.

| Status | Significado | Atividade pendente | Função |
| --- | --- | --- | --- |
| `pendente` | Ainda não cotada de novo | A partir de 10 dias do vencimento: **cotar novamente** | Administrativo |
| `cotando` | Administrativo está cotando | **Concluir a cotação e enviar para a Corretora** | Administrativo |
| `cotada` | Cotação pronta, com a Corretora | **Enviar ao cliente** | Corretora |
| `enviada` | Enviada ao cliente | **Registrar a resposta do cliente** (aceitou ou não concordou) | Corretora |
| `negociando` | Cliente não concordou | **Fazer nova oferta** (contato com a seguradora ou redução de comissão) ou **encerrar** a negociação | Corretora |
| `renovada` | Fechada | — | — |
| `nao_renovada` | Cliente não renovou | — | — |
| `cancelada` | Negociação encerrada sem acordo | — | — |

Avanços possíveis (cada um é **um clique**, sem digitação obrigatória, exceto os registros das cotações descritos abaixo):

```
pendente → cotando → cotada → enviada → renovada
                                  ↓
                             negociando → enviada (nova oferta)
                                  ↓
                              cancelada
```

`nao_renovada` continua podendo ser marcada de qualquer etapa em aberto (cliente avisou que não vai renovar).

### Registros obrigatórios

- Ao concluir a cotação (`cotando` → `cotada`), registrar a **cotação**: seguradora e prêmio.
- A cada **nova oferta** na negociação, registrar uma nova cotação com prêmio e **comissão (%)**, e qual foi o caminho usado: contato com a seguradora ou redução de comissão.
- As cotações ficam ligadas à renovação, em ordem, e aparecem na ficha do cliente. A primeira cotação e as seguintes não se sobrescrevem.

### Tela Início: "Minhas atividades"

- A tela Início (feature [001](001-tela-inicial-vencimentos.md)) passa a mostrar as atividades da **função** do usuário logado, ordenadas por vencimento, com as mesmas faixas de alerta 10/5/1.
- Cada linha mostra: prazo, segurado, ramo, seguradora, **etapa atual** e **a atividade a fazer**. Clicar abre o painel da renovação, com o botão da próxima etapa em destaque.
- O administrador do sistema vê as duas funções, com filtro por função.
- Lista vazia: "Nenhuma atividade pendente para você".

### Aviso de importação (Administrativo)

- Entre os dias 10 e 20, a tela Início mostra um aviso: **"Importar as renovações de <mês seguinte>"**, com uma linha por **seguradora parceira** (seguradoras ativas), marcada como feita quando já existe importação daquela seguradora para o mês seguinte.
- Depois do dia 20, seguradoras sem importação aparecem como **atrasadas**. Antes do dia 10, o aviso não aparece.
- Nada precisa ser marcado à mão: o aviso se resolve sozinho quando a importação é concluída.

### Kanban

- O Kanban de Renovações mostra as novas etapas, incluindo a coluna **Cancelada**. Arrastar um cartão equivale a mudar o status e segue as mesmas regras de avanço.

### Ficha do cliente

- Mostra a **próxima atividade** de cada renovação em aberto do cliente e o histórico de cotações (valores e comissão por rodada).

## Fora de escopo

- Separar atividades por pessoa dentro de uma função (será detalhado depois).
- Notificações por e-mail, WhatsApp ou push. O aviso existe só dentro do sistema.
- Prazos configuráveis (10/5/1 e o intervalo 10–20 ficam fixos no código).
- Envio de cotação ao cliente pelo sistema: "enviar ao cliente" é um registro de que a Corretora enviou, não um disparo.
- Cotação automática.

## Impacto no modelo de dados

- `status_renovacao`: acrescentar `cotada`, `enviada`, `negociando`, `cancelada`.
- `cotacoes`: acrescentar `comissao_pct numeric(5,2)` e `caminho` (`contato_seguradora` | `reducao_comissao`, nulo na primeira cotação). `renovacao_id` passa a ser obrigatório para cotações de renovação.
- `importacoes`: acrescentar `seguradora_id` (nulo para a planilha consolidada da corretora), para saber o que já foi importado por seguradora.
- Histórico de mudanças de status (`renovacao_eventos`: renovação, status anterior e novo, usuário, data/hora). Não é exigido pelas telas acima, mas é barato fazer junto e destrava métricas como tempo médio de cotação.

## Impacto na API

Com Supabase: leituras em `renovacoes` filtradas por status e vencimento, e em `importacoes` por mês e seguradora. As regras de avanço de status devem valer no banco (policy ou função), não só na tela, para que o Kanban e o painel de andamento não permitam saltos inválidos.

## Impacto na UI

- `domain/types.ts`: novos valores de `StatusRenovacao`; `Cotacao` com `comissaoPct` e `caminho`.
- Um único helper de "em aberto" (hoje a condição `pendente` ou `cotando` está repetida em Início, Painel, Renovações, Kanban e fila de ação) e uma tabela única de atividades por status, usados por todas as telas.
- `pages/Inicio.tsx`: virar "Minhas atividades" e ganhar o aviso de importação.
- `components/RenovacaoSheet.tsx` e `KanbanRenovacoes.tsx`: botões da próxima etapa e formulário de cotação.
- Painel: o funil e os indicadores passam a considerar as novas etapas (`cotada` e posteriores contam como cotadas; `cancelada` é uma perda, mostrada separada de `nao_renovada`).

## Critério de aceite

1. Renovação `pendente` a 10 dias do vencimento aparece em "Minhas atividades" do Administrativo como "Cotar novamente"; a 11 dias, não.
2. Concluir a cotação exige seguradora e prêmio, muda o status para `cotada` e a renovação passa a aparecer só para a Corretora.
3. Marcar "Cliente não concordou" leva a `negociando`; cada nova oferta grava uma cotação com prêmio, comissão e caminho, e volta a renovação para `enviada`.
4. Encerrar a negociação leva a `cancelada`, que aparece como coluna no Kanban e some de "Minhas atividades".
5. Entre os dias 10 e 20, o aviso lista as seguradoras ativas e marca a seguradora como feita assim que sua importação do mês seguinte é concluída, sem ação manual.
6. O administrador do sistema vê as atividades das duas funções; as demais funções só veem as suas.
7. Testes unitários da tabela de atividades por status e da regra de avanço (transições válidas e inválidas), com dados fictícios.

## Decisões

- Só duas funções por enquanto: Administrativo e Corretora.
- Importação do ciclo: renovações do mês seguinte, entre os dias 10 e 20, uma planilha por seguradora parceira.
- "Cotar de novo" vale para as renovações que chegam a 10 dias do vencimento (mesma janela `DIAS_ALERTA` já usada na tela Início).
- Negociação: contato com a seguradora e redução de comissão são alternativas; sem limite de rodadas; se não concluir, status `cancelada`, visível no Kanban.
- As duas anotações (nova cotação e comissão) são registradas.
- O `contexto.md` descreve o fluxo de forma abstraída e não precisa ser alterado por esta feature.

## Perguntas em aberto

1. `cancelada` é diferente de `nao_renovada`? Assumi que sim: `nao_renovada` é o cliente que decidiu não renovar; `cancelada` é a negociação que não chegou a acordo. Se for o mesmo caso, basta reaproveitar `nao_renovada` e remover um status.
2. O Kanban passa a ter 8 colunas. Aceitável com rolagem horizontal, ou agrupamos as etapas (por exemplo, "Com o administrativo", "Com a corretora")?
3. Quem registra a resposta do cliente é sempre a Corretora?
4. "Seguradoras parceiras" = seguradoras ativas no cadastro. Está correto?
5. Renovação que já está `renovada` antes dos 10 dias (cliente adiantou) sai do fluxo sem passar pelas etapas. Confirmar.
