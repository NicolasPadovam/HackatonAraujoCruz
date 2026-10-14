# Direitos do Titular e DSR (Data Subject Request)

> Lei n° 13.709/2018 — Arts. 17 a 22

---

## 1. Direitos dos Titulares (art. 18°)

| Direito | O que o titular pode pedir | Prazo de resposta |
|---|---|---|
| **Confirmação** | Confirmar se há tratamento dos seus dados | 15 dias |
| **Acesso** | Obter cópia dos dados tratados | 15 dias |
| **Correção** | Corrigir dados incompletos, inexatos ou desatualizados | 15 dias |
| **Anonimização** | Anonimizar, bloquear ou eliminar dados desnecessários ou excessivos | 15 dias |
| **Portabilidade** | Receber seus dados em formato interoperável para outro fornecedor | 15 dias |
| **Eliminação** | Solicitar eliminação de dados tratados com base em consentimento | 15 dias |
| **Informação** | Saber com quais entidades seus dados são compartilhados | 15 dias |
| **Não consentir** | Informação sobre possibilidade de não dar consentimento e consequências | Imediato (informativo) |
| **Revogação** | Revogar o consentimento dado anteriormente | 15 dias para processar |
| **Revisão** | Solicitar revisão de decisão tomada exclusivamente por tratamento automatizado | 15 dias |
| **Oposição** | Opor-se ao tratamento quando não há conformidade com a LGPD | 15 dias |

> ⚠️ O prazo de **15 dias** é contado a partir do recebimento da solicitação (art. 19°).
> A resposta deve ser imediata se a solicitação for de confirmação de existência ou acesso simplificado.

---

## 2. Fluxo de Atendimento de DSR

```
Titular faz solicitação
        │
        ▼
┌─────────────────────────────┐
│  1. Recebimento e registro  │  → Gerar ticket com timestamp
│     (canal oficial)         │  → Confirmar recebimento ao titular
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  2. Verificação de          │  → Validar identidade do solicitante
│     identidade              │  → Sem verificação excessiva que dificulte o exercício
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  3. Classificação do        │  → Que direito está sendo exercido?
│     pedido                  │  → Há base legal para manter os dados?
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  4. Análise de viabilidade  │  → Há obrigação legal que impede a eliminação?
│     e exceções              │  → Há legítimo interesse ou contrato em vigor?
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  5. Execução                │  → Ação técnica nos sistemas
│                             │  → Registro da ação realizada
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  6. Resposta ao titular     │  → Em até 15 dias
│                             │  → Formato claro e acessível
└─────────────────────────────┘
```

---

## 3. Verificação de Identidade

O controlador deve verificar que a solicitação vem do próprio titular — sem exigir documentos desnecessários:

- **Nível mínimo:** validar que o solicitante tem acesso ao e-mail/telefone cadastrado
- **Nível moderado:** para dados sensíveis ou operações irreversíveis — autenticação na conta + confirmação por e-mail
- **Nível alto:** para dados críticos — pode exigir documento com foto, mas justificar proporcionalidade

> ⚠️ Exigir documentação excessiva para exercício de direitos pode ser considerado obstáculo
> indevido pela ANPD — violar o princípio do livre acesso (art. 6°, IV).

---

## 4. Exceções ao Direito de Eliminação (art. 16°)

O dado **não precisa ser eliminado** quando o tratamento é necessário para:

| Exceção | Exemplo |
|---|---|
| Cumprimento de obrigação legal | Retenção de dados fiscais (5 anos), trabalhistas (ESOCIAL) |
| Estudo por órgão de pesquisa | Com garantia de anonimização quando possível |
| Transferência a terceiro | Quando há legítimo interesse |
| Uso exclusivo do controlador com anonimização | Analytics internos anonimizados |
| Exercício regular de direito | Dados de processo judicial em curso |

> Em caso de negativa de eliminação, o controlador deve **informar o motivo** ao titular.

---

## 5. Portabilidade (art. 18°, V)

- Direito a receber os dados em **formato estruturado e interoperável**
- A ANPD definirá formatos e procedimentos específicos (ainda em regulamentação detalhada)
- Referência de mercado: JSON, CSV — evitar PDF sem dados estruturados
- Portabilidade de dados tratados com base em **consentimento ou contrato**
- Não obriga migração direta de sistema para sistema (apenas entrega ao titular)

---

## 6. Revisão de Decisão Automatizada (art. 20°)

O titular pode solicitar **revisão humana** de decisões tomadas exclusivamente por algoritmos
que afetem seus interesses:

- Aprovação de crédito automatizada
- Score de risco
- Contratação ou promoção automática
- Classificação de perfil

**Obrigações do controlador:**
- Informar ao titular sobre a existência de decisão automatizada (art. 20°, §1°)
- Atender pedido de revisão em até 15 dias
- Não é obrigado a revelar o algoritmo (segredo comercial) mas deve explicar critérios

---

## 7. Implementação Técnica do Canal DSR

### Requisitos mínimos

```
1. Canal oficial identificado na Política de Privacidade
2. Formulário ou e-mail com campos:
   - Identificação do titular
   - Tipo de solicitação
   - Descrição do pedido
3. Confirmação automática de recebimento com protocolo
4. Registro interno (ticket) com:
   - Data e hora de recebimento
   - SLA de resposta (15 dias)
   - Status de andamento
   - Histórico de ações tomadas
5. Alerta de prazo para o time responsável
```

### Estrutura de Dados Recomendada para Log de DSR

```json
{
  "requestId": "DSR-2024-0042",
  "receivedAt": "2024-03-15T10:30:00Z",
  "dueAt": "2024-03-30T23:59:59Z",
  "status": "IN_PROGRESS",
  "type": "DELETION",
  "titularId": "uuid-mascarado",
  "titularEmail": "u***@email.com",
  "identityVerified": true,
  "identityVerifiedAt": "2024-03-15T10:35:00Z",
  "actions": [
    {
      "timestamp": "2024-03-15T11:00:00Z",
      "action": "IDENTITY_VERIFIED",
      "operator": "privacy@empresa.com"
    },
    {
      "timestamp": "2024-03-16T14:00:00Z",
      "action": "DATA_MAPPED",
      "systems": ["crm", "billing", "logs"],
      "operator": "privacy@empresa.com"
    }
  ],
  "responseAt": null,
  "responseContent": null
}
```

---

## 8. Direitos de Crianças e Adolescentes (art. 14°)

Tratamento de dados de menores de 18 anos exige:
- **Consentimento dos pais ou responsável legal** (não da criança/adolescente)
- **Consentimento específico e destacado** para crianças (até 12 anos incompletos)
- Verificação do consentimento do responsável com esforço razoável
- Finalidade limitada ao necessário para participação da criança no serviço
- Proibição de repasse a terceiros sem consentimento dos pais
- Proibição de condicionamento de participação a consentimento para uso publicitário

> ⚠️ Sistemas que podem ser usados por menores devem ter mecanismo de verificação de idade
> e processo de coleta de consentimento parental.

---

## Checklist Rápido — Direitos e DSR

- [ ] Canal oficial de DSR identificado na Política de Privacidade
- [ ] Confirmação automática de recebimento com protocolo
- [ ] SLA de 15 dias monitorado com alertas
- [ ] Verificação de identidade proporcional (sem exigência excessiva)
- [ ] Processo documentado para cada tipo de solicitação
- [ ] Exceções ao direito de eliminação mapeadas e documentadas
- [ ] Resposta ao titular em formato claro e acessível
- [ ] Registro imutável de todas as ações em cada DSR
- [ ] Processo de revisão humana para decisões automatizadas
- [ ] Consentimento parental para sistemas com menores de 18 anos
