# Fundamentos da LGPD — Conceitos, Definições, Princípios e Bases Legais

> Lei n° 13.709/2018 — Arts. 1°, 5°, 6°, 7°, 11°, 12°

---

## 1. O que é Dado Pessoal (art. 5°, I)

> "Informação relacionada a pessoa natural identificada **ou identificável**."

O "ou identificável" é crucial — mesmo que o dado sozinho não identifique, se em combinação
com outros dados puder identificar, é dado pessoal.

**Exemplos de dados pessoais:**
- Nome, CPF, RG, e-mail, telefone, endereço
- IP de conexão (quando vinculável a uma pessoa)
- Dados de geolocalização
- Identificadores de dispositivo (device ID, cookie ID)
- Dados comportamentais vinculados a um perfil
- Voz, imagem facial
- Placa de veículo associada ao proprietário

**Não são dados pessoais:**
- Dados de pessoa jurídica (CNPJ, razão social)
- Dados de pessoas falecidas (fora do escopo da LGPD — mas atenção ao Marco Civil)
- Dados **verdadeiramente** anonimizados (ver seção 5)
- Dados públicos sem vínculo com identificação

---

## 2. Dados Pessoais Sensíveis (art. 5°, II e art. 11°)

Categoria que exige **proteção reforçada** e bases legais mais restritas:

- Origem racial ou étnica
- Convicção religiosa
- Opinião política
- Filiação a sindicato ou organização religiosa, filosófica ou política
- Dados referentes à **saúde ou à vida sexual**
- Dados **genéticos ou biométricos** (quando vinculados a pessoa natural)
- Dado de **criança ou adolescente** (tratado como sensível na prática — art. 14°)

> ⚠️ Sistemas de saúde, RH, jurídico e biometria quase sempre trabalham com dados sensíveis.
> Exigem análise de base legal específica (art. 11°) e medidas de segurança reforçadas.

---

## 3. Atores do Tratamento (art. 5°)

| Ator | Definição | Exemplo |
|---|---|---|
| **Titular** | Pessoa natural a quem os dados se referem | Usuário do sistema, paciente, funcionário |
| **Controlador** | Quem decide o quê e como tratar | A empresa dona do produto |
| **Operador** | Quem trata em nome do controlador | AWS, fornecedor de SaaS, processador de pagamentos |
| **Encarregado (DPO)** | Canal entre controlador, titulares e ANPD | Pessoa ou empresa indicada pelo controlador |
| **ANPD** | Autoridade Nacional de Proteção de Dados | Órgão regulador e fiscalizador |

> ⚠️ Controlador e Operador têm responsabilidades distintas. Contratos entre eles devem
> estabelecer obrigações de segurança e conformidade (art. 39°).

---

## 4. O que é "Tratamento" de Dados (art. 5°, X)

Qualquer operação realizada com dados pessoais:

coleta · produção · recepção · classificação · utilização · acesso · reprodução
transmissão · distribuição · processamento · arquivamento · armazenamento · eliminação
avaliação · controle · modificação · comunicação · transferência · difusão · extração

> Ou seja: **qualquer coisa que você faz com dado pessoal é tratamento.**

---

## 5. Anonimização vs. Pseudonimização (art. 5°, III e XI)

### Anonimização (art. 12°)
- Processo pelo qual o dado **perde a possibilidade de associação** a um indivíduo, mesmo com meios razoáveis
- Dado verdadeiramente anonimizado **sai do escopo da LGPD**
- É irreversível por definição — se for reversível, não é anonimização
- Técnicas: k-anonimato, differential privacy, generalização, supressão, ruído

### Pseudonimização
- Substituição de identificadores por pseudônimos (ex: UUID em vez de CPF)
- **Continua sendo dado pessoal** — a vinculação pode ser refeita com a tabela de referência
- Reduz risco, mas não exime das obrigações da LGPD
- Boa prática para ambientes de desenvolvimento e analytics

```sql
-- ❌ Ambiente de dev com dados reais
SELECT cpf, nome, email FROM pacientes LIMIT 100;

-- ✅ Pseudonimizado — dados de dev sem identificação real
SELECT
  md5(cpf) AS cpf_hash,
  LEFT(nome, 1) || '***' AS nome_mascarado,
  'dev_' || id || '@fake.com' AS email_fake
FROM pacientes LIMIT 100;
```

---

## 6. Princípios do Tratamento (art. 6°)

| Princípio | Descrição | Implicação técnica |
|---|---|---|
| **Finalidade** | Propósito legítimo, específico, informado | Não reutilizar dados para finalidade diferente sem nova base |
| **Adequação** | Compatibilidade com a finalidade | Não coletar mais do que a finalidade exige |
| **Necessidade** | Mínimo necessário | Data minimization — não coletar "por precaução" |
| **Livre acesso** | Titular pode consultar seus dados | Implementar endpoint de consulta de dados |
| **Qualidade** | Dados exatos, atualizados | Processo de atualização e correção de dados |
| **Transparência** | Informações claras ao titular | Política de privacidade acessível e legível |
| **Segurança** | Medidas técnicas e administrativas | Criptografia, controle de acesso, monitoramento |
| **Prevenção** | Adotar medidas para prevenir danos | Privacy by Design, DPIA, revisões periódicas |
| **Não discriminação** | Não usar para fins discriminatórios | Atenção especial a dados sensíveis e perfis |
| **Responsabilização** | Demonstrar conformidade | Documentação, ROPA, políticas, registros de consentimento |

---

## 7. Bases Legais — Dados Pessoais (art. 7°)

Uma base legal **deve existir antes** de iniciar qualquer tratamento.

| Base Legal | Quando se aplica | Pontos de atenção |
|---|---|---|
| **Consentimento** (I) | Quando o titular concorda livremente | Deve ser livre, informado, inequívoco e específico. Pode ser revogado. |
| **Obrigação legal** (II) | Exigência de lei ou regulamento | Ex: retenção de NF por 5 anos, e-Social, obrigações trabalhistas |
| **Políticas públicas** (III) | Execução de políticas públicas por órgão público | Exclusivo para administração pública |
| **Estudos e pesquisas** (IV) | Pesquisa com anonimização quando possível | Academia, saúde pública — anonimizar sempre que possível |
| **Execução de contrato** (V) | Necessário para contrato com o próprio titular | Ex: entregar produto comprado exige endereço |
| **Exercício regular de direito** (VI) | Processo judicial, arbitragem, administrativo | Guarda de dados para defesa legal |
| **Legítimo interesse** (VII) | Interesse legítimo do controlador ou terceiro | Base mais ampla — requer teste de balanceamento (LIA) |
| **Tutela da saúde** (VIII) | Profissionais de saúde para procedimento | Em serviços de saúde |
| **Proteção ao crédito** (IX) | SPC, Serasa e similares | Exclusivo para este fim |

> ⚠️ **Não acumule bases legais** para o mesmo tratamento. Escolha a mais adequada.
> Acumular cria inconsistência e fragiliza a defesa em caso de questionamento.

---

## 8. Bases Legais — Dados Sensíveis (art. 11°)

Bases **mais restritas** — nem todas as do art. 7° se aplicam:

| Base Legal | Dados Sensíveis |
|---|---|
| Consentimento **específico e destacado** | ✅ — mas atenção: deve ser por finalidade, não genérico |
| Obrigação legal ou regulatória | ✅ |
| Políticas públicas | ✅ (administração pública) |
| Estudos e pesquisas (com anonimização) | ✅ |
| Exercício regular de direito | ✅ |
| Tutela da saúde (profissional ou entidade de saúde) | ✅ |
| Prevenção à fraude e segurança do titular (biometria) | ✅ |
| **Legítimo interesse** | ❌ — **não se aplica a dados sensíveis** |
| **Execução de contrato** | ❌ — **não se aplica a dados sensíveis** |

---

## 9. Escopo Territorial (art. 3°)

A LGPD se aplica quando **qualquer** das condições abaixo for verdadeira:
- O tratamento ocorre **no Brasil**
- Os dados foram coletados **no Brasil**
- O titular dos dados está **no Brasil** no momento da coleta
- A oferta de bens/serviços é direcionada ao **mercado brasileiro**

> ⚠️ Serviços SaaS estrangeiros com usuários brasileiros **estão sujeitos à LGPD**.

---

## 10. Exceções ao Escopo (art. 4°)

Fora do escopo da LGPD:
- Tratamento por **pessoa natural** para fins privados e não econômicos
- Tratamento para fins **jornalísticos, artísticos ou acadêmicos**
- Tratamento para fins de **segurança pública, defesa nacional** (regulação específica)
- Dados de **pessoas jurídicas**
- Dados de **pessoas falecidas**

---

## Checklist Rápido — Fundamentos

- [ ] Identificar todos os dados pessoais e sensíveis tratados pelo sistema
- [ ] Documentar a finalidade de cada tratamento (específica, não genérica)
- [ ] Mapear a base legal de cada finalidade
- [ ] Bases legais para dados sensíveis são as restritas do art. 11°
- [ ] Dados de crianças e adolescentes têm tratamento especial (art. 14°)
- [ ] Ambiente de desenvolvimento usa dados anonimizados ou pseudonimizados
- [ ] Verificar se o sistema está no escopo territorial da LGPD (art. 3°)
- [ ] Controladores e operadores com contratos que definem responsabilidades de privacidade
