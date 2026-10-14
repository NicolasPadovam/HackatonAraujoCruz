# ROPA — Registro de Atividades de Tratamento

> Lei n° 13.709/2018 — Art. 37°

---

## 1. O que é ROPA

O ROPA (Record of Processing Activities) é o **inventário documentado** de todas as
atividades de tratamento de dados pessoais realizadas pelo controlador e pelo operador.

**Obrigatoriedade:** art. 37° determina que controladores e operadores devem manter registro
das operações de tratamento. A ANPD pode solicitar este registro a qualquer momento.

---

## 2. Estrutura Mínima de um ROPA

Para cada atividade de tratamento:

```
┌──────────────────────────────────────────────────────────────┐
│ ATIVIDADE: [nome descritivo — ex: "Cadastro de Clientes"]    │
├──────────────┬───────────────────────────────────────────────┤
│ Controlador  │ Razão social, CNPJ, DPO, contato             │
│ Finalidade   │ Para que os dados são tratados                │
│ Base legal   │ Art. 7° ou Art. 11° — qual inciso            │
│ Categorias   │ Pessoal / Sensível / Criança-Adolescente      │
│ Dados colet. │ Quais campos exatamente                       │
│ Titulares    │ Clientes / Funcionários / Pacientes / ...     │
│ Origem       │ Formulário web / API / Parceiro / ...         │
│ Destinatários│ Quais equipes, sistemas, terceiros têm acesso │
│ Transferência│ Dados vão para fora do Brasil? Para onde?     │
│ Retenção     │ Por quanto tempo / critério de eliminação     │
│ Segurança    │ Medidas técnicas e organizacionais aplicadas  │
│ DPIA?        │ Necessário? Realizado? Data?                  │
│ Última rev.  │ Data da última revisão do registro            │
└──────────────┴───────────────────────────────────────────────┘
```

---

## 3. Exemplo Preenchido

```yaml
atividade: "Cadastro e autenticação de usuários"
controlador:
  nome: "Empresa XYZ Ltda"
  cnpj: "00.000.000/0001-00"
  dpo: "privacidade@empresa.com"

finalidade: >
  Criação e gerenciamento de conta de acesso à plataforma;
  autenticação e controle de sessão; comunicações transacionais
  (confirmação de cadastro, redefinição de senha).

base_legal:
  artigo: 7°
  inciso: V — "execução de contrato"
  justificativa: >
    O cadastro é necessário para execução do contrato de prestação
    de serviço firmado com o titular ao aceitar os Termos de Uso.

categorias_de_dados:
  - Nome completo (pessoal)
  - E-mail (pessoal)
  - Senha (hash — pessoal)
  - IP de acesso (pessoal)
  - Data de nascimento (pessoal)

titulares: "Usuários cadastrados na plataforma (pessoas físicas)"
origem: "Formulário de cadastro próprio; cadastro via OAuth Google/Apple"

destinatarios:
  internos:
    - Time de produto (leitura — suporte ao cliente)
    - Time de infraestrutura (acesso ao banco — restrito)
  externos:
    - SendGrid (envio de e-mails transacionais — operador)
    - AWS (hospedagem — operador)

transferencia_internacional:
  ocorre: sim
  destinos:
    - AWS us-east-1 (EUA) — contrato com cláusulas de proteção de dados
    - SendGrid (EUA) — contrato com DPA

retencao:
  periodo: "Enquanto a conta estiver ativa + 5 anos após encerramento"
  criterio_eliminacao: >
    Conta inativa por 2 anos recebe notificação; se sem resposta,
    encerramento com eliminação de dados pessoais. Logs de acesso
    mantidos por 6 meses (Marco Civil). Dados fiscais retidos por 5 anos.

medidas_de_seguranca:
  - Senha armazenada com Argon2id
  - TLS 1.3 em trânsito
  - Acesso ao banco de dados restrito por IP + credencial rotacionada
  - Logs de acesso com retenção centralizada
  - MFA disponível para usuários

dpia:
  necessario: nao
  justificativa: >
    Tratamento em escala controlada, sem dados sensíveis,
    sem decisão automatizada com impacto significativo.

ultima_revisao: "2024-03-01"
proximo_review: "2025-03-01"
```

---

## 4. Processo de Manutenção do ROPA

- Revisão periódica: mínimo anual ou quando houver mudança no sistema
- Gatilhos para atualização: novo produto, nova integração, novo país, mudança de finalidade
- Responsável: DPO em colaboração com times de produto e engenharia
- Armazenamento: ferramenta dedicada (OneTrust, TrustArc, planilha controlada) — protegido

---
---

# DPIA — Relatório de Impacto à Proteção de Dados Pessoais

> Lei n° 13.709/2018 — Art. 38°

---

## 1. O que é DPIA

O DPIA (Data Protection Impact Assessment) é uma **avaliação prévia de risco** para operações
de tratamento que podem gerar riscos elevados aos direitos e liberdades dos titulares.

**Quando a ANPD pode exigir:** art. 38° — a ANPD poderá solicitar o DPIA ao controlador.

---

## 2. Quando Fazer DPIA

DPIA é obrigatório (ou fortemente recomendado) nas situações:

| Situação | Risco |
|---|---|
| Tratamento em **larga escala** de dados sensíveis | Alto |
| **Monitoramento sistemático** de indivíduos em espaços públicos | Alto |
| **Decisões automatizadas** com efeito legal ou similar | Alto |
| **Criação de perfis** com base em dados pessoais | Médio-Alto |
| Dados de **crianças e adolescentes** | Alto |
| Dados de **pessoas vulneráveis** (pacientes, idosos, presos) | Alto |
| **Transferência internacional** de dados | Médio |
| Uso de **novas tecnologias** (biometria, IA, IoT) | Médio-Alto |
| Combinação de bancos de dados de fontes diferentes | Médio |
| Tratamento que possa resultar em **discriminação** | Alto |

**Regra prática:** se você identificar 2+ fatores acima, realize o DPIA.

---

## 3. Estrutura do DPIA

```
1. DESCRIÇÃO DO TRATAMENTO
   - Natureza, escopo, contexto e finalidade
   - Categorias de dados e titulares envolvidos
   - Volume e frequência do tratamento

2. AVALIAÇÃO DE NECESSIDADE E PROPORCIONALIDADE
   - O tratamento é necessário para a finalidade?
   - Existem meios menos invasivos à privacidade?
   - Base legal identificada e adequada

3. MAPEAMENTO DE RISCOS
   - Identificar ameaças (acesso não autorizado, vazamento, uso indevido...)
   - Avaliar probabilidade e impacto de cada ameaça
   - Calcular nível de risco (probabilidade × impacto)

4. MEDIDAS DE MITIGAÇÃO
   - Para cada risco identificado: medida técnica e/ou organizacional
   - Risco residual após mitigação

5. CONSULTA AO DPO (e titulares quando aplicável)
   - DPO deve ser consultado formalmente
   - Colher contribuição de titulares ou representantes quando viável

6. APROVAÇÃO E REGISTRO
   - Aprovação formal (C-level ou Comitê de Privacidade)
   - Armazenar com controle de versão
   - Data de revisão futura
```

---

## 4. Matriz de Risco Simplificada

| | **Baixo Impacto** | **Médio Impacto** | **Alto Impacto** |
|---|---|---|---|
| **Baixa Prob.** | 🟢 Baixo | 🟡 Médio | 🟡 Médio |
| **Média Prob.** | 🟡 Médio | 🟠 Alto | 🔴 Crítico |
| **Alta Prob.** | 🟡 Médio | 🔴 Crítico | 🔴 Crítico |

Riscos 🔴 Crítico exigem mitigação antes do início do tratamento.
Riscos 🔴🟠 Alto exigem mitigação e monitoramento contínuo.

---
---

# Consentimento — LGPD

> Lei n° 13.709/2018 — Arts. 7°, I; 8°; 9°; 11°, I

---

## 1. Requisitos do Consentimento Válido (art. 8°)

O consentimento deve ser:

| Requisito | O que significa |
|---|---|
| **Livre** | Sem coerção — negar consentimento não pode impedir serviço essencial |
| **Informado** | O titular entende para que está consentindo |
| **Inequívoco** | Ação afirmativa clara — não vale silêncio, opt-out pré-marcado ou inércia |
| **Específico** | Para finalidade determinada — não vale consentimento genérico |
| **Por escrito ou outro meio** | Deve ser demonstrável — registrar timestamp, canal, versão do texto |
| **Destacado** (dados sensíveis) | Em negrito, caixa separada — visualmente diferenciado do restante |

---

## 2. O que Invalida o Consentimento

```
❌ "Ao continuar usando o site, você concorda com nossa política"
❌ Checkbox pré-marcado
❌ Texto genérico: "uso de dados para melhorar serviços"
❌ Consentimento bundled com aceitação de Termos de Uso (para finalidades opcionais)
❌ Sem possibilidade de revogação fácil
❌ Consentimento exigido para finalidade desnecessária ao serviço essencial
```

---

## 3. Implementação de Banner/Modal de Consentimento

```
Requisitos mínimos:
✅ Finalidades específicas listadas (não "marketing" genérico)
✅ Botão "Aceitar" e "Recusar" igualmente acessíveis (sem dark patterns)
✅ Link para Política de Privacidade completa
✅ Data e versão do consentimento coletado
✅ Granularidade: titular pode aceitar/recusar por categoria
✅ Possibilidade de revogar posteriormente (nas configurações)
✅ Registro: timestamp + versão do texto consentido + IP + canal
```

### Dark Patterns a Evitar (ilegais sob a LGPD)

```
❌ Botão "Aceitar" em verde destacado e "Recusar" em cinza pequeno
❌ "Aceitar todos" em um clique, "Recusar" exige 7 cliques
❌ Fechamento do banner conta como consentimento
❌ Finalidades marcadas por padrão que o usuário precisa desmarcar
❌ Reabertura repetida do banner após recusa
```

---

## 4. Registro de Consentimento

```json
{
  "consentId": "uuid-v4",
  "titularId": "user-uuid",
  "collectedAt": "2024-03-15T14:22:00Z",
  "channel": "WEB_SIGNUP_FORM",
  "policyVersion": "v3.2",
  "policyUrl": "https://empresa.com/privacidade/v3.2",
  "ipAddress": "hash-do-ip",
  "userAgent": "Mozilla/5.0...",
  "purposes": [
    { "id": "analytics", "label": "Análise de uso da plataforma", "granted": true },
    { "id": "marketing_email", "label": "E-mails de novidades e promoções", "granted": false },
    { "id": "third_party_ads", "label": "Publicidade de parceiros", "granted": false }
  ],
  "revokedAt": null
}
```

---

## 5. Revogação de Consentimento (art. 8°, §5°)

- Revogação deve ser tão fácil quanto a concessão
- Após revogação: cessação do tratamento com base naquele consentimento **no menor tempo possível**
- Tratamentos em curso baseados em consentimento anterior devem ser encerrados
- Informar ao titular sobre os efeitos da revogação (ex: recurso que deixará de funcionar)

---
---

# Incidentes de Segurança e Dados — LGPD

> Lei n° 13.709/2018 — Art. 48° e Resolução CD/ANPD n° 15/2024

---

## 1. O que Configura Incidente de Dados

Qualquer evento adverso que resulte em:
- **Destruição** de dados pessoais (intencional ou acidental)
- **Perda** de acesso ou disponibilidade
- **Alteração** não autorizada
- **Acesso não autorizado** (interno ou externo)
- **Comunicação ou difusão** indevida

---

## 2. Prazos de Notificação (Resolução ANPD 15/2024)

| Etapa | Prazo |
|---|---|
| **Ciência interna** do incidente | T=0 |
| **Comunicação preliminar à ANPD** | Até **72 horas** após ciência (se risco alto ou muito alto) |
| **Comunicação complementar à ANPD** | Até **30 dias** após comunicação preliminar |
| **Comunicação aos titulares afetados** | Em **prazo razoável** definido pela ANPD, geralmente junto à ANPD |

> ⚠️ A comunicação em 72h é uma **obrigação legal** quando o incidente pode causar
> risco ou dano relevante aos titulares. Não notificar é infração adicional.

---

## 3. Avaliação de Risco do Incidente

Perguntas para avaliar se comunicação é obrigatória:

```
1. Dados sensíveis foram expostos? → Eleva risco
2. Dados de crianças/adolescentes? → Eleva risco
3. Volume: quantos titulares afetados? → >1.000 = alto
4. Pode causar dano financeiro (fraude, roubo de identidade)? → Eleva risco
5. Pode causar discriminação, dano à reputação? → Eleva risco
6. Os dados eram criptografados? → Reduz risco se chave não comprometida
7. Os dados já eram públicos? → Pode reduzir risco
8. Há risco de publicação/venda dos dados? → Eleva risco
```

Se 2+ respostas elevam risco → comunicação à ANPD em 72h.

---

## 4. Conteúdo da Comunicação à ANPD

A comunicação preliminar deve conter (mínimo):
- Data e hora do incidente (ou estimativa)
- Natureza dos dados afetados
- Categorias e número estimado de titulares
- Medidas técnicas de segurança adotadas (criptografia, anonimização)
- Riscos relacionados ao incidente
- Medidas adotadas ou planejadas para mitigar efeitos

Canal: portal gov.br/ANPD ou e-mail oficial indicado no site da ANPD.

---

## 5. Plano de Resposta a Incidentes — Estrutura

```
FASE 1 — DETECÇÃO E TRIAGEM (0-4h)
  □ Confirmar que é um incidente de dados (não falso positivo)
  □ Acionar equipe de resposta (Security, DPO, Jurídico, Comunicação)
  □ Preservar evidências (logs, capturas de tela)
  □ Isolar sistemas afetados se necessário
  □ Registrar T=0 (hora da ciência)

FASE 2 — CONTENÇÃO (4-24h)
  □ Bloquear vetor de acesso identificado
  □ Revogar credenciais comprometidas
  □ Avaliar escopo completo (quais dados, quantos titulares)
  □ Avaliar risco → comunicação à ANPD necessária?

FASE 3 — NOTIFICAÇÃO (24-72h)
  □ Se risco alto: rascunhar comunicação à ANPD
  □ Aprovação do DPO e Jurídico
  □ Envio à ANPD dentro das 72h
  □ Avaliar comunicação aos titulares afetados

FASE 4 — REMEDIAÇÃO
  □ Corrigir vulnerabilidade raiz
  □ Restaurar serviços com segurança
  □ Notificar titulares (se aplicável)
  □ Monitoramento reforçado por 30+ dias

FASE 5 — PÓS-INCIDENTE
  □ Comunicação complementar à ANPD (30 dias)
  □ Revisão do incidente (root cause, timeline)
  □ Atualizar DPIA e ROPA
  □ Melhorias de controles identificadas
  □ Registro interno permanente do incidente
```

---

## Checklist Rápido — ROPA, DPIA, Consentimento e Incidentes

**ROPA:**
- [ ] Registro criado para cada atividade de tratamento
- [ ] Base legal documentada por atividade
- [ ] Revisão anual agendada
- [ ] Destinatários e transferências internacionais mapeados

**DPIA:**
- [ ] Critérios de gatilho documentados para novos projetos
- [ ] DPIA realizado para tratamentos de alto risco
- [ ] DPO consultado formalmente
- [ ] Aprovação registrada com data

**Consentimento:**
- [ ] Consentimento específico por finalidade (não genérico)
- [ ] Opt-in ativo (sem checkbox pré-marcado)
- [ ] Registro de consentimento com timestamp e versão da política
- [ ] Mecanismo de revogação tão fácil quanto concessão
- [ ] Sem dark patterns

**Incidentes:**
- [ ] Plano de resposta a incidentes documentado
- [ ] Time de resposta definido (Security + DPO + Jurídico)
- [ ] Processo de avaliação de risco para decidir notificação
- [ ] Contato da ANPD e canal de comunicação known pela equipe
- [ ] SLA de 72h monitorado
- [ ] Registro imutável de incidentes
