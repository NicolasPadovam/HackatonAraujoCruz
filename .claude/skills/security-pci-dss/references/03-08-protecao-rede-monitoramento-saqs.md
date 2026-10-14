# Proteção de Dados do Cartão — PCI-DSS v4.0

> PCI-DSS v4.0 — Req. 3 e 4

---

## 1. Proteção de PAN Armazenado (Req. 3.5)

Se há necessidade legítima de armazenar o PAN, ele deve ser tornado **ilegível**:

| Método | Como implementa | Nível de proteção |
|---|---|---|
| **Hash criptográfico unidirecional** | SHA-256 ou SHA-3 do PAN completo + salt | Alto — irreversível |
| **Truncamento** | Armazenar apenas parte (ex: últimos 4 dígitos) | Alto — sem recuperação |
| **Tokenização** | Substituir por token via vault | Alto — token sem valor |
| **Criptografia forte** | AES-256 com gestão rigorosa de chaves | Alto — reversível com chave |
| **Índice de token** (one-time pad) | Mapeamento aleatório via pad seguro | Alto — complexo de implementar |

> ⚠️ **Hash simples sem salt não é suficiente** — PANs têm formato previsível
> (16 dígitos, BINs conhecidos) e são vulneráveis a rainbow tables.

### Criptografia de PAN — Gestão de Chaves (Req. 3.6 e 3.7)

```
Requisitos mínimos de gestão de chaves:
□ Geração de chaves com CSPRNG (AES-256 mínimo)
□ Distribuição de chaves de forma segura (cifradas)
□ Armazenamento de chaves protegido (HSM ou equivalente)
□ Controle de acesso às chaves (custódias, dual control)
□ Rotação de chaves: anual ou quando houver suspeita de compromisso
□ Aposentadoria/revogação de chaves com procedimento documentado
□ Registro de todos os custódios de chaves

HSM (Hardware Security Module):
- Ideal para armazenar KEK (Key Encryption Key)
- AWS CloudHSM, Thales Luna, Utimaco
- Alternativa em cloud: AWS KMS, GCP KMS, Azure Key Vault
  (atentar para responsabilidade compartilhada)
```

---

## 2. Proteção em Trânsito (Req. 4)

```
Req. 4.2.1 — TLS forte em transmissões de dados de cartão:
□ TLS 1.2 mínimo (TLS 1.3 recomendado)
□ Desabilitar SSL e TLS 1.0/1.1 completamente
□ Cipher suites com Forward Secrecy (ECDHE, DHE)
□ Certificados válidos (não autoassinados em produção)
□ Verificação de certificado NUNCA desabilitada em código

Req. 4.2.2 — PAN em mensageria:
□ E-mail com PAN: usar criptografia de mensagem (S/MIME, PGP)
□ Nunca enviar PAN em SMS, chat, e-mail sem criptografia
□ Dados de cartão em APIs: sempre HTTPS, nunca HTTP
```

---

## 3. Inventário de Dados — Localização de PANs (Req. 3.3)

Req. 3.3.3 (v4.0) exige processo para descoberta de PANs armazenados:

```bash
# Ferramentas de descoberta de dados de cartão (PAN Discovery)
# Procuram padrões de PAN em bancos, arquivos, logs

# Luhn algorithm check + regex para 13-19 dígitos
# Exemplos de padrões Visa: 4[0-9]{12,18}
# Mastercard: 5[1-5][0-9]{14} ou 2[2-7][0-9]{14}
# Amex: 3[47][0-9]{13}
# Elo: padrões específicos de BIN

# Ferramentas open source: PANhunter, CScan
# Ferramentas comerciais: Spirent/Ixia, Ground Labs Enterprise Recon
```

---
---

# Controles de Rede e Acesso — PCI-DSS v4.0

> PCI-DSS v4.0 — Req. 1, 2, 7, 8, 9

---

## 4. Segmentação de Rede (Req. 1)

A segmentação não é **obrigatória** pelo PCI-DSS, mas é a principal forma de reduzir escopo.
Sem segmentação, toda a rede corporativa pode estar no escopo.

### Segmentação Efetiva

```
┌─────────────────────────────────────────────────────────┐
│                    INTERNET                             │
└───────────────────────┬─────────────────────────────────┘
                        │
                   [WAF / DDoS]
                        │
         ┌──────────────▼──────────────┐
         │         DMZ                 │
         │  Load Balancer / Proxy      │
         └──────────────┬──────────────┘
              ┌─────────┴─────────┐
              │ FIREWALL RIGOROSO │  ← regras explícitas, deny-all default
              └─────────┬─────────┘
         ┌──────────────▼──────────────┐
         │        REDE CDE             │ ← escopo PCI
         │  App Server de Checkout     │
         │  Banco de Dados de Trans.   │
         │  HSM / Key Management       │
         └──────────────┬──────────────┘
              ┌─────────┴─────────┐
              │ FIREWALL RIGOROSO │
              └─────────┬─────────┘
         ┌──────────────▼──────────────┐
         │      REDE CORPORATIVA       │ ← fora do escopo PCI
         │  ERP, CRM, e-mail, etc.    │
         └─────────────────────────────┘
```

### Controles de Firewall (Req. 1.3)

```
Requisitos mínimos de firewall para o CDE:
□ Regras documentadas com justificativa de negócio para cada regra
□ Default deny — bloquear tudo que não é explicitamente permitido
□ Revisão semestral das regras de firewall
□ Proibir tráfego de entrada da internet direto ao CDE
□ Proibir acesso de saída não autorizado do CDE à internet
□ Stateful inspection habilitado
□ Logs de tráfego negado registrados
```

---

## 5. Configuração Segura de Sistemas (Req. 2)

```
Req. 2.2 — Hardening de todos os sistemas no CDE:
□ Mudar todas as senhas e configurações padrão de fábrica
□ Remover contas padrão desnecessárias
□ Habilitar apenas serviços, protocolos e portas necessários
□ Desabilitar funcionalidades desnecessárias (ex: serviços de debug)
□ Documentar configuração de segurança (baseline)
□ Seguir CIS Benchmarks ou DISA STIGs como referência

Req. 2.3 — Ambientes sem fio:
□ Alterar chaves de criptografia e senhas WPA padrão
□ Usar WPA3 ou WPA2 com AES (não TKIP)
□ Não usar WEP em nenhuma hipótese
□ Inventário de dispositivos sem fio com varredura periódica
```

---

## 6. Controle de Acesso — Identidade e Autenticação (Req. 7 e 8)

### Least Privilege (Req. 7)

```
□ Acesso ao CDE baseado em necessidade do negócio (need-to-know)
□ Acesso padrão = nenhum; conceder explicitamente
□ Revisão de acessos ao CDE: a cada 6 meses no mínimo
□ Remover acesso imediatamente ao desligamento
□ Documentar solicitação, aprovação e concessão de cada acesso
```

### Autenticação Forte no CDE (Req. 8)

```
Req. 8.3.6 — Requisitos de senha para acesso ao CDE:
□ Comprimento mínimo: 12 caracteres (era 7 no PCI v3.2.1)
□ Complexidade: letras maiúsculas, minúsculas, números e especiais
□ Histórico: não reutilizar as últimas 4 senhas (mínimo)
□ Expiração: máximo 90 dias (ou usar MFA como alternativa)
□ Bloqueio: máximo 10 tentativas incorretas
□ Timeout de sessão: máximo 15 minutos de inatividade no CDE

Req. 8.4.2 — MFA obrigatório para TODOS os acessos ao CDE:
□ MFA para acesso administrativo remoto
□ MFA para acesso local ao CDE (novo no v4.0)
□ MFA para acesso a interfaces de administração web do CDE
□ Fatores aceitos: TOTP, hardware token, push notification, biometria
□ NÃO aceito como MFA: perguntas de segurança, e-mail de confirmação

Req. 8.6 — Contas de sistema e aplicação:
□ Contas de serviço com senhas únicas e fortes
□ Rotação de senhas de contas de serviço periodicamente
□ Contas de serviço: acesso mínimo necessário
□ Nunca usar contas de serviço para acesso interativo humano
```

---
---

# Monitoramento, Logging e Testes — PCI-DSS v4.0

> PCI-DSS v4.0 — Req. 10 e 11

---

## 7. Logging no CDE (Req. 10)

### O que Deve Ser Logado (Req. 10.2)

```
Eventos obrigatórios no CDE:
□ Acesso individual a dados de portador de cartão (CHD)
□ Todas as ações de usuários com privilégio root/admin
□ Acesso a audit trails
□ Tentativas de acesso lógico inválidas
□ Uso de mecanismos de identificação e autenticação
□ Inicialização, parada e pausa de audit logs
□ Criação e exclusão de objetos no CDE
□ Mudanças na configuração de componentes do CDE
```

### Estrutura Mínima de Cada Log (Req. 10.3)

```json
{
  "timestamp": "2024-03-15T14:22:31.000Z",
  "user_id": "admin_joao",
  "event_type": "DATA_ACCESS",
  "resource": "transactions_table",
  "action": "SELECT",
  "source_ip": "10.0.1.50",
  "outcome": "SUCCESS",
  "affected_records": 1,
  "session_id": "sess_abc123"
}
```

### Proteção dos Logs (Req. 10.3 e 10.5)

```
□ Logs imutáveis — impossível modificar sem detecção
□ Logs transmitidos para sistema centralizado em tempo real
□ Sistema de log separado e protegido (não no mesmo servidor)
□ Monitoramento de integridade dos logs (hash ou similar)
□ Alertas para modificação ou deleção de logs
□ Retenção: mínimo 12 meses, sendo 3 meses imediatamente disponíveis
□ Acesso aos logs restrito ao mínimo necessário
```

---

## 8. Antimalware e Proteção de Endpoints (Req. 5)

```
□ Solução antimalware em todos os sistemas no CDE e conectados
□ Definições atualizadas automaticamente
□ Varreduras periódicas agendadas
□ Proteção contra alteração/desabilitação pelo usuário
□ Logs de atividade de malware retidos
□ Para sistemas considerados de baixo risco: avaliação periódica documentada
```

---

## 9. Testes de Segurança (Req. 11)

### Varredura de Vulnerabilidades (ASV Scan — Req. 11.3)

```
Varredura externa (ASV — Approved Scanning Vendor):
□ Trimestral — obrigatório para Nível 1, 2 e 3
□ Após mudanças significativas na infraestrutura
□ Resultado: nota "passing" pelo ASV antes de submeter ao adquirente
□ Vulnerabilidades críticas (CVSS ≥ 4.0 para ASV) resolvidas antes de passar

Varredura interna:
□ Trimestral
□ Após mudanças significativas
□ Realizada por pessoal qualificado internamente ou terceiro
□ Vulnerabilidades altas (CVSS ≥ 4.0) corrigidas e re-varridas
```

### Teste de Penetração (Req. 11.4)

```
□ Anual — mínimo
□ Após mudanças ou upgrades significativos de infraestrutura
□ Abrange: camada de rede e camada de aplicação
□ Inclui: testes de segmentação de rede (verificar que CDE está isolado)
□ Realizado por especialista qualificado (interno ou externo)
□ Se externo: independente da organização testada
□ Vulnerabilidades críticas corrigidas e re-testadas
□ Resultados documentados e retidos
```

### IDS/IPS (Req. 11.5)

```
□ IDS ou IPS cobrindo o perímetro do CDE e pontos críticos
□ Alertas configurados para atividades suspeitas
□ Assinaturas/definições atualizadas
□ Monitoramento 24/7 (internamente ou via serviço gerenciado)
□ Revisão de alertas de IDS/IPS regularmente
```

### Monitoramento de Mudanças em Arquivos Críticos (FIM — Req. 11.5.2)

```
□ FIM (File Integrity Monitoring) em arquivos críticos do CDE:
  - Executáveis do sistema operacional
  - Arquivos de configuração
  - Arquivos de conteúdo (para sistemas de pagamento web)
□ Alertas para mudanças não autorizadas
□ Ferramentas: Tripwire, OSSEC, Wazuh, AWS Config
□ Revisão de alertas de FIM semanalmente (mínimo)
```

---
---

# Desenvolvimento Seguro — PCI-DSS v4.0

> PCI-DSS v4.0 — Req. 6

---

## 10. Secure SDLC no Contexto PCI (Req. 6.2)

```
Processos obrigatórios no ciclo de desenvolvimento para o CDE:

Req. 6.2.4 — Treinamento anual em desenvolvimento seguro para devs
Req. 6.3.1 — Gerenciamento de vulnerabilidades e patches:
  □ Identificar novas vulnerabilidades de segurança continuamente
  □ Patches críticos/altos: instalar em até 1 mês
  □ Patches outros: instalar em tempo definido pela política (ex: 3 meses)

Req. 6.3.3 — Todos os componentes do sistema protegidos contra vulnerabilidades conhecidas:
  □ SCA (Software Composition Analysis) nas dependências
  □ SBOM (Software Bill of Materials) mantido

Req. 6.4 — Aplicações web e APIs no CDE protegidas:
  □ WAF (Web Application Firewall) — detectar e bloquear ataques web
  □ Revisão de código por pessoas treinadas em segurança
  □ Ou solução automatizada de detecção de vulnerabilidades web
```

### Proteção de Aplicações Web no CDE (Req. 6.4)

```
WAF obrigatório para aplicações web no CDE (Req. 6.4.2):
□ Ativo em modo bloqueio (não apenas detecção)
□ Atualizado com regras para novas ameaças
□ Cobre OWASP Top 10 no mínimo
□ Alertas para ataques detectados

Alternativa ao WAF: revisão de código com evidência de segurança
□ Revisão por profissional em segurança de aplicação
□ Processo documentado com resultados
□ Realizada a cada mudança no código
```

### Proteção de Scripts de Pagamento (Req. 6.4.3 — novo no v4.0)

```
Para páginas de pagamento web (mesmo com iFrame de terceiro):
□ Inventário de todos os scripts de terceiros na página de pagamento
□ Justificativa de negócio para cada script
□ Método para verificar integridade de cada script (SRI, hash)
□ Scripts autorizados por função responsável
□ Revisão periódica do inventário

Exemplo de SRI (Subresource Integrity):
<script
  src="https://gateway.com/checkout.js"
  integrity="sha384-[hash]"
  crossorigin="anonymous">
</script>
```

---
---

# SAQs, Níveis e Processo de Conformidade — PCI-DSS v4.0

> PCI-DSS v4.0 — Req. 12 | PCI SSC SAQ Documentation

---

## 11. Tipos de SAQ

O **SAQ (Self-Assessment Questionnaire)** é o questionário de autoavaliação para merchants
que não precisam de ROC (avaliação por QSA).

| SAQ | Para quem | Escopo |
|---|---|---|
| **SAQ A** | E-commerce com iFrame totalmente hospedado pelo gateway — sem contato com CHD | Menor escopo — ~14 controles |
| **SAQ A-EP** | E-commerce com JS próprio que pode impactar o fluxo de pagamento | Escopo médio |
| **SAQ B** | Imprint de cartão ou terminais dial-up sem armazenamento eletrônico | Físico sem armazenamento |
| **SAQ B-IP** | Terminais IP standalone aprovados (PTPE) sem dados de cartão no servidor | Físico simplificado |
| **SAQ C** | Aplicações de pagamento conectadas à internet sem armazenamento eletrônico | Médio |
| **SAQ C-VT** | Entrada manual via terminal virtual de provedor de serviço | Médio |
| **SAQ P2PE** | Ambientes com P2PE validada pelo PCI SSC | Reduzido |
| **SAQ D (Merchant)** | Qualquer merchant que não se enquadra nos outros SAQs | Escopo total |
| **SAQ D (Service Provider)** | Provedores de serviço que armazenam/processam/transmitem CHD | Escopo total + requisitos adicionais |

### Como Determinar o SAQ Correto

```
1. Confirmar com o banco adquirente — eles validam o SAQ adequado
2. Mapear exatamente como dados de cartão fluem pelo seu sistema
3. Se usar iFrame puro sem JS próprio no formulário → SAQ A
4. Se usar SDK/JS de gateway com scripts seus na mesma página → SAQ A-EP
5. Se armazenar qualquer CHD → SAQ D no mínimo
6. Dúvida: sempre ir para o SAQ mais amplo ou consultar QSA
```

---

## 12. ROC — Report on Compliance

Para Merchants Nível 1 e alguns provedores de serviço:
- Avaliação formal por **QSA (Qualified Security Assessor)** credenciado pelo PCI SSC
- Produz ROC (relatório detalhado) + AOC (Attestation of Compliance)
- Anual
- QSA lista disponível em: pcisecuritystandards.org/assessors-and-solutions/qualified-security-assessors

---

## 13. Política de Segurança da Informação (Req. 12)

```
Req. 12.1 — Política abrangente de segurança da informação:
□ Aprovada pela liderança
□ Publicada e comunicada a todos
□ Revisada anualmente

Req. 12.3 — Gestão de riscos:
□ Avaliação de risco anual
□ Identificar ameaças e vulnerabilidades no CDE
□ Resultados documentados

Req. 12.5 — Inventário do CDE:
□ Lista de componentes de hardware no CDE
□ Lista de componentes de software no CDE
□ Atualizado quando há mudanças

Req. 12.6 — Programa de conscientização em segurança:
□ Treinamento ao início e anualmente para todos
□ Política assinada anualmente por funcionários
□ Conteúdo sobre ameaças relevantes ao CDE

Req. 12.8 — Gestão de provedores de serviço (TPSP):
□ Lista de provedores de serviço que impactam o CDE
□ Política de due diligence para seleção
□ Contrato com cláusulas de segurança e PCI
□ AOC dos provedores: verificar anualmente
□ Monitoramento de conformidade dos provedores
```

---

## Checklist Geral PCI-DSS v4.0

### Dados e Criptografia
- [ ] SAD nunca armazenado (CVV, trilha, PIN)
- [ ] PAN armazenado ilegível (hash+salt, truncado, tokenizado ou criptografado)
- [ ] TLS 1.2+ em todas as transmissões de CHD
- [ ] Chaves criptográficas gerenciadas com HSM ou equivalente e rotação anual

### Rede e Acesso
- [ ] CDE segmentado da rede corporativa com firewall
- [ ] Regras de firewall documentadas e revisadas semestralmente
- [ ] Hardening de todos os sistemas no CDE (CIS Benchmarks)
- [ ] MFA para todo acesso ao CDE
- [ ] Senhas mínimo 12 caracteres com complexidade
- [ ] Acesso por need-to-know; revisão semestral

### Monitoramento e Testes
- [ ] Logs de todos os acessos ao CDE com retenção de 12 meses
- [ ] Logs imutáveis e centralizados
- [ ] FIM em arquivos críticos do CDE
- [ ] Varredura ASV trimestral
- [ ] Pentest anual incluindo teste de segmentação
- [ ] IDS/IPS cobrindo o CDE

### Desenvolvimento
- [ ] WAF ativo em modo bloqueio para aplicações web no CDE
- [ ] Inventário e SRI para scripts de terceiros na página de pagamento
- [ ] SCA nas dependências; patches críticos em até 1 mês
- [ ] Treinamento anual em desenvolvimento seguro para devs

### Conformidade
- [ ] SAQ correto identificado e validado com adquirente
- [ ] AOC de todos os provedores de serviço no CDE obtidas e vigentes
- [ ] Política de segurança documentada e aprovada pela liderança
- [ ] Avaliação de risco anual documentada
- [ ] Inventário de HW e SW do CDE atualizado
