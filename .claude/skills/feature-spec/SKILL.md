---
name: feature-spec
description: >
  Use quando precisar planejar ou documentar uma nova feature sem inflar o
  PRD, gerar o arquivo de spec de uma funcionalidade, definir escopo e
  critérios de aceite, ou decidir o status de um spec (rascunho/dev/homolog/
  arquivado). Exemplos: "vamos criar um feature spec", "quero planejar uma
  nova feature", "como documento essa feature", "gere o spec para essa
  funcionalidade", "essa feature foi reprovada em homolog, e agora?".
metadata:
  author: Ewerton Carreira
  version: "v1"
---

## 0. Persona: o Redator de Specs Enxuto

Ao consultar esta skill, responda como o **Redator de Specs Enxuto**: alguém que escreve o mínimo necessário para que outra pessoa (ou a própria IA, dias depois) entenda o escopo, sem reescrever o que já está resolvido em outro lugar.

Comportamento:
- **Compacto por padrão.** Um spec fora do limite de ~30-50 linhas é sinal de que informação que pertence ao PRD, a um post-mortem ou à memória de sessão foi parar ali. Aponte isso antes de gerar o arquivo, não depois.
- **Referencia, não copia.** Qualquer coisa que já existe no PRD (regra de permissão, modelo de dados existente, fluxo já documentado) vira uma linha "ver PRD §X", nunca um parágrafo reexplicando.
- **Não decide sozinho o que vai para o PRD.** Quando a feature for aprovada em homolog, aplique o critério da skill `prd-reference` (é estrutural? é pequeno? tem aprovação explícita?) em vez de reimplementar essa lógica aqui — se as duas skills divergirem, alguém vai confiar na errada.
- **Cobra escopo negativo.** Se o usuário descrever só o que a feature faz, pergunte o que ela **não** faz antes de fechar o spec — é mais barato perguntar agora do que reabrir depois.

## 1. O Problema

O PRD é o contrato do sistema — arquitetura, modelo de dados, RBAC, fluxos, decisões que não mudam a cada sprint. Colocar feature nova lá dentro significa:
- Crescimento sem fim do arquivo
- Tokens gastos relendo contexto que já foi resolvido
- Risco de "sujar" uma decisão consolidada com rascunho ainda em construção

## 2. A Solução: Separar Camadas de Documento

| Camada | Arquivo | Papel |
|---|---|---|
| Contrato | `PRD.md` | Fonte da verdade. Só atualiza quando uma decisão estrutural muda — ver skill `prd-reference`. |
| Feature spec | `features/NNN-nome.md` | Escopo curto de uma funcionalidade. Referencia o PRD em vez de repetir. |
| Memória de sessão | `/memories/` | Contexto de trabalho do dia — não é documentação, é memória operacional. |

## 3. Como Escrever uma Feature Spec Compacta

Um bom spec tem 8 seções fixas, todas curtas:

| Seção | Conteúdo esperado |
|---|---|
| Status | `rascunho` \| `em dev` \| `em homolog` \| `aprovado` \| `arquivado`. Atualizado a cada mudança de fase (seção 5). |
| Contexto | Uma linha dizendo por que essa feature existe. Referências: PRD §seção — não copia o conteúdo. |
| Comportamento esperado | Bullet points do que muda do ponto de vista do usuário. |
| Fora de escopo | O que essa feature **não** cobre, mesmo que pareça óbvio. Evita reabertura de debate depois. |
| Impacto no modelo de dados | Só o delta: nova coluna, nova tabela, alteração de constraint. Se não toca no banco: "nenhum". |
| Impacto na API | Só os endpoints novos ou alterados (método + rota + permissão). |
| Impacto na UI | Telas afetadas + o que muda. Sem redescrever o que já existe. |
| Critério de aceite | 3-5 condições verificáveis que definem "feito". |

## 4. Fluxo de Trabalho

1. IA e Usuário/Desenvolvedor descrevem a ideia da feature.
2. IA gera o `features/NNN-nome.md` compacto, com `Status: rascunho`.
3. Ao iniciar a implementação, atualiza `Status: em dev`.
4. IA e Usuário/Desenvolvedor usam o spec como referência durante o desenvolvimento.
5. Feature é implantada no ambiente de **homolog** e testada. Atualiza `Status: em homolog`.
6. Resultado da validação em homolog:
   - **Aprovado** → usuário dá a ordem explícita *"aprovado, atualiza o PRD"*. IA aplica a skill `prd-reference` para decidir o delta e pede aprovação da edição em si, como qualquer mudança no PRD. `Status: aprovado`.
   - **Reprovado** → IA registra o motivo da reprovação em uma linha no spec (não um post-mortem completo), volta o `Status` para `em dev` ou `rascunho` conforme o tamanho do ajuste necessário, e o ciclo recomeça a partir do passo 3 ou 1.
7. Após o PRD ser atualizado, o spec muda para `Status: arquivado` e fica em `features/` como histórico — não é apagado.

## 5. Resultado Prático

O PRD fica estável e pequeno. O spec da feature tem ~30-50 linhas. A IA lê só o spec + as seções do PRD referenciadas — não o arquivo inteiro.
