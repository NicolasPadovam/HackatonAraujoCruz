# 003 — Configurações > Usuários

**Status:** implementado (migration 000700, Edge Function `gerir-usuarios` e tela). Pendente: publicar a função, configurar e-mail e URL no Supabase e testar com dados reais.

## Contexto

O sistema tem login (Supabase Auth) e uma tabela `perfis` com um papel por usuário, mas não há tela para criar usuários nem para dizer qual função cada um tem. A feature [002](002-atividades-por-funcao.md) precisa saber a **função** de quem está logado (Administrativo ou Corretora) para mostrar as atividades certas.

Será criado um módulo **Configurações**. **Por enquanto ele terá apenas a gestão de usuários**; outras configurações entram depois, na mesma área.

## Comportamento esperado

### Acesso ao módulo

- Item **Configurações** no menu, visível **só para o administrador do sistema**.
- Dentro dele, a seção **Usuários**. O módulo foi pensado para receber outras seções no futuro (menu lateral da própria página), mas hoje só existe esta.

### Dois conceitos por usuário

| Conceito | Valores | Para que serve |
| --- | --- | --- |
| **Função** | Administrativo, Corretora | Define quais atividades aparecem em "Minhas atividades" ([002](002-atividades-por-funcao.md)) |
| **Acesso** | Administrador, Usuário | Define o que a pessoa pode fazer no sistema |

- **Administrador**: tudo o que um usuário faz, mais Configurações e gestão de usuários. Vê as atividades das duas funções.
- **Usuário**: acessa as telas conforme a tabela abaixo. A função não muda o que a pessoa pode abrir; muda só a lista de atividades.

Proposta de acesso (a confirmar, ver perguntas):

| Tela | Administrador | Usuário |
| --- | --- | --- |
| Início, Renovações, Clientes, Painel | sim | sim |
| Importar planilha | sim | sim |
| Configurações > Usuários | sim | não |

### Tela Usuários

- Lista: nome, e-mail, função, acesso, situação (ativo/inativo), último acesso quando disponível.
- **Criar usuário**: nome, e-mail, função, acesso. O usuário recebe um **convite por e-mail** para definir a própria senha; o administrador **não vê nem define senha**.
- **Editar**: nome, função e acesso.
- **Desativar/reativar**: usuário inativo não consegue entrar. Não se exclui usuário (preserva o histórico de quem fez cada alteração).
- Proteções: o último administrador ativo não pode ser desativado nem rebaixado; o administrador não pode desativar a si mesmo.

### Modo demonstração

- Sem Supabase, a tela mostra usuários fictícios guardados só no navegador, para a equipe conhecer o fluxo. Nada é enviado.

## Fora de escopo

- Outras configurações (seguradoras, prazos, modelos de importação).
- Permissões por tela ou por campo além de Administrador/Usuário.
- Separar atividades por pessoa dentro da mesma função (será definido depois).
- Redefinição de senha pelo administrador. O próprio usuário usa "esqueci a senha".
- Login social ou 2FA.

## Impacto no modelo de dados

- `perfis`: acrescentar `funcao` (`administrativo` | `corretora`). O campo `papel` atual (`admin`, `corretor`, `atendente`) continua servindo de **nível de acesso**; a proposta é tratá-lo como Administrador (`admin`) e Usuário (os demais) e simplificar os valores numa migration futura, depois de decidir o item 1 das perguntas.
- `perfis.ativo` já existe e passa a ser usado para desativar.
- A ligação `corretores.perfil_id` já existe; vincular usuário a corretor (R/C) fica para quando as atividades forem separadas por pessoa.

## Impacto na API

- Criar usuário e enviar convite exige a **chave de serviço** do Supabase, que **não pode ir para o navegador**. A criação deve passar por uma **Edge Function** que (1) confirma que quem chama é administrador ativo, (2) chama o convite do Supabase Auth, (3) grava `funcao` e `papel` em `perfis`.
- Editar função/acesso e desativar: podem ser `update` em `perfis` com policy que só admin pode alterar `papel`, `funcao` e `ativo` de outros usuários (a policy atual já impede o usuário de alterar o próprio papel).
- O convite por e-mail depende de o envio de e-mails estar configurado no projeto Supabase.
- A lista de usuários contém dados pessoais (nome e e-mail): só o administrador a lê (a policy `perfis_select` já faz isso, e cada usuário lê o próprio perfil).

## Impacto na UI

- `auth/AuthGate.tsx` e `useSessao`: expor `funcao`, `acesso` e `nome` do perfil carregado, além do e-mail.
- `App.tsx`: rota e item de menu **Configurações**, escondidos para quem não é administrador, e rota protegida (não basta esconder o menu).
- Nova página `pages/Configuracoes.tsx` com a seção Usuários.
- Usar `funcao` na tela Início ([002](002-atividades-por-funcao.md)).

## Critério de aceite

1. Usuário com acesso "Usuário" não vê o item Configurações e é redirecionado se abrir a rota direto.
2. Administrador cria um usuário com e-mail, função e acesso; o convite é enviado e o usuário aparece como ativo após o primeiro acesso.
3. A senha nunca é exibida nem pedida ao administrador.
4. Desativar um usuário impede o login dele; reativar devolve o acesso.
5. Não é possível desativar ou rebaixar o último administrador ativo, nem desativar a si mesmo.
6. Chamar a Edge Function sem ser administrador retorna erro e não cria nada.
7. No modo demonstração, nada é enviado ao Supabase.

## Decisões

- O módulo Configurações nasce só com Usuários.
- Duas funções: Administrativo e Corretora. A separação por pessoa dentro da função será explicada depois.
- Cada usuário tem função e acesso, e o administrador do sistema é quem os define.

## Perguntas em aberto

1. Os níveis de acesso são só Administrador e Usuário? Ou será preciso restringir telas por função (por exemplo, Importar só para o Administrativo)?
2. Criação por **convite por e-mail** (recomendado) ou o administrador define uma senha provisória? A segunda opção exige que ele a conheça e a repasse.
3. Quem será o primeiro administrador e como ele é criado? (Hoje não há tela para isso; seria feito direto no Supabase.)
4. O envio de e-mail do Supabase está configurado? Sem isso o convite não chega.
5. Um usuário pode ter as duas funções (por exemplo, quem faz tudo em dias de pouco movimento)?
