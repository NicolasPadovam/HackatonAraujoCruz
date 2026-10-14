# Implementação Técnica de Privacidade — LGPD

> Lei n° 13.709/2018 — Arts. 46°, 47°, 49° | Privacy by Design (Cavoukian)

---

## 1. Privacy by Design — 7 Princípios

| Princípio | Aplicação técnica |
|---|---|
| **Proativo, não reativo** | Considerar privacidade antes de escrever código — threat modeling de privacidade |
| **Privacidade como padrão** | Configurações mais restritivas são o default; usuário opta por compartilhar mais |
| **Privacidade incorporada ao design** | Não como add-on posterior — arquitetura considera privacidade desde o início |
| **Funcionalidade plena** | Privacidade e utilidade não são excludentes — evitar trade-offs desnecessários |
| **Segurança ponta a ponta** | Proteção desde a coleta até a eliminação |
| **Visibilidade e transparência** | Código e operações verificáveis; política auditável |
| **Respeito ao usuário** | Centrado no titular — fácil de exercer direitos, fácil de revogar |

---

## 2. Data Minimization — Colete Apenas o Necessário

```
Antes de adicionar qualquer campo ao modelo de dados, perguntar:
  1. Para qual finalidade específica este campo é necessário?
  2. Há base legal para coletar este dado?
  3. O serviço funciona sem este dado?
  4. Com que frequência este dado é realmente usado?
  5. Há um dado menos sensível que cumpre a mesma função?
```

**Exemplos de minimização:**
- Data de nascimento completa vs. apenas ano (para verificar maioridade)
- Endereço completo vs. apenas CEP (para calcular frete)
- CPF vs. e-mail como identificador único (quando CPF não é necessário para o serviço)
- Foto de rosto vs. hash biométrico (quando armazenar imagem não é necessário)

---

## 3. Ciclo de Vida dos Dados — Retenção e Eliminação

### Definir Política de Retenção

```yaml
# Exemplo de política de retenção
dados_de_conta:
  retencao_ativa: "Enquanto conta ativa"
  retencao_pos_encerramento: "5 anos (obrigação legal/exercício de direito)"
  eliminacao: "Exclusão lógica imediata + purge físico em 90 dias"

logs_de_acesso:
  retencao: "6 meses (Marco Civil da Internet)"
  eliminacao: "Purge automático via job agendado"

dados_de_transacao:
  retencao: "5 anos (Código Tributário Nacional)"
  eliminacao: "Anonimização após período fiscal + eliminação de PII"

dados_de_marketing:
  retencao: "Até revogação do consentimento"
  eliminacao: "Em até 72h após revogação"

dados_de_candidatos_rh:
  retencao: "6 meses após processo seletivo (candidatos não aprovados)"
  eliminacao: "Com notificação ao candidato"
```

### Implementação de Eliminação

```
Eliminação deve ser efetiva — não apenas marcar como deletado:

1. Soft delete (marcação) → transparência interna
2. Purge físico agendado → eliminação real do banco
3. Eliminar de backups após período de retenção de backup
4. Eliminar de logs que contenham o dado pessoal
5. Notificar operadores para eliminar em seus sistemas
6. Confirmar eliminação no registro de DSR
```

---

## 4. Controle de Acesso a Dados Pessoais

```
Princípio: acesso a dado pessoal é exceção, não regra.

□ Funcionários acessam apenas dados necessários para seu papel
□ Acesso a dados de produção requer justificativa e aprovação
□ Ambiente de desenvolvimento usa dados sintéticos ou anonimizados
□ Queries em produção sem filtro de usuário autenticado são auditadas
□ Logs de acesso a dados pessoais sensíveis com retenção mínima de 1 ano
□ Revogação de acesso no mesmo dia do desligamento de colaborador
□ Revisão periódica de acessos (trimestral para dados sensíveis)
```

---

## 5. Segurança Técnica (art. 46°)

Medidas mínimas esperadas pela ANPD:

| Camada | Medidas |
|---|---|
| **Transporte** | TLS 1.2+ em todas as comunicações |
| **Armazenamento** | Criptografia em repouso para dados sensíveis |
| **Acesso** | Autenticação forte (MFA), RBAC, least privilege |
| **Banco de dados** | Campos sensíveis criptografados no nível da coluna quando necessário |
| **Backups** | Criptografados, com acesso restrito e testados |
| **Logs** | Centralizados, imutáveis, sem dados sensíveis em claro |
| **Monitoramento** | Alertas para acesso anômalo, exfiltração de dados |
| **Desenvolvimento** | SAST, DAST, revisão de código com foco em privacidade |
| **Fornecedores** | Contratos com cláusulas de segurança e privacidade (DPA) |

---

## 6. Dados Pessoais em Diferentes Ambientes

| Ambiente | Diretriz |
|---|---|
| **Produção** | Dados reais, acesso restrito, auditado |
| **Staging** | Dados pseudonimizados ou sintéticos — nunca cópia direta de prod |
| **Desenvolvimento** | Dados sintéticos — nunca dados reais |
| **Logs de debug** | Mascarar automaticamente (CPF: `***.***.***-**`, e-mail: `u***@***.com`) |
| **Dumps para análise** | Anonimizar antes de entregar para analistas |
| **Repositório de código** | Zero dados pessoais — usar fixtures sintéticas em testes |

---
---

# Transferência Internacional de Dados — LGPD

> Lei n° 13.709/2018 — Arts. 33 a 36°

---

## 1. Quando Ocorre Transferência Internacional

Sempre que dado pessoal de titular brasileiro é:
- Armazenado em servidor fora do Brasil
- Processado por empresa/serviço no exterior
- Transmitido para filial, parceiro ou fornecedor em outro país

**Exemplos comuns em TI:**
- AWS, Google Cloud, Azure em regiões fora do Brasil
- Ferramentas SaaS com servidores nos EUA/Europa (Slack, Salesforce, HubSpot, SendGrid)
- Repositórios de código com dados em fixtures (GitHub — EUA)
- CDNs que replicam dados entre regiões

---

## 2. Mecanismos Permitidos (art. 33°)

| Mecanismo | Descrição |
|---|---|
| **País com nível adequado** | País reconhecido pela ANPD como adequado (nenhum formalmente reconhecido ainda) |
| **Cláusulas Contratuais Padrão** | Contrato com cláusulas aprovadas pela ANPD (Resolução CD/ANPD n° 19/2024) |
| **Normas corporativas globais** | Políticas internas vinculantes (Binding Corporate Rules) — para grupos empresariais |
| **Consentimento específico** | Titular consente ciente da transferência internacional |
| **Obrigação legal** | Necessário para cumprir obrigação legal |
| **Execução de contrato** | Necessário para contrato com o titular (ex: compra de produto enviado ao exterior) |
| **Cooperação jurídica** | Entre órgãos públicos |

> ⚠️ Para a maioria dos casos B2B com SaaS americano/europeu:
> usar **Cláusulas Contratuais Padrão (DPA)** com o fornecedor.

---

## 3. DPA — Data Processing Agreement

Documento contratual com fornecedores que processam dados como operadores:

**Cláusulas mínimas a verificar no DPA do fornecedor:**
```
□ Definição clara de controlador e operador
□ Finalidade e instrução de uso dos dados
□ Medidas de segurança técnicas e organizacionais
□ Suboperadores: lista e mecanismo de aprovação
□ Prazo de retenção e eliminação
□ Notificação de incidentes (prazo de aviso ao controlador)
□ Direitos dos titulares: como operador apoia o controlador
□ Auditoria: controlador pode auditar o operador
□ Transferência internacional: base legal aplicável
□ Encerramento: eliminação ou devolução dos dados
```

---
---

# DPO/Encarregado e Governança de Privacidade — LGPD

> Lei n° 13.709/2018 — Art. 41°

---

## 1. Papel do DPO (Encarregado)

**Funções obrigatórias (art. 41°, §2°):**
- Aceitar reclamações e comunicações dos titulares
- Receber comunicações da ANPD e adotar providências
- Orientar funcionários e contratados sobre práticas de proteção de dados
- Executar as demais atribuições determinadas pelo controlador ou estabelecidas em normas

**Quem pode ser DPO:**
- Pessoa física ou jurídica
- Interna ou externa (terceirizada)
- A ANPD pode publicar normas sobre categorias que dispensam DPO (PMEs)

**Obrigações de publicidade:**
- Identidade e dados de contato do DPO devem ser públicos (site, política de privacidade)

---

## 2. Programa de Governança de Privacidade

Um programa efetivo de privacidade contém:

```
PILARES DE GOVERNANÇA:

1. POLÍTICAS E DOCUMENTAÇÃO
   □ Política de Privacidade (externa — para titulares)
   □ Política Interna de Proteção de Dados (para colaboradores)
   □ ROPA atualizado
   □ Procedimento de atendimento a DSR
   □ Plano de Resposta a Incidentes
   □ Política de Retenção e Descarte de Dados

2. PESSOAS E TREINAMENTO
   □ DPO designado e publicado
   □ Treinamento de conscientização para todos os colaboradores (anual)
   □ Treinamento específico para times que tratam dados sensíveis
   □ Treinamento para novos colaboradores (onboarding)
   □ Comitê de Privacidade (recomendado para médias e grandes)

3. PROCESSOS
   □ Privacy by Design integrado ao processo de desenvolvimento (RFC, PR review)
   □ DPIA como parte do processo de novos projetos
   □ Revisão de privacidade em contratos com terceiros
   □ Processo de DSR documentado e testado
   □ Processo de resposta a incidentes testado (simulado anual)

4. TECNOLOGIA
   □ Ferramentas de consent management
   □ Sistema de registro de DSRs
   □ Ferramentas de descoberta e classificação de dados
   □ Monitoramento de acesso a dados pessoais

5. AUDITORIA E MELHORIA
   □ Auditoria interna anual de conformidade
   □ Revisão do ROPA anual
   □ Revisão de DPAs com fornecedores
   □ Atualização de políticas conforme novas regulações ANPD
```

---
---

# Checklist Geral de Conformidade LGPD

---

## Por Fase de Projeto

### Design / Inception
- [ ] Levantamento de dados pessoais e sensíveis envolvidos
- [ ] Finalidade de tratamento documentada
- [ ] Base legal identificada para cada finalidade
- [ ] Avaliação se DPIA é necessário
- [ ] Privacy by Design incorporado nos requisitos

### Desenvolvimento
- [ ] DTOs com apenas campos necessários (data minimization)
- [ ] Dados sensíveis com proteção reforçada (criptografia, acesso restrito)
- [ ] Ambiente de dev sem dados pessoais reais
- [ ] Campos sensíveis mascarados em logs
- [ ] Mecanismo de soft delete + purge agendado implementado
- [ ] Endpoint de DSR ou integração com canal de atendimento

### Pré-Deploy
- [ ] ROPA atualizado com a nova atividade de tratamento
- [ ] Política de Privacidade atualizada (se novos dados ou finalidades)
- [ ] DPAs assinados com novos fornecedores/operadores
- [ ] Mecanismo de consentimento testado (se aplicável)
- [ ] Canal de DSR funcional e testado
- [ ] Plano de resposta a incidentes cobre o novo sistema

### Operação
- [ ] Revisão anual do ROPA
- [ ] Revisão e renovação de DPAs com fornecedores
- [ ] Auditoria de acessos a dados pessoais
- [ ] Treinamento de conscientização atualizado
- [ ] Teste simulado de resposta a incidente (anual)
- [ ] Verificar prazos de retenção e acionar purge quando necessário

---

## Por Tipo de Sistema

### E-commerce / Marketplace
- [ ] Base legal para dados de compra (execução de contrato)
- [ ] Dados de cartão não armazenados (tokenização via gateway)
- [ ] Endereço retido apenas enquanto necessário
- [ ] Consentimento separado para marketing vs. funcional
- [ ] Portabilidade: exportação de histórico de compras

### SaaS B2B
- [ ] Contrato com clientes define papéis (controlador/operador)
- [ ] DPA disponível para clientes
- [ ] Isolamento multi-tenant verificado
- [ ] Dados do cliente eliminados após encerramento de contrato
- [ ] Sub-processadores listados e com DPA

### App Mobile
- [ ] Permissões solicitadas apenas quando necessárias (just-in-time)
- [ ] Dados de geolocalização com finalidade específica
- [ ] Dados de dispositivo com base legal
- [ ] Política de Privacidade acessível antes do download (stores)
- [ ] Consentimento parental se app acessível a menores

### Sistema de RH
- [ ] Dados de saúde/financeiros de funcionários com base legal (obrigação legal/contrato)
- [ ] Acesso restrito por departamento
- [ ] Dados de candidatos não aprovados com prazo de retenção
- [ ] Dados biométricos com consentimento específico e destacado

### Sistema de Saúde
- [ ] Base legal: art. 11°, f (tutela da saúde)
- [ ] Dados de prontuário com acesso restrito ao profissional de saúde
- [ ] Dados de diagnóstico criptografados em repouso
- [ ] Compartilhamento com planos/seguradoras com base legal documentada
- [ ] Respeito ao sigilo médico (CFM) em conjunto com LGPD
